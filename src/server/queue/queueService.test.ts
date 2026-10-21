import { beforeEach, describe, expect, it } from "vitest";
import { QueueError } from "./errors";
import {
  getParticipation,
  getQueue,
  insertionIndex,
  joinQueue,
  leaveQueue,
  listQueues,
  moveEntry,
  serveNext,
  setQueueOpen,
} from "./queueService";
import { createEmptyStore, createSeedStore, type QueueStore } from "./store";
import type { Priority, QueueService } from "./types";
import { estimateWaitMinutes } from "./waitTime";

const advising: QueueService = {
  id: "advising",
  name: "Advising",
  description: "Course help.",
  duration: 10,
  priority: "medium",
  open: true,
};

const fixedClock = () => new Date("2026-10-20T12:00:00Z");

let store: QueueStore;
beforeEach(() => {
  store = createEmptyStore([advising]);
});

function join(userId: string, priority: Priority = "medium") {
  return joinQueue(store, "advising", { userId, userName: userId.toUpperCase(), priority }, fixedClock);
}

function order() {
  return getQueue(store, "advising").entries.map((entry) => entry.userId);
}

function expectQueueError(run: () => unknown, code: string, status: number) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(QueueError);
    expect((error as QueueError).code).toBe(code);
    expect((error as QueueError).status).toBe(status);
    return;
  }
  throw new Error(`Expected ${code}`);
}

describe("estimateWaitMinutes", () => {
  it("multiplies position by the service duration", () => {
    expect(estimateWaitMinutes(1, 10)).toBe(10);
    expect(estimateWaitMinutes(3, 5)).toBe(15);
  });

  it("is zero for positions before the line", () => {
    expect(estimateWaitMinutes(0, 10)).toBe(0);
  });
});

describe("joinQueue", () => {
  it("adds users in arrival order with positions, statuses, and waits", () => {
    join("a");
    const { entry } = join("b");
    expect(entry).toMatchObject({
      userId: "b",
      position: 2,
      status: "waiting",
      estimatedWaitMinutes: 20,
      joinedAt: "2026-10-20T12:00:00.000Z",
    });
    expect(order()).toEqual(["a", "b"]);
    expect(getQueue(store, "advising").entries[0].status).toBe("almost-ready");
  });

  it("places higher-priority users ahead, keeping arrival order within a priority", () => {
    join("low", "low");
    join("med1");
    join("high", "high");
    join("med2");
    expect(order()).toEqual(["high", "med1", "med2", "low"]);
  });

  it("raises a joined event whose status shows when the joiner is next", () => {
    join("a", "low");
    const { events } = join("b", "high");
    expect(events).toEqual([
      { type: "joined", entry: expect.objectContaining({ userId: "b", status: "almost-ready" }) },
    ]);
  });

  it("rejects unknown services", () => {
    expectQueueError(() => joinQueue(store, "nope", { userId: "a", userName: "A", priority: "low" }), "service_not_found", 404);
  });

  it("rejects closed queues", () => {
    setQueueOpen(store, "advising", false);
    expectQueueError(() => join("a"), "queue_closed", 409);
  });

  it("allows only one active queue per user, across services", () => {
    store.services.push({ ...advising, id: "it", name: "IT" });
    join("a");
    expectQueueError(
      () => joinQueue(store, "it", { userId: "a", userName: "A", priority: "medium" }),
      "already_in_queue",
      409,
    );
  });
});

describe("insertionIndex", () => {
  it("returns the end of the queue when no one has lower priority", () => {
    expect(insertionIndex([], "high")).toBe(0);
    join("a", "high");
    expect(insertionIndex(store.queues.advising, "medium")).toBe(1);
  });
});

describe("serveNext", () => {
  it("serves the first user, records the outcome, and notifies the new front", () => {
    join("a");
    join("b");
    const { record, events } = serveNext(store, "advising", fixedClock);
    expect(record).toMatchObject({ userId: "a", outcome: "served" });
    expect(order()).toEqual(["b"]);
    expect(events.map((event) => event.type)).toEqual(["served", "almost-ready"]);
    expect(events[1]).toMatchObject({ entry: { userId: "b", position: 1 } });
    expect(store.completed[0]).toBe(record);
  });

  it("raises only served when the queue becomes empty", () => {
    join("a");
    expect(serveNext(store, "advising").events.map((event) => event.type)).toEqual(["served"]);
  });

  it("fails when no one is waiting", () => {
    expectQueueError(() => serveNext(store, "advising"), "queue_empty", 409);
  });
});

describe("leaveQueue", () => {
  it("removes the entry and records a canceled outcome", () => {
    const { entry } = join("a");
    join("b");
    const { record, events } = leaveQueue(store, "advising", entry.id, fixedClock);
    expect(record).toMatchObject({ userId: "a", outcome: "canceled" });
    expect(order()).toEqual(["b"]);
    expect(events.map((event) => event.type)).toEqual(["left", "almost-ready"]);
  });

  it("does not raise almost-ready when someone behind the front leaves", () => {
    join("a");
    const { entry } = join("b");
    expect(leaveQueue(store, "advising", entry.id).events.map((event) => event.type)).toEqual([
      "left",
    ]);
  });

  it("fails for an unknown entry", () => {
    expectQueueError(() => leaveQueue(store, "advising", "missing"), "entry_not_found", 404);
  });

  it("lets the user join again afterwards", () => {
    const { entry } = join("a");
    leaveQueue(store, "advising", entry.id);
    expect(join("a").entry.position).toBe(1);
  });
});

describe("moveEntry", () => {
  it("swaps an entry with its neighbour", () => {
    join("a");
    const { entry } = join("b");
    const result = moveEntry(store, "advising", entry.id, "up");
    expect(result.entries.map((item) => item.userId)).toEqual(["b", "a"]);
    expect(result.events).toEqual([
      { type: "almost-ready", entry: expect.objectContaining({ userId: "b" }) },
    ]);
  });

  it("moves down without changing the front when not at the front", () => {
    join("a");
    const { entry } = join("b");
    join("c");
    const result = moveEntry(store, "advising", entry.id, "down");
    expect(result.entries.map((item) => item.userId)).toEqual(["a", "c", "b"]);
    expect(result.events).toEqual([]);
  });

  it("rejects moves past either end", () => {
    const { entry: first } = join("a");
    const { entry: last } = join("b");
    expectQueueError(() => moveEntry(store, "advising", first.id, "up"), "invalid_move", 409);
    expectQueueError(() => moveEntry(store, "advising", last.id, "down"), "invalid_move", 409);
  });

  it("fails for an unknown entry", () => {
    expectQueueError(() => moveEntry(store, "advising", "missing", "up"), "entry_not_found", 404);
  });
});

describe("setQueueOpen", () => {
  it("raises an event only when the state changes", () => {
    expect(setQueueOpen(store, "advising", false).events).toEqual([
      { type: "queue-closed", serviceId: "advising" },
    ]);
    expect(setQueueOpen(store, "advising", false).events).toEqual([]);
    expect(setQueueOpen(store, "advising", true)).toMatchObject({
      service: { open: true },
      events: [{ type: "queue-opened" }],
    });
  });
});

describe("listQueues", () => {
  it("summarizes length and the wait for someone joining now", () => {
    join("a");
    join("b");
    expect(listQueues(store)).toEqual([
      expect.objectContaining({ id: "advising", length: 2, estimatedWaitMinutes: 30 }),
    ]);
  });

  it("treats a service with no queue list yet as empty", () => {
    store.services.push({ ...advising, id: "new" });
    expect(listQueues(store)[1]).toMatchObject({ id: "new", length: 0, estimatedWaitMinutes: 10 });
  });
});

describe("getParticipation", () => {
  it("returns the user's current entry with its service", () => {
    join("a");
    join("b");
    expect(getParticipation(store, "b")).toEqual({
      current: expect.objectContaining({ userId: "b", position: 2, service: advising }),
      lastCompleted: null,
    });
  });

  it("returns the most recent completed participation once served", () => {
    join("a");
    serveNext(store, "advising");
    expect(getParticipation(store, "a")).toEqual({
      current: null,
      lastCompleted: expect.objectContaining({ userId: "a", outcome: "served" }),
    });
  });
});

describe("seed data", () => {
  it("starts Alex Morgan third for Student services with a 15-minute wait", () => {
    const participation = getParticipation(createSeedStore(), "alex-morgan");
    expect(participation.current).toMatchObject({
      serviceId: "student-services",
      position: 3,
      estimatedWaitMinutes: 15,
    });
  });
});
