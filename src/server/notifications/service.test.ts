import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedUsers } from "@/lib/auth/user-store";
import { openDatabase, type Database } from "@/server/db/connection";
import { ModuleError } from "@/server/modules/errors";
import {
  defaultPreferences,
  isCategoryEnabled,
  isQuietHours,
  normalizePreferences,
} from "./preferences";
import {
  clearNotifications,
  createNotification,
  createNotifications,
  dismissNotification,
  getPreferences,
  listNotifications,
  markAllRead,
  setNotificationRead,
  updatePreferences,
} from "./service";
import { seedNotifications } from "./store";
import type { NotificationInput } from "./types";

const alex = "usr_alex_002";
const jordan = "usr_demo_003";
const admin = "usr_admin_001";
const at = (iso: string) => () => new Date(iso);

function input(patch: Partial<NotificationInput> = {}): NotificationInput {
  return {
    userId: alex,
    category: "queue-update",
    tone: "info",
    title: "Estimated wait updated",
    detail: "Student services: position 2, about 10 minutes.",
    service: "Student services",
    ...patch,
  };
}

const titles = (db: Database, userId: string) =>
  listNotifications(db, userId).notifications.map((item) => item.title);

let db: Database;
beforeEach(() => {
  db = openDatabase(":memory:");
  seedUsers(db);
});
afterEach(() => {
  db.close();
});

describe("createNotification", () => {
  it("stores unread notifications newest first", () => {
    createNotification(db, input({ title: "First" }), at("2026-10-23T12:00:00Z"));
    const second = createNotification(
      db,
      input({ title: "Second" }),
      at("2026-10-23T12:05:00Z"),
    );
    expect(second).toMatchObject({
      userId: alex,
      title: "Second",
      read: false,
      silent: false,
      createdAt: "2026-10-23T12:05:00.000Z",
    });
    expect(titles(db, alex)).toEqual(["Second", "First"]);
  });

  it("keeps a supplied timestamp, such as when a visit completed", () => {
    const stored = createNotification(
      db,
      input({ createdAt: "2026-10-23T11:00:00.000Z" }),
      at("2026-10-23T12:00:00Z"),
    );
    expect(stored?.createdAt).toBe("2026-10-23T11:00:00.000Z");
  });

  it("gives every notification its own id", () => {
    const ids = [1, 2, 3].map(() => createNotification(db, input())?.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toMatch(/^ntf_/);
  });

  it("keeps the service name, and omits it when there is none", () => {
    expect(createNotification(db, input())?.service).toBe("Student services");
    expect(
      createNotification(db, input({ service: undefined, category: "system" })),
    ).not.toHaveProperty("service");
  });

  it("delivers nothing for a category the recipient switched off", () => {
    updatePreferences(db, alex, { categories: { "queue-update": false } });
    expect(createNotification(db, input())).toBeNull();
    expect(createNotification(db, input({ category: "status-change" }))).not.toBeNull();
    expect(listNotifications(db, alex).total).toBe(1);
  });

  it("still delivers system messages when every category is switched off", () => {
    updatePreferences(db, alex, {
      categories: {
        "queue-update": false,
        "status-change": false,
        service: false,
      },
    });
    expect(createNotification(db, input({ category: "system" }))).not.toBeNull();
  });

  it("keeps quiet-hours notifications in the feed without announcing them", () => {
    updatePreferences(db, alex, {
      quietHours: { enabled: true, start: "21:00", end: "07:00" },
    });
    expect(createNotification(db, input(), at("2026-10-23T22:30:00Z"))?.silent).toBe(
      true,
    );
    expect(createNotification(db, input(), at("2026-10-23T09:00:00Z"))?.silent).toBe(
      false,
    );
    // Newest first: the 22:30 notification is the quiet one.
    expect(
      listNotifications(db, alex).notifications.map((item) => item.silent),
    ).toEqual([true, false]);
  });

  it("delivers a batch and reports only what was stored", () => {
    updatePreferences(db, alex, { categories: { service: false } });
    const stored = createNotifications(db, [
      input(),
      input({ category: "service" }),
      input({ userId: jordan, category: "service" }),
    ]);
    expect(stored.map((item) => item.userId)).toEqual([alex, jordan]);
  });

  it("refuses a notification for an account that does not exist", () => {
    expect(() => createNotification(db, input({ userId: "usr_ghost" }))).toThrowError(
      /FOREIGN KEY/i,
    );
  });
});

describe("listNotifications", () => {
  beforeEach(() => {
    seedNotifications(db);
  });

  it("returns one account feed with its unread count", () => {
    const feed = listNotifications(db, alex);
    expect(feed.notifications).toHaveLength(2);
    expect(feed).toMatchObject({ unreadCount: 1, total: 2 });
    expect(feed.notifications.every((item) => item.userId === alex)).toBe(true);
  });

  it("filters by unread and by category without changing the counts", () => {
    expect(listNotifications(db, alex, { filter: "unread" })).toMatchObject({
      unreadCount: 1,
      total: 2,
    });
    expect(
      listNotifications(db, alex, { filter: "unread" }).notifications,
    ).toHaveLength(1);
    expect(
      listNotifications(db, alex, { filter: "status-change" }).notifications,
    ).toHaveLength(0);
  });

  it("limits the rows it returns", () => {
    expect(
      listNotifications(db, alex, { filter: "all", limit: 1 }).notifications,
    ).toEqual([expect.objectContaining({ id: "seed-note-2" })]);
  });

  it("is empty for an account with no notifications", () => {
    expect(listNotifications(db, jordan)).toEqual({
      notifications: [],
      unreadCount: 0,
      total: 0,
    });
  });
});

describe("read state and dismissal", () => {
  beforeEach(() => {
    seedNotifications(db);
  });

  it("marks one notification read and unread again", () => {
    expect(setNotificationRead(db, alex, "seed-note-2", true).read).toBe(true);
    expect(listNotifications(db, alex).unreadCount).toBe(0);
    expect(setNotificationRead(db, alex, "seed-note-2", false).read).toBe(false);
    expect(listNotifications(db, alex).unreadCount).toBe(1);
  });

  it("marks everything read and reports how many changed", () => {
    expect(markAllRead(db, alex)).toBe(1);
    expect(markAllRead(db, alex)).toBe(0);
    expect(listNotifications(db, alex).unreadCount).toBe(0);
  });

  it("dismisses one notification and clears the rest", () => {
    dismissNotification(db, alex, "seed-note-1");
    expect(listNotifications(db, alex).total).toBe(1);
    expect(clearNotifications(db, alex)).toBe(1);
    expect(listNotifications(db, alex).total).toBe(0);
  });

  it("leaves other accounts untouched when one clears its feed", () => {
    clearNotifications(db, alex);
    expect(listNotifications(db, admin).total).toBe(1);
  });

  it("reports another account notification as missing", () => {
    for (const run of [
      () => setNotificationRead(db, alex, "seed-note-admin", true),
      () => dismissNotification(db, alex, "seed-note-admin"),
      () => setNotificationRead(db, alex, "ntf_missing", true),
    ]) {
      expect(run).toThrowError(ModuleError);
      try {
        run();
      } catch (error) {
        expect(error).toMatchObject({
          status: 404,
          code: "notification_not_found",
        });
      }
    }
    expect(listNotifications(db, admin).total).toBe(1);
  });
});

describe("preferences", () => {
  it("starts with every category on and quiet hours off", () => {
    expect(getPreferences(db, alex)).toEqual(defaultPreferences());
  });

  it("changes only the settings a request sends", () => {
    updatePreferences(db, alex, { categories: { service: false } });
    const updated = updatePreferences(db, alex, {
      quietHours: { enabled: true, start: "22:00", end: "06:00" },
    });
    expect(updated.categories).toMatchObject({
      service: false,
      "queue-update": true,
    });
    expect(updated.quietHours).toEqual({
      enabled: true,
      start: "22:00",
      end: "06:00",
    });
    expect(getPreferences(db, alex)).toEqual(updated);
  });

  it("keeps system messages switched on", () => {
    const updated = normalizePreferences({
      categories: { ...defaultPreferences().categories, system: false },
    });
    expect(updated.categories.system).toBe(true);
    expect(isCategoryEnabled(updated, "system")).toBe(true);
  });

  it("does not affect other accounts", () => {
    updatePreferences(db, alex, { categories: { "queue-update": false } });
    expect(getPreferences(db, jordan).categories["queue-update"]).toBe(true);
  });

  it("refuses settings for an account that does not exist", () => {
    expect(() =>
      updatePreferences(db, "usr_ghost", { categories: { service: false } }),
    ).toThrowError(/FOREIGN KEY/i);
  });
});

describe("isQuietHours", () => {
  const overnight = { enabled: true, start: "21:00", end: "07:00" };

  it("is never quiet while the setting is off", () => {
    expect(
      isQuietHours({ ...overnight, enabled: false }, new Date("2026-10-23T23:00:00Z")),
    ).toBe(false);
  });

  it("covers a range that wraps past midnight", () => {
    expect(isQuietHours(overnight, new Date("2026-10-23T21:00:00Z"))).toBe(true);
    expect(isQuietHours(overnight, new Date("2026-10-23T03:00:00Z"))).toBe(true);
    expect(isQuietHours(overnight, new Date("2026-10-23T07:00:00Z"))).toBe(false);
    expect(isQuietHours(overnight, new Date("2026-10-23T12:00:00Z"))).toBe(false);
  });

  it("covers a range inside one day", () => {
    const midday = { enabled: true, start: "12:00", end: "13:00" };
    expect(isQuietHours(midday, new Date("2026-10-23T12:30:00Z"))).toBe(true);
    expect(isQuietHours(midday, new Date("2026-10-23T13:00:00Z"))).toBe(false);
  });

  it("treats an empty range as never quiet", () => {
    expect(
      isQuietHours(
        { enabled: true, start: "09:00", end: "09:00" },
        new Date("2026-10-23T09:00:00Z"),
      ),
    ).toBe(false);
  });
});
