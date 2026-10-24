import { describe, expect, it } from "vitest";
import { QueueError } from "@/server/queue/errors";
import {
  DETAIL_MAX_LENGTH,
  FEED_LIMIT_MAX,
  TITLE_MAX_LENGTH,
  validateFeedQuery,
  validateNotificationInput,
  validatePreferences,
  validateReadUpdate,
} from "./validation";

const userId = "usr_alex_002";

const valid = {
  category: "queue-update",
  tone: "info",
  title: "Estimated wait updated",
  detail: "Student services: position 2, about 10 minutes.",
};

/** Every rejection is a 400 with the offending fields named. */
function expectFields(run: () => unknown, fields: string[]) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(QueueError);
    const queueError = error as QueueError;
    expect(queueError.code).toBe("validation_error");
    expect(queueError.status).toBe(400);
    expect(Object.keys(queueError.fields ?? {}).sort()).toEqual([...fields].sort());
    return;
  }
  throw new Error(`Expected ${fields.join(", ")} to be rejected`);
}

describe("validateNotificationInput", () => {
  it("accepts a notification and addresses it to the signed-in account", () => {
    expect(
      validateNotificationInput(
        { ...valid, service: "  Student services  ", createdAt: "2026-10-23T12:00:00Z" },
        userId,
      ),
    ).toEqual({
      userId,
      category: "queue-update",
      tone: "info",
      title: valid.title,
      detail: valid.detail,
      service: "Student services",
      createdAt: "2026-10-23T12:00:00.000Z",
    });
  });

  it("leaves the optional fields out when they are not supplied", () => {
    expect(validateNotificationInput(valid, userId)).toMatchObject({
      service: undefined,
      createdAt: undefined,
    });
  });

  it("requires a body object", () => {
    for (const body of ["text", null, [valid]])
      expect(() => validateNotificationInput(body, userId)).toThrowError(QueueError);
  });

  it("requires a title and detail within their limits", () => {
    expectFields(() => validateNotificationInput({ ...valid, title: "  " }, userId), [
      "title",
    ]);
    expectFields(
      () =>
        validateNotificationInput(
          {
            ...valid,
            title: "t".repeat(TITLE_MAX_LENGTH + 1),
            detail: "d".repeat(DETAIL_MAX_LENGTH + 1),
          },
          userId,
        ),
      ["title", "detail"],
    );
  });

  it("requires a known category and tone", () => {
    expectFields(
      () => validateNotificationInput({ ...valid, category: "gossip", tone: "loud" }, userId),
      ["category", "tone"],
    );
  });

  it("rejects fields a client may not set", () => {
    expectFields(
      () => validateNotificationInput({ ...valid, userId: "someone-else", read: true }, userId),
      ["userId", "read"],
    );
  });

  it("rejects a timestamp it cannot read", () => {
    expectFields(
      () => validateNotificationInput({ ...valid, createdAt: "last Tuesday" }, userId),
      ["createdAt"],
    );
  });
});

describe("validateReadUpdate", () => {
  it("accepts a boolean", () => {
    expect(validateReadUpdate({ read: false })).toEqual({ read: false });
  });

  it("requires the read flag", () => {
    expectFields(() => validateReadUpdate({}), ["read"]);
    expectFields(() => validateReadUpdate({ read: "yes" }), ["read"]);
  });
});

describe("validatePreferences", () => {
  it("accepts a partial change", () => {
    expect(validatePreferences({ categories: { service: false } })).toEqual({
      categories: { service: false },
    });
    expect(
      validatePreferences({ quietHours: { enabled: true, start: "21:00", end: "07:00" } }),
    ).toEqual({ quietHours: { enabled: true, start: "21:00", end: "07:00" } });
  });

  it("refuses to switch off system messages or unknown categories", () => {
    expectFields(() => validatePreferences({ categories: { system: false } }), [
      "categories.system",
    ]);
    expectFields(() => validatePreferences({ categories: { gossip: false } }), [
      "categories.gossip",
    ]);
  });

  it("requires each category to be true or false", () => {
    expectFields(() => validatePreferences({ categories: { service: "off" } }), [
      "categories.service",
    ]);
  });

  it("requires 24-hour times and a complete quiet-hours setting", () => {
    expectFields(
      () => validatePreferences({ quietHours: { enabled: true, start: "9pm", end: "25:00" } }),
      ["quietHours.start", "quietHours.end"],
    );
    expectFields(() => validatePreferences({ quietHours: { start: "21:00", end: "07:00" } }), [
      "quietHours.enabled",
    ]);
  });

  it("rejects quiet hours that start and end at the same time", () => {
    expectFields(
      () => validatePreferences({ quietHours: { enabled: true, start: "21:00", end: "21:00" } }),
      ["quietHours.end"],
    );
  });

  it("rejects fields that belong to another part of the module", () => {
    expectFields(() => validatePreferences({ notifications: [] }), ["notifications"]);
    expectFields(() => validatePreferences({ quietHours: { enabled: true, start: "21:00", end: "07:00", timezone: "CT" } }), [
      "quietHours.timezone",
    ]);
  });
});

describe("validateFeedQuery", () => {
  it("defaults to the whole feed", () => {
    expect(validateFeedQuery(new URLSearchParams())).toEqual({
      filter: "all",
      limit: undefined,
    });
  });

  it("accepts unread and category filters with a limit", () => {
    expect(validateFeedQuery(new URLSearchParams("filter=unread&limit=5"))).toEqual({
      filter: "unread",
      limit: 5,
    });
    expect(validateFeedQuery(new URLSearchParams("filter=status-change")).filter).toBe(
      "status-change",
    );
  });

  it("rejects an unknown filter", () => {
    expectFields(() => validateFeedQuery(new URLSearchParams("filter=everything")), [
      "filter",
    ]);
  });

  it("rejects a limit outside the supported range", () => {
    for (const limit of ["0", "2.5", "abc", String(FEED_LIMIT_MAX + 1)])
      expectFields(() => validateFeedQuery(new URLSearchParams(`limit=${limit}`)), [
        "limit",
      ]);
  });
});
