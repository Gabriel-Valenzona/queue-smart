import { describe, expect, it } from "vitest";
import { QueueError } from "./errors";
import {
  USER_NAME_MAX_LENGTH,
  validateId,
  validateJoinQueue,
  validateMoveEntry,
  validateSetQueueOpen,
} from "./validation";

function fieldsOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(QueueError);
    expect((error as QueueError).status).toBe(400);
    return (error as QueueError).fields ?? {};
  }
  throw new Error("Expected validation to fail");
}

describe("validateJoinQueue", () => {
  it("accepts a valid body, trims the name, and defaults priority to medium", () => {
    expect(validateJoinQueue({ userId: "alex-morgan", userName: "  Alex Morgan " })).toEqual({
      userId: "alex-morgan",
      userName: "Alex Morgan",
      priority: "medium",
    });
  });

  it("accepts an explicit priority", () => {
    expect(validateJoinQueue({ userId: "a1", userName: "A", priority: "high" }).priority).toBe(
      "high",
    );
  });

  it("rejects a body that is not an object", () => {
    for (const body of [null, "text", 42, ["userId"]])
      expect(() => validateJoinQueue(body)).toThrow("Request body must be a JSON object.");
  });

  it("reports every missing required field", () => {
    expect(fieldsOf(() => validateJoinQueue({}))).toEqual({
      userId: "userId is required.",
      userName: "userName is required.",
    });
  });

  it("treats a blank userName as missing", () => {
    expect(fieldsOf(() => validateJoinQueue({ userId: "a", userName: "   " })).userName).toBe(
      "userName is required.",
    );
  });

  it("rejects wrong field types", () => {
    const fields = fieldsOf(() => validateJoinQueue({ userId: 7, userName: true, priority: 3 }));
    expect(fields.userId).toBe("userId must be a string.");
    expect(fields.userName).toBe("userName must be a string.");
    expect(fields.priority).toMatch(/low, medium, or high/);
  });

  it("enforces length limits", () => {
    const fields = fieldsOf(() =>
      validateJoinQueue({ userId: "a".repeat(65), userName: "b".repeat(USER_NAME_MAX_LENGTH + 1) }),
    );
    expect(fields.userId).toMatch(/64 characters or fewer/);
    expect(fields.userName).toMatch(/100 characters or fewer/);
  });

  it("accepts a name at exactly the length limit", () => {
    const name = "b".repeat(USER_NAME_MAX_LENGTH);
    expect(validateJoinQueue({ userId: "a", userName: name }).userName).toBe(name);
  });

  it("rejects user ids with unsafe characters", () => {
    expect(fieldsOf(() => validateJoinQueue({ userId: "a b/c", userName: "A" })).userId).toMatch(
      /letters, numbers/,
    );
  });

  it("rejects an unknown priority", () => {
    expect(
      fieldsOf(() => validateJoinQueue({ userId: "a", userName: "A", priority: "urgent" }))
        .priority,
    ).toBeDefined();
  });
});

describe("validateSetQueueOpen", () => {
  it("accepts a boolean", () => {
    expect(validateSetQueueOpen({ open: false })).toEqual({ open: false });
  });

  it("requires open", () => {
    expect(fieldsOf(() => validateSetQueueOpen({}))).toEqual({ open: "open is required." });
  });

  it("rejects non-boolean values", () => {
    expect(fieldsOf(() => validateSetQueueOpen({ open: "true" }))).toEqual({
      open: "open must be a boolean.",
    });
  });
});

describe("validateMoveEntry", () => {
  it("accepts up and down", () => {
    expect(validateMoveEntry({ direction: "up" })).toEqual({ direction: "up" });
    expect(validateMoveEntry({ direction: "down" })).toEqual({ direction: "down" });
  });

  it("requires a direction", () => {
    expect(fieldsOf(() => validateMoveEntry({})).direction).toBe("direction is required.");
  });

  it("rejects other directions", () => {
    expect(fieldsOf(() => validateMoveEntry({ direction: "left" })).direction).toMatch(/"up"/);
  });
});

describe("validateId", () => {
  it("returns a valid id", () => {
    expect(validateId("student-services", "serviceId")).toBe("student-services");
  });

  it("rejects empty, too long, or unsafe ids", () => {
    for (const value of ["", "x".repeat(65), "../etc"])
      expect(fieldsOf(() => validateId(value, "serviceId"))).toEqual({
        serviceId: "serviceId is not a valid identifier.",
      });
  });
});
