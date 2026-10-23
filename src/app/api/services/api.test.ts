import { beforeEach, describe, expect, it } from "vitest";
import { authService } from "@/lib/auth/auth-service";
import { getQueueStore, resetQueueStore } from "@/server/queue/store";
import { GET, POST } from "./route";
import { PUT } from "./[serviceId]/route";
import { GET as queues } from "../queues/route";
import { getQueue, joinQueue, setQueueOpen } from "@/server/queue/queueService";

const input = {
  name: "New service",
  description: "Help",
  duration: 3,
  priority: "low",
};
const params = (serviceId: string) => ({
  params: Promise.resolve({ serviceId }),
});
async function request(
  method = "GET",
  body?: unknown,
  userId: string | null = "usr_admin_001",
  cookie = false,
) {
  const headers = new Headers();
  if (userId) {
    const user = await authService.getUserById(userId);
    const token = authService.createSessionToken(user!);
    headers.set(
      cookie ? "cookie" : "Authorization",
      cookie ? `qs_session=${token}` : `Bearer ${token}`,
    );
  }
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return new Request("http://test/api/services", {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });
}
beforeEach(() => resetQueueStore());

describe("service API access and validation", () => {
  it("lists shared services for both roles with no-store caching, including cookie authentication", async () => {
    for (const id of ["usr_admin_001", "usr_alex_002"]) {
      const response = await GET(await request("GET", undefined, id, true));
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect((await response.json()).services).toEqual(
        getQueueStore().services,
      );
    }
  });
  it("rejects unauthenticated listing and mutations before parsing bodies", async () => {
    for (const response of [
      await GET(await request("GET", undefined, null)),
      await POST(await request("POST", "{bad", null)),
      await PUT(await request("PUT", input, null), params("student-services")),
    ])
      expect(response.status).toBe(401);
    const response = await GET(
      new Request("http://test", {
        headers: { Authorization: "Bearer tampered" },
      }),
    );
    expect((await response.json()).error.code).toBe("unauthenticated");
  });
  it("rejects a user impersonating an administrator in request fields", async () => {
    const before = structuredClone(getQueueStore());
    expect(
      (
        await POST(
          await request("POST", { ...input, role: "admin" }, "usr_alex_002"),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await PUT(
          await request("PUT", input, "usr_alex_002"),
          params("student-services"),
        )
      ).status,
    ).toBe(403);
    expect(getQueueStore()).toEqual(before);
  });
  it("returns field errors, malformed JSON errors, and unknown/invalid ID errors", async () => {
    const invalid = await POST(
      await request("POST", { ...input, name: " ", duration: 1.5 }),
    );
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.fields).toMatchObject({
      name: expect.any(String),
      duration: expect.any(String),
    });
    const malformed = await POST(await request("POST", "{bad"));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("invalid_json");
    expect((await POST(await request("POST", null))).status).toBe(400);
    expect(
      (await PUT(await request("PUT", input), params("unknown"))).status,
    ).toBe(404);
    expect(
      (await PUT(await request("PUT", input), params("bad id"))).status,
    ).toBe(400);
    expect(
      (
        await PUT(
          await request("PUT", { name: "Only name" }),
          params("student-services"),
        )
      ).status,
    ).toBe(400);
    expect(
      (await PUT(await request("PUT", "{bad"), params("student-services")))
        .status,
    ).toBe(400);
  });
  it("creates a server service/empty queue and updates the same records used by queue APIs", async () => {
    const created = await POST(await request("POST", input));
    expect(created.status).toBe(201);
    const { service } = await created.json();
    expect(service.open).toBe(false);
    expect(getQueue(getQueueStore(), service.id).entries).toEqual([]);
    expect(
      (await (await queues()).json()).queues.find(
        (s: { id: string }) => s.id === service.id,
      ),
    ).toMatchObject({ ...input, length: 0 });
    setQueueOpen(getQueueStore(), service.id, true);
    joinQueue(getQueueStore(), service.id, {
      userId: "usr_admin_001",
      userName: "Administrator",
      priority: "medium",
    });
    const response = await PUT(
      await request("PUT", { ...input, name: "Renamed", duration: 8 }),
      params(service.id),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).service).toMatchObject({
      id: service.id,
      open: true,
      name: "Renamed",
    });
    expect(
      getQueue(getQueueStore(), service.id).entries[0].estimatedWaitMinutes,
    ).toBe(8);
    // Resolve the global store per request: a reset must not retain old service collections.
    resetQueueStore();
    expect((await (await GET(await request())).json()).services).toHaveLength(
      3,
    );
    expect(
      (await PUT(await request("PUT", input), params(service.id))).status,
    ).toBe(404);
  });
});
