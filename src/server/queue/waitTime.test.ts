import { describe, expect, it } from "vitest";
import type { CompletedParticipation, QueueService } from "./types";
import {
  ALMOST_READY_MINUTES,
  effectiveServiceMinutes,
  estimateWait,
  estimateWaitMinutes,
  isSignificantWaitChange,
  observedServiceIntervals,
  statusFor,
} from "./waitTime";

const advising: QueueService = {
  id: "advising",
  name: "Advising",
  description: "Course help.",
  duration: 10,
  priority: "medium",
  open: true,
};

function served(
  serviceId: string,
  completedAt: string,
  outcome: CompletedParticipation["outcome"] = "served",
): CompletedParticipation {
  return {
    entryId: `entry-${completedAt}`,
    serviceId,
    serviceName: serviceId,
    userId: "someone",
    userName: "Someone",
    joinedAt: "2026-10-20T09:00:00Z",
    completedAt,
    outcome,
  };
}

describe("estimateWaitMinutes", () => {
  it("multiplies position by the expected duration", () => {
    expect(estimateWaitMinutes(1, 10)).toBe(10);
    expect(estimateWaitMinutes(4, 5)).toBe(20);
    expect(estimateWaitMinutes(0, 10)).toBe(0);
  });
});

describe("observedServiceIntervals", () => {
  const completed = [
    served("advising", "2026-10-20T10:10:00Z"),
    served("advising", "2026-10-20T10:06:00Z"),
    served("advising", "2026-10-20T10:00:00Z"),
  ];

  it("measures the minutes between consecutive completions, newest first", () => {
    expect(observedServiceIntervals(completed, "advising")).toEqual([4, 6]);
  });

  it("needs two completions of the same service", () => {
    expect(observedServiceIntervals([completed[0]], "advising")).toEqual([]);
    expect(observedServiceIntervals(completed, "other")).toEqual([]);
  });

  it("ignores canceled visits and unusable timestamps", () => {
    const mixed = [
      served("advising", "2026-10-20T10:10:00Z"),
      served("advising", "2026-10-20T10:04:00Z", "canceled"),
      served("advising", "not-a-date"),
      served("advising", "2026-10-20T10:00:00Z"),
    ];
    expect(observedServiceIntervals(mixed, "advising")).toEqual([10]);
  });

  it("keeps only the most recent completions within the window", () => {
    const many = [0, 2, 4, 6, 8, 10, 12].map((minutes) =>
      served("advising", `2026-10-20T10:${String(minutes).padStart(2, "0")}:00Z`),
    );
    expect(observedServiceIntervals(many, "advising", 3)).toEqual([2, 2, 2]);
  });
});

describe("effectiveServiceMinutes", () => {
  it("uses the configured duration until a service has observations", () => {
    expect(effectiveServiceMinutes(advising, [])).toEqual({
      serviceMinutes: 10,
      basis: "configured",
      sampleSize: 0,
    });
  });

  it("blends observations with the configured duration as one observation", () => {
    expect(effectiveServiceMinutes(advising, [4, 6])).toEqual({
      serviceMinutes: 6.7,
      basis: "observed",
      sampleSize: 2,
    });
  });

  it("follows a service that is consistently slower than configured", () => {
    expect(effectiveServiceMinutes(advising, [20, 20, 20]).serviceMinutes).toBe(
      17.5,
    );
  });
});

describe("estimateWait", () => {
  it("falls back to position times duration with no history", () => {
    expect(estimateWait(3, advising)).toEqual({
      minutes: 30,
      serviceMinutes: 10,
      basis: "configured",
      sampleSize: 0,
    });
  });

  it("uses the observed pace once it is measurable", () => {
    const completed = [
      served("advising", "2026-10-20T10:10:00Z"),
      served("advising", "2026-10-20T10:06:00Z"),
      served("advising", "2026-10-20T10:00:00Z"),
    ];
    expect(estimateWait(3, advising, completed)).toMatchObject({
      minutes: 20,
      serviceMinutes: 6.7,
      basis: "observed",
      sampleSize: 2,
    });
  });

  it("is zero before the line and never rounds a real wait to zero", () => {
    expect(estimateWait(0, advising).minutes).toBe(0);
    expect(estimateWait(1, { id: "fast", duration: 0.2 }).minutes).toBe(1);
  });
});

describe("statusFor", () => {
  it("treats the front of the line as almost ready", () => {
    expect(statusFor(1, 30)).toBe("almost-ready");
  });

  it("treats a short remaining wait as almost ready", () => {
    expect(statusFor(2, ALMOST_READY_MINUTES)).toBe("almost-ready");
    expect(statusFor(2, ALMOST_READY_MINUTES + 1)).toBe("waiting");
  });
});

describe("isSignificantWaitChange", () => {
  it("always reports the first estimate", () => {
    expect(isSignificantWaitChange(undefined, 5)).toBe(true);
  });

  it("ignores small moves in either direction", () => {
    expect(isSignificantWaitChange(20, 24)).toBe(false);
    expect(isSignificantWaitChange(20, 16)).toBe(false);
  });

  it("reports moves of at least the threshold", () => {
    expect(isSignificantWaitChange(20, 25)).toBe(true);
    expect(isSignificantWaitChange(20, 15)).toBe(true);
  });
});
