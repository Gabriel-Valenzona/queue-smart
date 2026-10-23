import { beforeEach, describe, expect, it } from "vitest";
import { authService } from "@/lib/auth/auth-service";
import { getQueueStore, resetQueueStore } from "@/server/queue/store";
import { joinQueue, leaveQueue, serveNext } from "@/server/queue/queueService";
import { updateService } from "@/server/services/service";
import { GET } from "./route";

async function request(userId = "usr_alex_002", query = "") {
  const user = await authService.getUserById(userId);
  return new Request(`http://test/api/history${query}`, {
    headers: { cookie: `qs_session=${authService.createSessionToken(user!)}` },
  });
}
beforeEach(() => resetQueueStore());

describe("authenticated history API", () => {
  it("returns empty history with no-store caching for a signed-in account", async () => {
    const response = await GET(await request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ history: [] });
    expect((await GET(await request("usr_admin_001"))).status).toBe(200);
  });
  it("rejects unauthenticated, forged, and missing-account sessions", async () => {
    const account = await authService.getUserById("usr_alex_002");
    const missing = authService.createSessionToken({
      ...account!,
      id: "deleted-account",
    });
    const missingSessionHeaders: HeadersInit[] = [
      {},
      { Authorization: "Bearer invalid" },
      { Authorization: `Bearer ${missing}` },
    ];
    for (const headers of missingSessionHeaders) {
      const response = await GET(
        new Request("http://test/api/history", { headers }),
      );
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("unauthenticated");
    }
  });
  it("does not allow a user selector or other query parameters", async () => {
    for (const query of ["?userId=usr_admin_001", "?page=1"]) {
      const response = await GET(await request("usr_alex_002", query));
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("validation_error");
    }
  });
  it("recovers all own records through independent requests, with name snapshots and no duplicates", async () => {
    const store = getQueueStore();
    for (const [id, userId, outcome] of [
      ["visit-1", "usr_alex_002", "served"],
      ["visit-2", "usr_alex_002", "canceled"],
      ["visit-3", "usr_demo_003", "served"],
    ] as const) {
      store.completed.push({
        entryId: id,
        serviceId: "student-services",
        userId,
        userName: "User",
        joinedAt: "2026-10-01T10:00:00Z",
        completedAt: "2026-10-01T11:00:00Z",
        outcome,
        ...{ serviceName: "Original service name" },
      });
    }
    const first = await (await GET(await request())).json();
    expect(first.history).toHaveLength(2);
    expect(first.history.map((r: { outcome: string }) => r.outcome)).toEqual([
      "served",
      "canceled",
    ]);
    store.services[0].name = "New name";
    const reloaded = await (await GET(await request())).json();
    expect(reloaded).toEqual(first);
    expect(
      (await (await GET(await request("usr_demo_003"))).json()).history,
    ).toHaveLength(1);
  });
  it("canceled visits survive history reload without duplicates", async () => {
    const store = getQueueStore();
    store.queues["student-services"] = [];
    store.queues["technology-support"] = [];
    const { entry } = joinQueue(
      store,
      "technology-support",
      {
        userId: "usr_alex_002",
        userName: "Alex",
        priority: "medium",
      },
      () => new Date("2026-10-23T10:00:00Z"),
    );
    leaveQueue(
      store,
      "technology-support",
      entry.id,
      () => new Date("2026-10-23T10:05:00Z"),
    );
    expect(() => leaveQueue(store, "technology-support", entry.id)).toThrow();
    expect(store.completed.filter((r) => r.entryId === entry.id)).toHaveLength(
      1,
    );
    const response = await GET(await request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      history: [
        {
          entryId: entry.id,
          serviceId: "technology-support",
          serviceName: "Technology support",
          joinedAt: "2026-10-23T10:00:00.000Z",
          completedAt: "2026-10-23T10:05:00.000Z",
          outcome: "canceled",
        },
      ],
    });
    expect(await (await GET(await request())).json()).toEqual(body);
    expect(
      (await (await GET(await request("usr_demo_003"))).json()).history,
    ).toEqual([]);
  });

  it("served repeat visits keep their completion names after service edits", async () => {
    const store = getQueueStore();
    store.queues["student-services"] = [];
    store.queues["technology-support"] = [];
    const user = {
      userId: "usr_alex_002",
      userName: "Alex",
      priority: "medium" as const,
    };
    const first = joinQueue(
      store,
      "technology-support",
      user,
      () => new Date("2026-10-23T10:00:00Z"),
    ).entry;
    serveNext(
      store,
      "technology-support",
      () => new Date("2026-10-23T10:10:00Z"),
    );
    updateService(store, "technology-support", {
      name: "Renamed support",
      description: "Help with technology.",
      duration: 7,
      priority: "high",
    });
    const second = joinQueue(
      store,
      "technology-support",
      user,
      () => new Date("2026-10-23T11:00:00Z"),
    ).entry;
    serveNext(
      store,
      "technology-support",
      () => new Date("2026-10-23T11:07:00Z"),
    );
    const response = await GET(await request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.history).toEqual([
      {
        entryId: second.id,
        serviceId: "technology-support",
        serviceName: "Renamed support",
        joinedAt: "2026-10-23T11:00:00.000Z",
        completedAt: "2026-10-23T11:07:00.000Z",
        outcome: "served",
      },
      {
        entryId: first.id,
        serviceId: "technology-support",
        serviceName: "Technology support",
        joinedAt: "2026-10-23T10:00:00.000Z",
        completedAt: "2026-10-23T10:10:00.000Z",
        outcome: "served",
      },
    ]);
    expect(first.id).not.toBe(second.id);
    expect(await (await GET(await request())).json()).toEqual(body);
  });
});
