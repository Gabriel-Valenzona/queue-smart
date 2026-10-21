import { describe, expect, it } from "vitest";
import { createInitialUserDemo } from "@/data/user-demo";
import type { Participation, QueueSummary } from "@/lib/api/queues";
import type { CurrentParticipation, UserDemoState } from "@/types/user-demo";
import { formatDemoDate, getJoinError, reconcileParticipation } from "./user-demo";

const service = {
  id: "student-services",
  name: "Student services",
  description: "Help.",
  duration: 5,
  priority: "medium" as const,
  open: true,
};

function current(position: number): CurrentParticipation {
  return {
    id: "entry-1",
    serviceId: service.id,
    userId: "alex-morgan",
    userName: "Alex Morgan",
    priority: "medium",
    joinedAt: "2026-10-01T10:00:00Z",
    position,
    status: position === 1 ? "almost-ready" : "waiting",
    estimatedWaitMinutes: position * 5,
    service,
  };
}

function stateWith(patch: Partial<UserDemoState>): UserDemoState {
  return { ...createInitialUserDemo(), ...patch };
}

const summary = (open: boolean): QueueSummary => ({
  ...service,
  open,
  length: 0,
  estimatedWaitMinutes: 5,
});

describe("getJoinError", () => {
  it("requires a selection", () => {
    expect(getJoinError(stateWith({ services: [summary(true)] }), "")).toMatch(/Select a service/);
  });

  it("rejects unknown and closed services", () => {
    expect(getJoinError(stateWith({ services: [summary(true)] }), "other")).toMatch(/not available/);
    expect(getJoinError(stateWith({ services: [summary(false)] }), service.id)).toMatch(/closed/);
  });

  it("rejects joining while already in a queue", () => {
    expect(
      getJoinError(stateWith({ services: [summary(true)], current: current(2) }), service.id),
    ).toMatch(/already have an active queue/);
  });

  it("allows joining an open service", () => {
    expect(getJoinError(stateWith({ services: [summary(true)] }), service.id)).toBeUndefined();
  });
});

describe("reconcileParticipation", () => {
  const none: Participation = { current: null, lastCompleted: null };

  it("does not notify on first load", () => {
    const result = reconcileParticipation(stateWith({}), { current: current(3), lastCompleted: null });
    expect(result.patch.current?.position).toBe(3);
    expect(result.notifications).toEqual([]);
  });

  it("notifies a queue update when the position changes", () => {
    const result = reconcileParticipation(stateWith({ current: current(3) }), {
      current: current(2),
      lastCompleted: null,
    });
    expect(result.notifications).toEqual([
      expect.objectContaining({
        title: "Queue updated",
        detail: "Student services: position 2, estimated wait 10 minutes.",
      }),
    ]);
  });

  it("notifies when the user becomes next in line", () => {
    const result = reconcileParticipation(stateWith({ current: current(2) }), {
      current: current(1),
      lastCompleted: null,
    });
    expect(result.notifications[0]).toMatchObject({
      category: "status-change",
      title: "You’re almost ready",
    });
  });

  it("stays quiet when nothing changed", () => {
    expect(
      reconcileParticipation(stateWith({ current: current(2) }), {
        current: current(2),
        lastCompleted: null,
      }).notifications,
    ).toEqual([]);
  });

  it("records history and notifies when the user is served", () => {
    const prev = stateWith({ current: current(1) });
    const result = reconcileParticipation(prev, {
      current: null,
      lastCompleted: {
        entryId: "entry-1",
        serviceId: service.id,
        userId: "alex-morgan",
        userName: "Alex Morgan",
        joinedAt: "2026-10-01T10:00:00Z",
        completedAt: "2026-10-01T10:05:00Z",
        outcome: "served",
      },
    });
    expect(result.patch.justServed).toEqual({ serviceId: service.id, serviceName: service.name });
    expect(result.patch.history?.[0]).toMatchObject({ id: "entry-1", outcome: "served" });
    expect(result.patch.history).toHaveLength(prev.history.length + 1);
    expect(result.notifications[0].title).toBe("You’ve been served");
  });

  it("notifies a removal when the entry disappears without being served", () => {
    const result = reconcileParticipation(stateWith({ current: current(2) }), none);
    expect(result.patch.current).toBeNull();
    expect(result.patch.history).toBeUndefined();
    expect(result.notifications[0].title).toBe("Removed from queue");
  });
});

describe("formatDemoDate", () => {
  it("formats dates in UTC", () => {
    expect(formatDemoDate("2026-10-01T23:30:00Z")).toBe("Oct 1, 2026");
  });
});
