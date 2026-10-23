import { describe, expect, it } from "vitest";
import { createEmptyStore } from "@/server/queue/store";
import type { CompletedParticipation } from "@/server/queue/types";
import { getHistory } from "./service";

function record(
  entryId: string,
  overrides: Partial<CompletedParticipation & { serviceName: string }> = {},
) {
  return {
    entryId,
    serviceId: "advising",
    serviceName: "Original advising",
    userId: "user-a",
    userName: "A",
    joinedAt: "2026-10-01T09:00:00Z",
    completedAt: "2026-10-01T10:00:00Z",
    outcome: "served" as const,
    ...overrides,
  };
}

describe("history projection", () => {
  it("returns an empty list and filters another user's records before inspecting metadata", () => {
    const store = createEmptyStore();
    expect(getHistory(store, "user-a")).toEqual([]);
    const other = record("other", { userId: "user-b" });
    const { serviceName: _name, ...withoutName } = other;
    void _name;
    store.completed.push(withoutName as CompletedParticipation);
    expect(getHistory(store, "user-a")).toEqual([]);
  });

  it("keeps repeated visits, outcomes and timestamps, sorting newest first with deterministic ties", () => {
    const store = createEmptyStore();
    store.completed.push(
      record("old"),
      record("b", { outcome: "canceled", completedAt: "2026-10-02T10:00:00Z" }),
      record("a", { completedAt: "2026-10-02T10:00:00.000Z" }),
      record("other", { userId: "user-b" }),
    );
    const before = structuredClone(store.completed);
    const history = getHistory(store, "user-a");
    expect(history.map((r) => r.entryId)).toEqual(["a", "b", "old"]);
    expect(history[1]).toEqual({
      entryId: "b",
      serviceId: "advising",
      serviceName: "Original advising",
      joinedAt: "2026-10-01T09:00:00Z",
      completedAt: "2026-10-02T10:00:00Z",
      outcome: "canceled",
    });
    expect(store.completed).toEqual(before);
    expect(history[0]).not.toHaveProperty("userId");
    expect(history[0]).not.toHaveProperty("userName");
  });

  it("deduplicates by entry ID, retaining the newest record without changing the completion store", () => {
    const store = createEmptyStore();
    store.completed.push(
      record("one"),
      record("one", { completedAt: "2026-10-02T10:00:00Z" }),
    );
    expect(getHistory(store, "user-a")).toHaveLength(1);
    expect(getHistory(store, "user-a")[0].completedAt).toBe(
      "2026-10-02T10:00:00Z",
    );
    expect(store.completed).toHaveLength(2);
  });

  it("preserves the completion name after rename or removal and returns independent DTOs", () => {
    const store = createEmptyStore([
      {
        id: "advising",
        name: "Current name",
        description: "Help",
        duration: 2,
        priority: "low",
        open: false,
      },
    ]);
    store.completed.push(record("one"));
    expect(getHistory(store, "user-a")[0].serviceName).toBe(
      "Original advising",
    );
    store.services = [];
    const history = getHistory(store, "user-a");
    history[0].serviceName = "Response changed";
    expect(getHistory(store, "user-a")[0].serviceName).toBe(
      "Original advising",
    );
  });

  it("rejects incomplete history records instead of inventing historical service names", () => {
    const store = createEmptyStore();
    const { serviceName: _name, ...legacy } = record("one");
    void _name;
    store.completed.push(legacy as CompletedParticipation);
    expect(() => getHistory(store, "user-a")).toThrow(
      expect.objectContaining({ status: 503, code: "history_not_ready" }),
    );
    store.completed = [record("one", { serviceName: "  " })];
    expect(() => getHistory(store, "user-a")).toThrow();
  });
});
