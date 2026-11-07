import { beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/lib/auth/auth-service";
import { getDatabase } from "@/server/db/connection";
import { serviceRepository } from "@/server/db/repositories/service-repository";
import { getQueueStore, resetQueueStore } from "@/server/queue/store";
import { GET, POST } from "./route";
import { GET as single, PUT, PATCH, DELETE } from "./[serviceId]/route";

const context = (serviceId = "student-services") => ({ params: Promise.resolve({ serviceId }) });
const mutations = [
  { method: "POST", run: (r: Request) => POST(r) },
  { method: "PUT", run: (r: Request) => PUT(r, context()) },
  { method: "PATCH", run: (r: Request) => PATCH(r, context()) },
  { method: "DELETE", run: (r: Request) => DELETE(r, context()) },
];
let tokens: Record<string, string>;
beforeEach(async () => {
  getDatabase().exec("DELETE FROM services");
  serviceRepository.seedDefaultServices();
  resetQueueStore();
  const admin = (await authService.getUserById("usr_admin_001"))!;
  const user = (await authService.getUserById("usr_alex_002"))!;
  tokens = {
    admin: authService.createSessionToken(admin), user: authService.createSessionToken(user),
    missing: "", invalid: "tampered",
    removed: authService.createSessionToken({ ...user, id: "removed-account" }),
    spoofed: authService.createSessionToken({ ...user, role: "admin" }),
  };
});
function request(method: string, identity: string, cookie: boolean, body?: unknown) {
  const headers = new Headers({ "Content-Type": "application/json", "X-Role": "admin" });
  if (tokens[identity]) headers.set(cookie ? "cookie" : "Authorization", cookie ? `qs_session=${tokens[identity]}` : `Bearer ${tokens[identity]}`);
  return new Request("http://test/api/services", { method, headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}
function savedState() {
  const db = getDatabase();
  return ["services", "queues", "queue_entries"].map(table => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
}

for (const cookie of [false, true]) {
  describe(`${cookie ? "cookie" : "Bearer"} service permissions`, () => {
    it.each(["admin", "user"])("allows %s to list and retrieve services with no-store", async role => {
      for (const response of [await GET(request("GET", role, cookie)), await single(request("GET", role, cookie), context())]) {
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect((await response.json()).success).toBe(true);
      }
    });

    it.each(["missing", "invalid", "removed"])("rejects %s authentication on every endpoint before parsing or writes", async identity => {
      const before = savedState();
      for (const endpoint of [...mutations,
        { method: "GET", run: (r: Request) => GET(r) },
        { method: "GET", run: (r: Request) => single(r, context()) },
      ]) {
        const req = request(endpoint.method, identity, cookie, endpoint.method === "GET" ? undefined : "{bad");
        const parse = vi.spyOn(req, "json");
        const response = await endpoint.run(req);
        expect(response.status).toBe(401);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect((await response.json()).error.code).toBe("unauthenticated");
        expect(parse).not.toHaveBeenCalled();
      }
      expect(savedState()).toEqual(before);
    });

    it.each(["user", "spoofed"])("rejects %s mutations before parsing, including spoofed role data", async identity => {
      const before = savedState();
      const runtime = structuredClone(getQueueStore());
      for (const endpoint of mutations) {
        for (const body of ["{bad", { role: "admin", open: false, name: "Spoof" }]) {
          const req = request(endpoint.method, identity, cookie, body);
          const parse = vi.spyOn(req, "json");
          const response = await endpoint.run(req);
          expect(response.status).toBe(403);
          expect(response.headers.get("Cache-Control")).toBe("no-store");
          expect((await response.json()).error.code).toBe("forbidden");
          expect(parse).not.toHaveBeenCalled();
        }
      }
      expect(savedState()).toEqual(before);
      expect(getQueueStore()).toEqual(runtime);
    });

    it("allows a complete Administrator workflow and retains error/cache contracts", async () => {
      const created = await POST(request("POST", "admin", cookie, { name: "Admin service", description: "Help", duration: 6, priority: "medium" }));
      expect(created.status).toBe(201);
      expect(created.headers.get("Cache-Control")).toBe("no-store");
      const { service } = await created.json();
      const ctx = context(service.id);
      expect((await PUT(request("PUT", "admin", cookie, { name: "Renamed" }), ctx)).status).toBe(200);
      expect((await PATCH(request("PATCH", "admin", cookie, { open: true }), ctx)).status).toBe(200);
      expect(serviceRepository.findById(service.id)).toMatchObject({ name: "Renamed", duration: 6, open: true });
      const bad = await PATCH(request("PATCH", "admin", cookie, "{bad"), ctx);
      expect(bad.status).toBe(400);
      expect(bad.headers.get("Cache-Control")).toBe("no-store");
      expect((await bad.json()).error.code).toBe("invalid_json");
      expect((await DELETE(request("DELETE", "admin", cookie), ctx)).status).toBe(200);
      expect(serviceRepository.findById(service.id)).toBeNull();
      const missing = await single(request("GET", "admin", cookie), ctx);
      expect(missing.status).toBe(404);
      expect(missing.headers.get("Cache-Control")).toBe("no-store");
    });
  });
}
