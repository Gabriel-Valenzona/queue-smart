import { beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/lib/auth/auth-service";
import { getDatabase } from "@/server/db/connection";
import { serviceRepository } from "@/server/db/repositories/service-repository";
import { getQueueStore, loadQueueStore, resetQueueStore } from "@/server/queue/store";
import { getQueue, joinQueue, serveNext } from "@/server/queue/queueService";
import { GET as listServices } from "./route";
import { PATCH as servicePatch, PUT as servicePut } from "./[serviceId]/route";
import { PATCH as queuePatch } from "../queues/[serviceId]/route";
import { GET as listQueues } from "../queues/route";

const id = "student-services";
const ctx = () => ({ params: Promise.resolve({ serviceId: id }) });
async function request(open: unknown, method = "PATCH") {
  const admin = await authService.getUserById("usr_admin_001");
  return new Request("http://test/api/services/student-services", {
    method,
    headers: { Authorization: `Bearer ${authService.createSessionToken(admin!)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ open }),
  });
}
async function readRequest() {
  const source = await request(true);
  return new Request(source.url, { headers: source.headers });
}
beforeEach(() => {
  getDatabase().exec("DELETE FROM services");
  serviceRepository.seedDefaultServices();
  resetQueueStore();
});

for (const [name, handler, method] of [["service PATCH", servicePatch, "PATCH"], ["service PUT", servicePut, "PUT"], ["queue PATCH", queuePatch, "PATCH"]] as const) {
  describe(`${name} availability`, () => {
    it("closes and reopens both stored representations, runtime and API views without changing history", async () => {
      const store = getQueueStore();
      serveNext(store, id);
      const beforeEntries = structuredClone(store.queues[id]);
      const beforeHistory = structuredClone(store.completed);
      const queue = getDatabase().prepare("SELECT id, created_at FROM queues WHERE service_id = ?").get(id);
      for (const open of [false, true, true, false]) {
        const response = await handler(await request(open, method), ctx());
        expect(response.status).toBe(200);
        expect(serviceRepository.findById(id)?.open).toBe(open);
        expect(getDatabase().prepare("SELECT status FROM queues WHERE service_id = ?").get(id)).toEqual({ status: open ? "open" : "closed" });
        expect(getQueue(getQueueStore(), id).service.open).toBe(open);
        expect(loadQueueStore(getDatabase()).services.find(s => s.id === id)?.open).toBe(open);
        expect((await (await listServices(await readRequest())).json()).services.find((s: { id: string }) => s.id === id).open).toBe(open);
        expect((await (await listQueues(await readRequest())).json()).queues.find((s: { id: string }) => s.id === id).open).toBe(open);
        expect(getQueueStore().queues[id]).toEqual(beforeEntries);
        expect(getQueueStore().completed).toEqual(beforeHistory);
        expect(getDatabase().prepare("SELECT id, created_at FROM queues WHERE service_id = ?").get(id)).toEqual(queue);
      }
      expect(() => joinQueue(getQueueStore(), id, { userId: "usr_admin_001", userName: "Admin", priority: "medium" })).toThrow(expect.objectContaining({ code: "queue_closed" }));
      expect((await handler(await request(true, method), ctx())).status).toBe(200);
      expect(joinQueue(getQueueStore(), id, { userId: "usr_admin_001", userName: "Admin", priority: "medium" }).entry.position).toBeGreaterThan(0);
    });

    it.each([["services", "UPDATE"], ["queues", "UPDATE"], ["queues", "INSERT"]])("rolls back both values on a failed %s %s and restores runtime", async (table, operation) => {
      const db = getDatabase();
      const before = structuredClone(getQueueStore());
      db.exec(`CREATE TRIGGER reject_availability BEFORE ${operation} ON ${table}
        BEGIN SELECT RAISE(ABORT, 'availability rejected'); END;`);
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        expect((await handler(await request(false, method), ctx())).status).toBe(500);
        expect(serviceRepository.findById(id)?.open).toBe(true);
        expect(db.prepare("SELECT status FROM queues WHERE service_id = ?").get(id)).toEqual({ status: "open" });
        expect(getQueueStore()).toEqual(before);
      } finally {
        db.exec("DROP TRIGGER reject_availability");
        log.mockRestore();
      }
    });
  });
}
