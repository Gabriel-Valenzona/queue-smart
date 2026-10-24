import { beforeEach, describe, expect, it } from "vitest";
import { authService } from "@/lib/auth/auth-service";
import { getNotificationStore, resetNotificationStore } from "@/server/notifications";
import { resetQueueStore } from "@/server/queue";
import {
  DELETE as clearAll,
  GET as feed,
  PATCH as readAll,
  POST as create,
} from "./route";
import { DELETE as dismiss, PATCH as setRead } from "./[notificationId]/route";
import { GET as getPreferences, PUT as putPreferences } from "./preferences/route";
import { POST as join } from "../queues/[serviceId]/entries/route";
import { DELETE as leave } from "../queues/[serviceId]/entries/[entryId]/route";
import { POST as serve } from "../queues/[serviceId]/serve/route";
import { PATCH as setOpen } from "../queues/[serviceId]/route";

const params = <T>(value: T) => ({ params: Promise.resolve(value) });

const adminId = "usr_admin_001";
const alexId = "usr_alex_002";
const jordanId = "usr_demo_003";
const tokens: Record<string, string> = {};

function request(
  body?: unknown,
  method = "GET",
  actor = alexId,
  path = "http://test/api/notifications",
) {
  return new Request(path, {
    method,
    headers: {
      Authorization: `Bearer ${tokens[actor]}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined
      ? {}
      : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
}

const student = params({ serviceId: "student-services" });
const technology = params({ serviceId: "technology-support" });

/** The feed as one account sees it. */
async function feedFor(actor: string) {
  return (await feed(request(undefined, "GET", actor))).json();
}

async function titlesFor(actor: string) {
  const body = await feedFor(actor);
  return body.notifications.map(
    (item: { title: string }) => item.title,
  ) as string[];
}

beforeEach(async () => {
  resetQueueStore();
  resetNotificationStore();
  for (const id of [adminId, alexId, jordanId])
    tokens[id] = authService.createSessionToken(
      (await authService.getUserById(id))!,
    );
});

describe("GET /api/notifications", () => {
  it("returns only the signed-in account's feed with its unread count", async () => {
    const response = await feed(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({ unreadCount: 1, total: 2 });
    expect(
      body.notifications.every((item: { userId: string }) => item.userId === alexId),
    ).toBe(true);
  });

  it("filters and limits the feed", async () => {
    const unread = await (
      await feed(request(undefined, "GET", alexId, "http://test/api/notifications?filter=unread"))
    ).json();
    expect(unread.notifications).toHaveLength(1);
    const limited = await (
      await feed(request(undefined, "GET", alexId, "http://test/api/notifications?limit=1"))
    ).json();
    expect(limited.notifications).toHaveLength(1);
    expect(limited.total).toBe(2);
  });

  it("rejects a filter it does not support", async () => {
    const response = await feed(
      request(undefined, "GET", alexId, "http://test/api/notifications?filter=everything"),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.filter).toMatch(/filter must be/);
  });
});

describe("POST /api/notifications", () => {
  it("delivers a notification to the signed-in account", async () => {
    const response = await create(
      request(
        {
          category: "system",
          tone: "info",
          title: "Preferences saved",
          detail: "Your notification settings were updated.",
        },
        "POST",
      ),
    );
    expect(response.status).toBe(201);
    const { notification } = await response.json();
    expect(notification).toMatchObject({
      userId: alexId,
      title: "Preferences saved",
      read: false,
      silent: false,
    });
    expect((await feedFor(alexId)).total).toBe(3);
  });

  it("returns field errors for an invalid body", async () => {
    const response = await create(request({ category: "gossip", tone: "info" }, "POST"));
    expect(response.status).toBe(400);
    expect(Object.keys((await response.json()).error.fields)).toEqual(
      expect.arrayContaining(["category", "title", "detail"]),
    );
  });

  it("rejects malformed JSON", async () => {
    const response = await create(request("{", "POST"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_json");
  });

  it("reports a category the account switched off instead of storing it", async () => {
    await putPreferences(
      request({ categories: { service: false } }, "PUT", alexId, "http://test/api/notifications/preferences"),
    );
    const response = await create(
      request(
        {
          category: "service",
          tone: "info",
          title: "Service note",
          detail: "This should not be delivered.",
        },
        "POST",
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ suppressed: true });
    expect((await feedFor(alexId)).total).toBe(2);
  });
});

describe("PATCH and DELETE /api/notifications", () => {
  it("marks the whole feed as read", async () => {
    const response = await readAll(request({ read: true }, "PATCH"));
    expect(await response.json()).toMatchObject({ updated: 1, unreadCount: 0 });
  });

  it("supports only marking everything as read", async () => {
    const response = await readAll(request({ read: false }, "PATCH"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.read).toMatch(/as read/);
  });

  it("clears one account's feed and leaves another's alone", async () => {
    expect(await (await clearAll(request(undefined, "DELETE"))).json()).toMatchObject({
      removed: 2,
      total: 0,
    });
    expect((await feedFor(adminId)).total).toBe(1);
  });
});

describe("notification item routes", () => {
  it("marks one notification read and unread again", async () => {
    const id = params({ notificationId: "seed-note-2" });
    const read = await setRead(request({ read: true }, "PATCH"), id);
    expect(await read.json()).toMatchObject({
      notification: { id: "seed-note-2", read: true },
      unreadCount: 0,
    });
    const unread = await setRead(request({ read: false }, "PATCH"), id);
    expect(await unread.json()).toMatchObject({ unreadCount: 1 });
  });

  it("dismisses one notification", async () => {
    const response = await dismiss(
      request(undefined, "DELETE"),
      params({ notificationId: "seed-note-1" }),
    );
    expect(await response.json()).toMatchObject({
      dismissed: "seed-note-1",
      total: 1,
    });
  });

  it("will not touch another account's notification", async () => {
    const adminNote = params({ notificationId: "seed-note-admin" });
    const responses = await Promise.all([
      setRead(request({ read: true }, "PATCH"), adminNote),
      dismiss(request(undefined, "DELETE"), adminNote),
      setRead(request({ read: true }, "PATCH"), params({ notificationId: "ntf_missing" })),
    ]);
    expect(responses.map((response) => response.status)).toEqual([404, 404, 404]);
    expect((await responses[0].json()).error.code).toBe("notification_not_found");
    expect((await feedFor(adminId)).total).toBe(1);
  });

  it("rejects an invalid id", async () => {
    const response = await dismiss(
      request(undefined, "DELETE"),
      params({ notificationId: "not a valid id" }),
    );
    expect(response.status).toBe(400);
  });
});

describe("preferences routes", () => {
  const path = "http://test/api/notifications/preferences";

  it("starts from the defaults and saves a change", async () => {
    const before = await (await getPreferences(request(undefined, "GET", alexId, path))).json();
    expect(before.preferences).toMatchObject({
      categories: { "queue-update": true, system: true },
      quietHours: { enabled: false },
    });

    const saved = await putPreferences(
      request(
        {
          categories: { service: false },
          quietHours: { enabled: true, start: "21:00", end: "07:00" },
        },
        "PUT",
        alexId,
        path,
      ),
    );
    expect(saved.status).toBe(200);
    expect((await saved.json()).preferences).toMatchObject({
      categories: { service: false, "queue-update": true },
      quietHours: { enabled: true, start: "21:00", end: "07:00" },
    });
    expect(
      (await (await getPreferences(request(undefined, "GET", alexId, path))).json())
        .preferences.categories.service,
    ).toBe(false);
  });

  it("returns field errors for an invalid setting", async () => {
    const response = await putPreferences(
      request({ quietHours: { enabled: true, start: "9pm", end: "07:00" } }, "PUT", alexId, path),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields["quietHours.start"]).toMatch(/24-hour/);
  });

  it("keeps one account's settings separate from another's", async () => {
    await putPreferences(
      request({ categories: { "queue-update": false } }, "PUT", alexId, path),
    );
    const admin = await (
      await getPreferences(request(undefined, "GET", adminId, path))
    ).json();
    expect(admin.preferences.categories["queue-update"]).toBe(true);
  });
});

describe("authentication", () => {
  it("requires a session for every notification route", async () => {
    const anonymous = new Request("http://test/api/notifications");
    const id = params({ notificationId: "seed-note-1" });
    const responses = await Promise.all([
      feed(anonymous),
      create(anonymous),
      readAll(anonymous),
      clearAll(anonymous),
      setRead(anonymous, id),
      dismiss(anonymous, id),
      getPreferences(anonymous),
      putPreferences(anonymous),
    ]);
    expect(responses.map((response) => response.status)).toEqual(Array(8).fill(401));
    expect(getNotificationStore().notifications).toHaveLength(3);
  });
});

describe("queue activity reaches the right feeds", () => {
  it("confirms a place in line to the person who joined", async () => {
    // The seeded accounts already wait for Student services, so this joins as
    // the administrator, the one account with no place in line yet.
    const response = await join(
      request({ userId: adminId, userName: "QueueSmart Administrator" }, "POST", adminId),
      technology,
    );
    expect(response.status).toBe(201);
    const [stored] = (await feedFor(adminId)).notifications;
    expect(stored).toMatchObject({
      userId: adminId,
      title: "You’re in the queue",
      category: "queue-update",
      detail: "Technology support: position 3, about 30 minutes.",
      service: "Technology support",
    });
    // Joining tells nobody else; the people ahead are unaffected.
    expect(await titlesFor(alexId)).toEqual([
      "Estimated wait updated",
      "You’re in the queue",
    ]);
  });

  it("tells the served user, the next user, and anyone whose wait moved", async () => {
    await serve(request(undefined, "POST", adminId), student);
    expect(await titlesFor(jordanId)).toEqual(["You’ve been served"]);
    expect(await titlesFor(alexId)).toEqual([
      "Estimated wait updated",
      "Estimated wait updated",
      "You’re in the queue",
    ]);

    await serve(request(undefined, "POST", adminId), student);
    expect((await titlesFor(alexId))[0]).toBe("You’re almost ready");
  });

  it("tells a user an administrator removed them, and does not notify the administrator", async () => {
    const response = await leave(
      request(undefined, "DELETE", adminId),
      params({ serviceId: "student-services", entryId: "seed-3" }),
    );
    expect(response.status).toBe(200);
    const [removal] = (await feedFor(alexId)).notifications;
    expect(removal).toMatchObject({
      title: "Removed from the queue",
      tone: "warning",
      category: "status-change",
    });
    expect(await titlesFor(adminId)).toEqual(["Queue monitoring is active"]);
  });

  it("tells waiting users when their service closes", async () => {
    await setOpen(request({ open: false }, "PATCH", adminId), student);
    expect((await titlesFor(alexId))[0]).toBe("Service closed to new arrivals");
    // The administrator who closed it is not notified about their own change.
    expect(await titlesFor(adminId)).toEqual(["Queue monitoring is active"]);
  });

  it("does not deliver queue updates to an account that switched them off", async () => {
    await putPreferences(
      request(
        { categories: { "queue-update": false, "status-change": false } },
        "PUT",
        alexId,
        "http://test/api/notifications/preferences",
      ),
    );
    await serve(request(undefined, "POST", adminId), student);
    expect(await titlesFor(alexId)).toEqual([
      "Estimated wait updated",
      "You’re in the queue",
    ]);
  });
});
