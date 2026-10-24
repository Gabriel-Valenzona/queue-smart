import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoredNotification } from "@/server/notifications/types";
import {
  notificationApi,
  relativeTime,
  toDisplayNotification,
} from "./notifications";
import { ApiError } from "./queues";

/** A fresh Response per call, since a body can only be read once. */
function mockFetch(status: number, body: unknown) {
  const fetchMock = vi
    .fn()
    .mockImplementation(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const stored: StoredNotification = {
  id: "ntf_1",
  userId: "usr_alex_002",
  category: "queue-update",
  tone: "info",
  title: "Estimated wait updated",
  detail: "Student services: position 2, about 10 minutes.",
  service: "Student services",
  createdAt: "2026-10-23T12:00:00.000Z",
  read: false,
  silent: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("notificationApi", () => {
  it("reads the feed without a query string by default", async () => {
    const fetchMock = mockFetch(200, {
      notifications: [stored],
      unreadCount: 1,
      total: 1,
    });
    await expect(notificationApi.list()).resolves.toMatchObject({ unreadCount: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/notifications");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("passes the filter and limit through the query string", async () => {
    const fetchMock = mockFetch(200, { notifications: [], unreadCount: 0, total: 0 });
    await notificationApi.list({ filter: "unread", limit: 5 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/notifications?filter=unread&limit=5");
    await notificationApi.list({ filter: "all" });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/notifications");
  });

  it("returns the stored notification it created", async () => {
    const fetchMock = mockFetch(201, { notification: stored });
    await expect(
      notificationApi.create({
        category: "system",
        tone: "info",
        title: "Saved",
        detail: "Settings updated.",
      }),
    ).resolves.toMatchObject({ id: "ntf_1" });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: expect.any(Headers),
    });
  });

  it("returns null when the account switched that category off", async () => {
    mockFetch(200, { suppressed: true, message: "Switched off." });
    await expect(
      notificationApi.create({
        category: "service",
        tone: "info",
        title: "Service note",
        detail: "Not delivered.",
      }),
    ).resolves.toBeNull();
  });

  it.each([
    ["setRead", () => notificationApi.setRead("ntf 1", true), "/api/notifications/ntf%201", "PATCH"],
    ["dismiss", () => notificationApi.dismiss("ntf_1"), "/api/notifications/ntf_1", "DELETE"],
    ["markAllRead", () => notificationApi.markAllRead(), "/api/notifications", "PATCH"],
    ["clearAll", () => notificationApi.clearAll(), "/api/notifications", "DELETE"],
    [
      "preferences",
      () => notificationApi.preferences(),
      "/api/notifications/preferences",
      undefined,
    ],
    [
      "savePreferences",
      () => notificationApi.savePreferences({ categories: { service: false } }),
      "/api/notifications/preferences",
      "PUT",
    ],
  ])("%s calls the expected endpoint", async (_name, call, path, method) => {
    const fetchMock = mockFetch(200, { preferences: {}, notification: stored });
    await call();
    expect(fetchMock.mock.calls[0][0]).toBe(path);
    expect(fetchMock.mock.calls[0][1].method).toBe(method);
  });

  it("raises the API error code, message, and fields", async () => {
    mockFetch(400, {
      error: {
        code: "validation_error",
        message: "Some fields are invalid.",
        fields: { "quietHours.start": "Use a 24-hour time such as 21:00." },
      },
    });
    const error = await notificationApi
      .savePreferences({ quietHours: { enabled: true, start: "9pm", end: "07:00" } })
      .catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "validation_error",
      fields: { "quietHours.start": "Use a 24-hour time such as 21:00." },
    });
  });
});

describe("relativeTime", () => {
  const now = Date.parse("2026-10-23T12:00:00Z");

  it.each([
    ["2026-10-23T11:59:40Z", "Just now"],
    ["2026-10-23T11:59:00Z", "1 minute ago"],
    ["2026-10-23T11:40:00Z", "20 minutes ago"],
    ["2026-10-23T11:00:00Z", "1 hour ago"],
    ["2026-10-23T07:00:00Z", "5 hours ago"],
    ["2026-10-22T11:00:00Z", "Yesterday"],
    ["2026-10-20T12:00:00Z", "3 days ago"],
  ])("describes %s as %s", (createdAt, expected) => {
    expect(relativeTime(createdAt, now)).toBe(expected);
  });

  it("falls back to a date for anything older than a week", () => {
    expect(relativeTime("2026-10-01T12:00:00Z", now)).toBe("Oct 1, 2026");
  });

  it("does not invent a time it cannot read", () => {
    expect(relativeTime("whenever", now)).toBe("Recently");
  });
});

describe("toDisplayNotification", () => {
  it("adds the display label and keeps the exact timestamp", () => {
    expect(
      toDisplayNotification(stored, Date.parse("2026-10-23T12:10:00Z")),
    ).toEqual({
      id: "ntf_1",
      category: "queue-update",
      tone: "info",
      title: "Estimated wait updated",
      detail: "Student services: position 2, about 10 minutes.",
      service: "Student services",
      time: "10 minutes ago",
      createdAt: "2026-10-23T12:00:00.000Z",
      read: false,
    });
  });

  it("leaves out a service that was not supplied", () => {
    const { service, ...withoutService } = stored;
    expect(service).toBe("Student services");
    expect(toDisplayNotification(withoutService)).not.toHaveProperty("service");
  });
});
