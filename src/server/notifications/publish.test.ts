import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDatabase } from "@/server/db/connection";
import { getQueueStore, resetQueueStore } from "@/server/queue/store";
import { publishQueueNotifications } from "./publish";
import { readWaitBaselines } from "./repository";
import { listNotifications } from "./service";
import { resetNotificationStore } from "./store";

/**
 * Publishing writes to the shared database, so these tests use it (vitest
 * points every worker at its own in-memory database) and reset it each time.
 */
let db = getDatabase();

beforeEach(() => {
  resetQueueStore();
  db = resetNotificationStore();
});

afterEach(() => vi.restoreAllMocks());

const studentServices = { events: [], serviceIds: ["student-services"], db };

describe("publishQueueNotifications", () => {
  it("stores what a change raises for the accounts it affects", async () => {
    const created = await publishQueueNotifications({
      ...studentServices,
      actorId: "usr_admin_001",
      db,
    });
    expect(created.map((item) => [item.userId, item.title, item.detail])).toEqual([
      [
        "usr_demo_003",
        "Estimated wait updated",
        "Student services: position 1, about 5 minutes.",
      ],
      [
        "taylor-nguyen",
        "Estimated wait updated",
        "Student services: position 2, about 10 minutes.",
      ],
      [
        "usr_alex_002",
        "Estimated wait updated",
        "Student services: position 3, about 15 minutes.",
      ],
    ]);
    // Each delivery is readable back from the recipient's own feed.
    expect(listNotifications(db, "usr_demo_003").notifications).toEqual([
      expect.objectContaining({ title: "Estimated wait updated", read: false }),
    ]);
  });

  it("saves the estimates it announced, keyed by queue entry", async () => {
    await publishQueueNotifications({ ...studentServices, db });
    expect(readWaitBaselines(db)).toEqual({
      "seed-1": 5,
      "seed-2": 10,
      "seed-3": 15,
    });
  });

  it("does not announce the same estimate twice, even after a restart", async () => {
    await publishQueueNotifications({ ...studentServices, db });
    const before = listNotifications(db, "usr_alex_002").total;
    // A new call reads the saved baselines, as a restarted server would.
    await expect(
      publishQueueNotifications({ ...studentServices, db }),
    ).resolves.toEqual([]);
    expect(listNotifications(db, "usr_alex_002").total).toBe(before);
  });

  it("forgets the baseline of an entry that has left the queue", async () => {
    await publishQueueNotifications({ ...studentServices, db });
    const { serveNext } = await import("@/server/queue/queueService");
    const { getQueueStore } = await import("@/server/queue/store");
    const { events } = serveNext(getQueueStore(), "student-services");
    await publishQueueNotifications({
      events,
      serviceIds: ["student-services"],
      actorId: "usr_admin_001",
      db,
    });
    expect(Object.keys(readWaitBaselines(db))).toEqual(["seed-2", "seed-3"]);
  });

  it("never fails a queue operation when delivery breaks", async () => {
    const broken = {
      prepare: () => {
        throw new Error("database is gone");
      },
      exec: () => {
        throw new Error("database is gone");
      },
    } as unknown as typeof db;
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      publishQueueNotifications({
        events: [],
        serviceIds: ["student-services"],
        db: broken,
      }),
    ).resolves.toEqual([]);
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it("stores nothing when one delivery in a batch fails", async () => {
    const { getQueueStore } = await import("@/server/queue/store");
    const store = getQueueStore();
    // An entry naming an account that no longer exists breaks its delivery.
    store.queues["student-services"][0].userId = "usr_ghost";
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      publishQueueNotifications({ ...studentServices, db }),
    ).resolves.toEqual([]);
    expect(listNotifications(db, "usr_alex_002").total).toBe(2);
    expect(readWaitBaselines(db)).toEqual({});
    logged.mockRestore();
  });
  it("rolls back earlier deliveries and baselines on a later SQL failure, then retries successfully", async () => {
    const before = db.prepare("SELECT * FROM notifications ORDER BY id").all();
    const queueBefore = structuredClone(getQueueStore());
    db.exec(`CREATE TRIGGER reject_second_delivery BEFORE INSERT ON notifications
      WHEN NEW.user_id = 'taylor-nguyen' BEGIN SELECT RAISE(ABORT, 'second delivery failed'); END;`);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await publishQueueNotifications({ ...studentServices, db })).toEqual([]);
      expect(logged).toHaveBeenCalled();
      expect(db.prepare("SELECT * FROM notifications ORDER BY id").all()).toEqual(before);
      expect(readWaitBaselines(db)).toEqual({});
      expect(getQueueStore()).toEqual(queueBefore);
    } finally {
      db.exec("DROP TRIGGER reject_second_delivery");
      logged.mockRestore();
    }
    const delivered = await publishQueueNotifications({ ...studentServices, db });
    expect(delivered.map(note => note.userId)).toEqual(["usr_demo_003", "taylor-nguyen", "usr_alex_002"]);
    expect(readWaitBaselines(db)).toEqual({ "seed-1": 5, "seed-2": 10, "seed-3": 15 });
    expect(listNotifications(db, "usr_alex_002").total).toBe(3);
    expect(listNotifications(db, "usr_admin_001").total).toBe(1);
  });

});
