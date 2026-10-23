import { describe, expect, it } from "vitest";
import { createEmptyStore } from "@/server/queue/store";
import {
  getParticipation,
  getQueue,
  joinQueue,
  leaveQueue,
  listQueues,
  serveNext,
  setQueueOpen,
} from "@/server/queue/queueService";
import { QueueError } from "@/server/queue/errors";
import { createService, listServices, updateService } from "./service";
import { validateServiceInput } from "./validation";

const input = {
  name: " Advising ",
  description: " Course help. ",
  duration: 5,
  priority: "medium",
};

describe("service validation", () => {
  it("trims required text and accepts the name boundary", () => {
    expect(validateServiceInput(input)).toEqual({
      ...input,
      name: "Advising",
      description: "Course help.",
    });
    expect(
      validateServiceInput({ ...input, name: "a".repeat(100) }).name,
    ).toHaveLength(100);
  });

  it.each([null, [], "body", 5, true, undefined])(
    "rejects non-object bodies: %j",
    (body) => {
      expect(() => validateServiceInput(body)).toThrow(QueueError);
    },
  );

  it.each([
    ["name", undefined],
    ["name", null],
    ["name", 7],
    ["name", ""],
    ["name", "  "],
    ["name", "a".repeat(101)],
    ["description", undefined],
    ["description", null],
    ["description", false],
    ["description", "\n "],
    ["duration", undefined],
    ["duration", null],
    ["duration", "5"],
    ["duration", false],
    ["duration", 0],
    ["duration", -1],
    ["duration", 0.5],
    ["duration", 2.5],
    ["duration", NaN],
    ["duration", Infinity],
    ["priority", undefined],
    ["priority", null],
    ["priority", 3],
    ["priority", "urgent"],
    ["priority", "HIGH"],
    ["id", "client-id"],
    ["open", true],
    ["extra", "value"],
  ])("rejects invalid %s: %j with a field error", (field, value) => {
    try {
      validateServiceInput({ ...input, [field]: value });
      expect.fail("Validation should fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(QueueError);
      expect((error as QueueError).fields?.[field]).toBeTruthy();
    }
  });

  it("reports every required field and accepts all priorities and long descriptions", () => {
    try {
      validateServiceInput({});
    } catch (error) {
      expect(Object.keys((error as QueueError).fields ?? {})).toEqual([
        "name",
        "description",
        "duration",
        "priority",
      ]);
    }
    for (const priority of ["low", "medium", "high"])
      expect(
        validateServiceInput({
          ...input,
          priority,
          description: "x".repeat(5000),
        }).priority,
      ).toBe(priority);
  });
});

describe("shared service storage", () => {
  it("creates distinct IDs, allows duplicate names, returns copies, and initializes closed empty queues", () => {
    const store = createEmptyStore();
    const first = createService(store, input);
    const second = createService(store, input);
    expect(first.id).not.toBe(second.id);
    expect(first).toMatchObject({ name: "Advising", open: false });
    expect(store.queues[first.id]).toEqual([]);
    expect(listServices(store)).toHaveLength(2);
    first.name = "Changed outside store";
    const listed = listServices(store);
    listed[0].name = "Changed response";
    expect(store.services[0].name).toBe("Advising");
  });

  it("creates a usable queue and updates duration-based waits without reordering entries", () => {
    const store = createEmptyStore();
    const service = createService(store, input);
    expect(() =>
      joinQueue(store, service.id, {
        userId: "a",
        userName: "A",
        priority: "medium",
      }),
    ).toThrow(/not accepting/);
    setQueueOpen(store, service.id, true);
    joinQueue(store, service.id, {
      userId: "a",
      userName: "A",
      priority: "medium",
    });
    joinQueue(store, service.id, {
      userId: "b",
      userName: "B",
      priority: "low",
    });
    const entries = structuredClone(store.queues[service.id]);
    const updated = updateService(store, service.id, {
      ...input,
      name: "New name",
      duration: 12,
      priority: "high",
    });
    expect(updated.open).toBe(true);
    expect(store.queues[service.id]).toEqual(entries);
    expect(
      getQueue(store, service.id).entries.map((e) => e.estimatedWaitMinutes),
    ).toEqual([12, 24]);
    expect(getParticipation(store, "a").current?.service.name).toBe("New name");
    expect(listQueues(store)[0]).toMatchObject({
      name: "New name",
      duration: 12,
      length: 2,
      estimatedWaitMinutes: 36,
    });
    expect(serveNext(store, service.id).record.userId).toBe("a");
    expect(leaveQueue(store, service.id, entries[1].id).record.userId).toBe(
      "b",
    );
  });

  it("preserves completed records and rejects invalid updates without any mutation", () => {
    const store = createEmptyStore();
    const service = createService(store, input);
    setQueueOpen(store, service.id, true);
    joinQueue(store, service.id, {
      userId: "a",
      userName: "A",
      priority: "medium",
    });
    serveNext(store, service.id);
    const completed = structuredClone(store.completed);
    updateService(store, service.id, { ...input, name: "Renamed" });
    expect(store.completed).toEqual(completed);
    const before = structuredClone(store);
    expect(() =>
      updateService(store, service.id, { ...input, duration: 1.2 }),
    ).toThrow();
    expect(() => createService(store, { ...input, name: " " })).toThrow();
    expect(() => updateService(store, "unknown", input)).toThrow(
      /does not exist/,
    );
    expect(() => updateService(store, "bad id", input)).toThrow();
    expect(store).toEqual(before);
  });
});
