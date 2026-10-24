import { beforeEach, describe, expect, it } from "vitest";
import {
  joinQueue,
  leaveQueue,
  moveEntry,
  serveNext,
  setQueueOpen,
} from "@/server/queue/queueService";
import { createEmptyStore, type QueueStore } from "@/server/queue/store";
import type { QueueService } from "@/server/queue/types";
import { QUEUE_LENGTH_ALERT, planQueueNotifications } from "./queueEvents";

const advising: QueueService = {
  id: "advising",
  name: "Advising",
  description: "Course help.",
  duration: 10,
  priority: "medium",
  open: true,
};

const admin = "usr_admin_001";
let store: QueueStore;
let clockMinutes = 0;

/** Each call advances the clock, so completions produce usable intervals. */
const clock = () => new Date(Date.UTC(2026, 9, 23, 12, (clockMinutes += 7)));

beforeEach(() => {
  store = createEmptyStore([advising]);
  clockMinutes = 0;
});

function join(userId: string) {
  return joinQueue(
    store,
    "advising",
    { userId, userName: userId.toUpperCase(), priority: "medium" },
    clock,
  );
}

function plan(
  events: Parameters<typeof planQueueNotifications>[0]["events"],
  options: {
    actorId?: string;
    serviceIds?: string[];
    baselines?: Record<string, number>;
  } = {},
) {
  return planQueueNotifications({
    events,
    queue: store,
    adminIds: [admin],
    baselines: options.baselines ?? {},
    actorId: options.actorId,
    serviceIds: options.serviceIds,
  });
}

describe("joining", () => {
  it("confirms the place in line and records what was announced", () => {
    const { entry, events } = join("alex");
    const { inputs, baselines } = plan(events, { actorId: "alex" });
    expect(inputs).toEqual([
      {
        userId: "alex",
        category: "queue-update",
        tone: "info",
        title: "You’re in the queue",
        detail: "Advising: position 1, about 10 minutes.",
        service: "Advising",
        createdAt: entry.joinedAt,
      },
    ]);
    expect(baselines[entry.id]).toBe(10);
  });

  it("does not tell the people already waiting that someone joined behind them", () => {
    join("first");
    const { events } = join("second");
    const { inputs } = plan(events, {
      actorId: "second",
      baselines: { [store.queues.advising[0].id]: 10 },
    });
    expect(inputs.map((input) => input.userId)).toEqual(["second"]);
  });

  it("warns administrators once, as a queue reaches the alert length", () => {
    // Each join is planned as it happens, the way the route does it.
    let baselines: Record<string, number> = {};
    const alerts: string[] = [];
    for (let index = 0; index < QUEUE_LENGTH_ALERT + 1; index += 1) {
      const userId = `user-${index}`;
      const result = plan(join(userId).events, { actorId: userId, baselines });
      baselines = result.baselines;
      for (const input of result.inputs)
        if (input.userId === admin) alerts.push(input.detail);
    }
    expect(alerts).toEqual([`Advising has ${QUEUE_LENGTH_ALERT} people waiting.`]);
  });
});

describe("serving", () => {
  it("tells the served user and refreshes everyone still waiting", () => {
    join("alex");
    join("blair");
    join("casey");
    const baselines = Object.fromEntries(
      store.queues.advising.map((entry, index) => [entry.id, (index + 1) * 10]),
    );
    const { events } = serveNext(store, "advising", clock);
    const { inputs } = plan(events, { actorId: admin, baselines });
    expect(inputs).toEqual([
      expect.objectContaining({
        userId: "alex",
        title: "You’ve been served",
        tone: "success",
      }),
      expect.objectContaining({
        userId: "blair",
        title: "You’re almost ready",
        detail: "You’re next for Advising. Please stay nearby.",
      }),
      expect.objectContaining({
        userId: "casey",
        title: "Estimated wait updated",
        detail: "Advising: position 2, about 20 minutes.",
      }),
    ]);
  });

  it("drops the baseline of an entry that has left the queue", () => {
    const { entry } = join("alex");
    const { events } = serveNext(store, "advising", clock);
    expect(plan(events, { baselines: { [entry.id]: 10 } }).baselines).toEqual({});
  });

  it("sends one notification, not two, to a user whose status changed", () => {
    join("alex");
    join("blair");
    const blairId = store.queues.advising[1].id;
    const { events } = serveNext(store, "advising", clock);
    const { inputs, baselines } = plan(events, {
      actorId: admin,
      baselines: { [blairId]: 20 },
    });
    expect(inputs.filter((input) => input.userId === "blair")).toHaveLength(1);
    expect(baselines[blairId]).toBe(10);
  });
});

describe("leaving", () => {
  it("distinguishes leaving from being removed by an administrator", () => {
    const { entry } = join("alex");
    const left = leaveQueue(store, "advising", entry.id, clock);
    expect(plan(left.events, { actorId: "alex" }).inputs[0]).toMatchObject({
      userId: "alex",
      title: "You left the queue",
      tone: "info",
    });

    store = createEmptyStore([advising]);
    const second = join("alex");
    const removed = leaveQueue(store, "advising", second.entry.id, clock);
    expect(plan(removed.events, { actorId: admin }).inputs[0]).toMatchObject({
      userId: "alex",
      title: "Removed from the queue",
      tone: "warning",
      detail: "An administrator removed you from the Advising queue.",
    });
  });
});

describe("reordering", () => {
  it("refreshes the estimates of a queue whose order changed", () => {
    join("alex");
    join("blair");
    const [first, second] = store.queues.advising.map((entry) => entry.id);
    const { events } = moveEntry(store, "advising", second, "up");
    const { inputs } = plan(events, {
      actorId: admin,
      serviceIds: ["advising"],
      baselines: { [first]: 10, [second]: 20 },
    });
    expect(inputs).toEqual([
      expect.objectContaining({
        userId: "blair",
        title: "You’re almost ready",
      }),
      expect.objectContaining({
        userId: "alex",
        title: "Estimated wait updated",
        detail: "Advising: position 2, about 20 minutes.",
        tone: "warning",
      }),
    ]);
  });
});

describe("availability", () => {
  it("tells the other administrators and the people waiting when a queue closes", () => {
    join("alex");
    const { events } = setQueueOpen(store, "advising", false);
    const { inputs } = plan(events, {
      actorId: "usr_other_admin",
      baselines: { [store.queues.advising[0].id]: 10 },
    });
    expect(inputs).toEqual([
      expect.objectContaining({
        userId: admin,
        title: "Queue closed",
        tone: "warning",
      }),
      expect.objectContaining({
        userId: "alex",
        title: "Service closed to new arrivals",
        detail:
          "Advising is no longer accepting new users. Your place in line is unchanged.",
      }),
    ]);
  });

  it("does not notify the administrator who made the change", () => {
    const { events } = setQueueOpen(store, "advising", false);
    expect(plan(events, { actorId: admin }).inputs).toEqual([]);
  });

  it("tells administrators when a queue reopens, without disturbing the queue", () => {
    join("alex");
    setQueueOpen(store, "advising", false);
    const { events } = setQueueOpen(store, "advising", true);
    const { inputs } = plan(events, {
      baselines: { [store.queues.advising[0].id]: 10 },
    });
    expect(inputs).toEqual([
      expect.objectContaining({
        userId: admin,
        title: "Queue opened",
        tone: "success",
      }),
    ]);
  });

  it("raises nothing when availability did not actually change", () => {
    expect(plan(setQueueOpen(store, "advising", true).events).inputs).toEqual([]);
  });
});

describe("wait updates", () => {
  it("stays quiet while an estimate has barely moved", () => {
    store = createEmptyStore([{ ...advising, duration: 2 }]);
    join("alex");
    join("blair");
    join("casey");
    const [, blairId, caseyId] = store.queues.advising.map((entry) => entry.id);
    const { events } = serveNext(store, "advising", clock);
    const { inputs } = plan(events, {
      actorId: admin,
      baselines: { [blairId]: 4, [caseyId]: 6 },
    });
    // Casey moved from six minutes to four, which is not worth a notification.
    expect(inputs.map((input) => [input.userId, input.title])).toEqual([
      ["alex", "You’ve been served"],
      ["blair", "You’re almost ready"],
    ]);
  });

  it("tells a waiting user their first estimate even without a baseline", () => {
    join("alex");
    join("blair");
    const { events } = serveNext(store, "advising", clock);
    expect(
      plan(events, { actorId: admin }).inputs.some(
        (input) => input.userId === "blair",
      ),
    ).toBe(true);
  });

  it("uses the observed pace once a service has completions to learn from", () => {
    join("alex");
    join("blair");
    join("casey");
    join("dana");
    serveNext(store, "advising", clock);
    const [caseyId, danaId] = store.queues.advising
      .slice(1)
      .map((entry) => entry.id);
    const { events } = serveNext(store, "advising", clock);
    const { inputs, baselines } = plan(events, {
      actorId: admin,
      baselines: { [caseyId]: 20, [danaId]: 40 },
    });
    // Two completions seven minutes apart pull the ten-minute duration down to
    // 8.5 minutes per user, so the estimates no longer follow the duration.
    expect(baselines).toMatchObject({ [caseyId]: 9, [danaId]: 17 });
    expect(inputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: "dana",
          title: "Estimated wait updated",
          detail: "Advising: position 2, about 17 minutes.",
          tone: "info",
        }),
      ]),
    );
  });
});
