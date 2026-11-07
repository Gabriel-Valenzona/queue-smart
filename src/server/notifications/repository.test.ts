import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedUsers } from "@/lib/auth/user-store";
import { openDatabase, transaction, type Database } from "@/server/db/connection";
import { seedQueues } from "@/server/queue/store";
import { defaultPreferences } from "./preferences";
import {
  clearNotificationData,
  countNotifications,
  deleteNotification,
  deleteUserNotifications,
  findNotification,
  insertNotification,
  markAllViewed,
  readFeed,
  readPreferences,
  readWaitBaselines,
  savePreferences,
  saveWaitBaselines,
  updateNotificationStatus,
} from "./repository";
import { seedNotifications } from "./store";
import type { StoredNotification } from "./types";

const alex = "usr_alex_002";
const jordan = "usr_demo_003";

function notification(patch: Partial<StoredNotification> = {}): StoredNotification {
  return {
    id: `ntf_${Math.random().toString(36).slice(2)}`,
    userId: alex,
    category: "queue-update",
    tone: "info",
    title: "Estimated wait updated",
    detail: "Student services: position 2, about 10 minutes.",
    service: "Student services",
    createdAt: "2026-11-05T12:00:00.000Z",
    read: false,
    silent: false,
    ...patch,
  };
}

/** Writes a row with the column values a test wants, bypassing the mappers. */
function insertRow(db: Database, values: Record<string, unknown>) {
  const row = {
    id: "ntf_raw",
    user_id: alex,
    category: "system",
    tone: "info",
    title: "Title",
    detail: "Detail",
    service_name: null,
    created_at: "2026-11-05T12:00:00.000Z",
    status: "sent",
    silent: 0,
    ...values,
  };
  const keys = Object.keys(row);
  db.prepare(
    `INSERT INTO notifications (${keys.join(", ")})
     VALUES (${keys.map(() => "?").join(", ")})`,
  ).run(...(Object.values(row) as never[]));
}

let db: Database;
beforeEach(() => {
  db = openDatabase(":memory:");
  seedUsers(db);
});
afterEach(() => {
  db.close();
});

describe("notifications table", () => {
  it("stores a notification and reads it back unchanged", () => {
    const stored = insertNotification(db, notification({ id: "ntf_1" }));
    expect(findNotification(db, alex, "ntf_1")).toEqual(stored);
  });

  it("records read state as the stored sent and viewed status", () => {
    insertNotification(db, notification({ id: "ntf_1" }));
    insertNotification(db, notification({ id: "ntf_2", read: true }));
    const status = (id: string) =>
      (
        db.prepare("SELECT status FROM notifications WHERE id = ?").get(id) as {
          status: string;
        }
      ).status;
    expect([status("ntf_1"), status("ntf_2")]).toEqual(["sent", "viewed"]);

    updateNotificationStatus(db, alex, "ntf_1", true);
    expect(status("ntf_1")).toBe("viewed");
    expect(findNotification(db, alex, "ntf_1")?.read).toBe(true);
  });

  it("keeps an absent service name absent rather than empty", () => {
    insertNotification(
      db,
      notification({ id: "ntf_1", service: undefined, category: "system" }),
    );
    expect(findNotification(db, alex, "ntf_1")).not.toHaveProperty("service");
  });

  it("rejects missing required fields", () => {
    for (const column of ["user_id", "category", "tone", "title", "detail", "created_at"])
      expect(() => insertRow(db, { [column]: null })).toThrowError(/NOT NULL/i);
  });

  it("rejects values of the wrong type, and converts what it can", () => {
    expect(() => insertRow(db, { silent: "yes" })).toThrowError(/cannot store/i);
    // A number becomes text in a STRICT table, so the CHECK constraints and the
    // API validators are what keep a value like this out.
    insertRow(db, { title: 42 });
    expect(findNotification(db, alex, "ntf_raw")?.title).toMatch(/^42/);
    expect(() => insertRow(db, { id: "ntf_raw2", created_at: 20261105 })).toThrowError(
      /CHECK constraint/i,
    );
  });

  it("rejects blank and over-long text", () => {
    for (const values of [
      { title: "   " },
      { detail: "" },
      { title: "t".repeat(121) },
      { detail: "d".repeat(501) },
      { service_name: "s".repeat(101) },
      { id: "n".repeat(65) },
    ])
      expect(() => insertRow(db, values)).toThrowError(/CHECK constraint/i);
  });

  it("rejects values outside the allowed sets", () => {
    for (const values of [
      { category: "gossip" },
      { tone: "loud" },
      { status: "archived" },
      { silent: 2 },
      { created_at: "last Tuesday" },
    ])
      expect(() => insertRow(db, values)).toThrowError(/CHECK constraint/i);
  });

  it("rejects a repeated id", () => {
    insertNotification(db, notification({ id: "ntf_1" }));
    expect(() => insertNotification(db, notification({ id: "ntf_1" }))).toThrowError(
      /UNIQUE/i,
    );
  });

  it("requires the recipient to be an existing account", () => {
    expect(() =>
      insertNotification(db, notification({ userId: "usr_ghost" })),
    ).toThrowError(/FOREIGN KEY/i);
  });

  it("removes an account's notifications with the account", () => {
    insertNotification(db, notification({ userId: jordan }));
    db.prepare("DELETE FROM user_credentials WHERE id = ?").run(jordan);
    expect(countNotifications(db)).toBe(0);
  });
});

describe("reading a feed", () => {
  beforeEach(() => {
    seedNotifications(db);
    insertNotification(
      db,
      notification({
        id: "ntf_new",
        category: "status-change",
        title: "You’ve been served",
        createdAt: "2026-11-05T12:00:00.000Z",
      }),
    );
  });

  it("returns one account's rows, newest first", () => {
    const feed = readFeed(db, alex);
    expect(feed.notifications.map((item) => item.id)).toEqual([
      "ntf_new",
      "seed-note-2",
      "seed-note-1",
    ]);
    expect(feed).toMatchObject({ unreadCount: 2, total: 3 });
  });

  it("orders notifications sent at the same moment by insertion", () => {
    insertNotification(db, notification({ id: "ntf_same_1" }));
    insertNotification(db, notification({ id: "ntf_same_2" }));
    expect(readFeed(db, alex).notifications.slice(0, 2).map((item) => item.id)).toEqual(
      ["ntf_same_2", "ntf_same_1"],
    );
  });

  it("filters by unread and by category, keeping the unfiltered counts", () => {
    expect(readFeed(db, alex, { filter: "unread" })).toMatchObject({
      unreadCount: 2,
      total: 3,
    });
    expect(
      readFeed(db, alex, { filter: "status-change" }).notifications.map((i) => i.id),
    ).toEqual(["ntf_new"]);
  });

  it("limits the rows without changing the counts", () => {
    expect(readFeed(db, alex, { filter: "all", limit: 2 })).toMatchObject({
      total: 3,
      unreadCount: 2,
    });
    expect(readFeed(db, alex, { filter: "all", limit: 2 }).notifications).toHaveLength(2);
  });

  it("counts and clears only the account asked for", () => {
    expect(markAllViewed(db, alex)).toBe(2);
    expect(readFeed(db, alex).unreadCount).toBe(0);
    expect(readFeed(db, "usr_admin_001").unreadCount).toBe(1);

    expect(deleteNotification(db, alex, "seed-note-1")).toBe(1);
    expect(deleteNotification(db, alex, "seed-note-admin")).toBe(0);
    expect(deleteUserNotifications(db, alex)).toBe(2);
    expect(countNotifications(db)).toBe(1);
  });
});

describe("notification_preferences table", () => {
  it("falls back to the defaults for an account with no row", () => {
    expect(readPreferences(db, alex)).toEqual(defaultPreferences());
  });

  it("saves settings and reads them back", () => {
    const saved = savePreferences(
      db,
      alex,
      {
        categories: {
          "queue-update": false,
          "status-change": true,
          service: false,
          system: true,
        },
        quietHours: { enabled: true, start: "21:30", end: "06:45" },
      },
      "2026-11-05T12:00:00.000Z",
    );
    expect(readPreferences(db, alex)).toEqual(saved);
  });

  it("keeps one row per account, updating it in place", () => {
    const base = defaultPreferences();
    savePreferences(db, alex, base);
    savePreferences(db, alex, {
      ...base,
      quietHours: { enabled: true, start: "22:00", end: "07:00" },
    });
    expect(
      (
        db
          .prepare("SELECT count(*) AS n FROM notification_preferences")
          .get() as { n: number }
      ).n,
    ).toBe(1);
    expect(readPreferences(db, alex).quietHours.start).toBe("22:00");
  });

  it("rejects times that are not a 24-hour clock", () => {
    for (const start of ["9pm", "24:00", "21:60", "2130"])
      expect(() =>
        savePreferences(db, alex, {
          ...defaultPreferences(),
          quietHours: { enabled: true, start, end: "07:00" },
        }),
      ).toThrowError(/CHECK constraint/i);
  });

  it("rejects quiet hours that start and end at the same time", () => {
    expect(() =>
      savePreferences(db, alex, {
        ...defaultPreferences(),
        quietHours: { enabled: true, start: "21:00", end: "21:00" },
      }),
    ).toThrowError(/CHECK constraint/i);
  });

  it("requires the account to exist", () => {
    expect(() =>
      savePreferences(db, "usr_ghost", defaultPreferences()),
    ).toThrowError(/FOREIGN KEY/i);
  });
});

describe("notification_wait_baselines table", () => {
  beforeEach(() => {
    seedQueues(db);
  });

  it("saves the announced estimate for a queue entry", () => {
    saveWaitBaselines(db, { "seed-1": 5, "seed-3": 15 });
    expect(readWaitBaselines(db)).toEqual({ "seed-1": 5, "seed-3": 15 });
  });

  it("replaces the whole set, so pruned entries are forgotten", () => {
    saveWaitBaselines(db, { "seed-1": 5, "seed-3": 15 });
    saveWaitBaselines(db, { "seed-3": 10 });
    expect(readWaitBaselines(db)).toEqual({ "seed-3": 10 });
  });

  it("requires an existing queue entry and a usable estimate", () => {
    expect(() => saveWaitBaselines(db, { "entry-gone": 5 })).toThrowError(
      /FOREIGN KEY/i,
    );
    expect(() => saveWaitBaselines(db, { "seed-1": -1 })).toThrowError(
      /CHECK constraint/i,
    );
  });

  it("forgets an estimate when its queue entry is deleted", () => {
    saveWaitBaselines(db, { "seed-1": 5 });
    db.prepare("DELETE FROM queue_entries WHERE id = ?").run("seed-1");
    expect(readWaitBaselines(db)).toEqual({});
  });
});

describe("persistence", () => {
  let folder: string;
  let file: string;

  beforeEach(() => {
    folder = mkdtempSync(path.join(tmpdir(), "queuesmart-notifications-"));
    file = path.join(folder, "queuesmart.sqlite");
  });
  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it("keeps notifications, read state, and settings across connections", () => {
    const first = openDatabase(file);
    try {
      seedNotifications(first);
      insertNotification(first, notification({ id: "ntf_kept" }));
      updateNotificationStatus(first, alex, "seed-note-2", true);
      savePreferences(first, alex, {
        ...defaultPreferences(),
        quietHours: { enabled: true, start: "21:00", end: "07:00" },
      });
    } finally {
      first.close();
    }

    const second = openDatabase(file);
    try {
      const feed = readFeed(second, alex);
      expect(feed.notifications.map((item) => item.id)).toEqual([
        "ntf_kept",
        "seed-note-2",
        "seed-note-1",
      ]);
      expect(feed.unreadCount).toBe(1);
      expect(readPreferences(second, alex).quietHours.enabled).toBe(true);
    } finally {
      second.close();
    }
  });

  it("persists wait baselines alongside account-isolated messages, read state and preferences", () => {
    const first = openDatabase(file);
    let alexFeed;
    let adminFeed;
    let preferences;
    try {
      seedQueues(first);
      seedNotifications(first);
      saveWaitBaselines(first, { "seed-1": 5, "seed-3": 15 });
      updateNotificationStatus(first, alex, "seed-note-2", true);
      deleteNotification(first, alex, "seed-note-1");
      savePreferences(first, alex, {
        ...defaultPreferences(),
        categories: { "queue-update": false, "status-change": true, service: true, system: false },
        quietHours: { enabled: true, start: "22:30", end: "07:30" },
      });
      alexFeed = readFeed(first, alex);
      adminFeed = readFeed(first, "usr_admin_001");
      preferences = readPreferences(first, alex);
      expect(alexFeed.unreadCount).toBe(0);
      expect(adminFeed.unreadCount).toBe(1);
    } finally {
      first.close();
    }
    const second = openDatabase(file);
    try {
      expect(readFeed(second, alex)).toEqual(alexFeed);
      expect(readFeed(second, "usr_admin_001")).toEqual(adminFeed);
      expect(readPreferences(second, alex)).toEqual(preferences);
      expect(readPreferences(second, "usr_admin_001")).toEqual(defaultPreferences());
      expect(readWaitBaselines(second)).toEqual({ "seed-1": 5, "seed-3": 15 });
      expect(() => transaction(second, () => saveWaitBaselines(second, { "seed-3": 10, missing: 1 }))).toThrow(/FOREIGN KEY/);
      expect(readWaitBaselines(second)).toEqual({ "seed-1": 5, "seed-3": 15 });
      second.prepare("DELETE FROM queue_entries WHERE id = ?").run("seed-1");
      expect(readWaitBaselines(second)).toEqual({ "seed-3": 15 });
      expect(readFeed(second, "usr_admin_001")).toEqual(adminFeed);
    } finally {
      second.close();
    }
  });

  it("seeds the demo notifications once, and keeps later changes", () => {
    const connection = openDatabase(file);
    try {
      seedNotifications(connection);
      deleteNotification(connection, alex, "seed-note-1");
      seedNotifications(connection);
      expect(countNotifications(connection)).toBe(2);
    } finally {
      connection.close();
    }
  });

  it("rolls back a failed batch of deliveries", () => {
    expect(() =>
      transaction(db, () => {
        insertNotification(db, notification({ id: "ntf_ok" }));
        insertNotification(db, notification({ id: "ntf_bad", userId: "usr_ghost" }));
      }),
    ).toThrowError(/FOREIGN KEY/i);
    expect(countNotifications(db)).toBe(0);
  });

  it("clears every table the module owns", () => {
    seedNotifications(db);
    seedQueues(db);
    savePreferences(db, alex, defaultPreferences());
    saveWaitBaselines(db, { "seed-1": 5 });

    transaction(db, () => clearNotificationData(db));
    expect(countNotifications(db)).toBe(0);
    expect(readWaitBaselines(db)).toEqual({});
    expect(readPreferences(db, alex)).toEqual(defaultPreferences());
  });
});
