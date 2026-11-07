import { beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/lib/auth/auth-service";
import { getDatabase } from "@/server/db/connection";
import { serviceRepository } from "@/server/db/repositories/service-repository";
import { getQueueStore, resetQueueStore } from "@/server/queue/store";
import { POST } from "./route";

const form = { name: "Form service", description: "Help", duration: 7, priority: "low" };
async function create(body: unknown) {
  const admin = await authService.getUserById("usr_admin_001");
  return POST(new Request("http://test/api/services", {
    method: "POST",
    headers: { Authorization: `Bearer ${authService.createSessionToken(admin!)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}
beforeEach(() => {
  getDatabase().exec(`DELETE FROM queue_entries; DELETE FROM queues;
    DELETE FROM services WHERE id NOT IN ('student-services', 'technology-support', 'academic-advising');`);
  resetQueueStore();
});

describe("form-compatible SQLite service creation", () => {
  it("generates an ID, defaults closed, and creates an empty queue before responding", async () => {
    const response = await create(form);
    expect(response.status).toBe(201);
    const { service, success, message } = await response.json();
    expect(success).toBe(true);
    expect(message).toBe("Service created successfully.");
    expect(service).toMatchObject({ ...form, open: false, expectedDuration: 7, priorityLevel: "low" });
    expect(service.id).toMatch(/^service-[0-9a-f-]{36}$/);
    expect(getDatabase().prepare("SELECT status FROM queues WHERE service_id = ?").get(service.id)).toEqual({ status: "closed" });
    expect(getDatabase().prepare("SELECT * FROM queue_entries WHERE queue_id = (SELECT id FROM queues WHERE service_id = ?)").all(service.id)).toEqual([]);
    const reset = resetQueueStore();
    expect(reset.services.find(s => s.id === service.id)).toMatchObject({ ...form, open: false });
    expect(reset.queues[service.id]).toEqual([]);
  });

  it.each(["id", "serviceId"])("preserves explicit %s and legacy aliases, including explicit availability", async key => {
    const response = await create({ [key]: "explicit-service", serviceName: "Legacy", description: "Help", expectedDuration: 12, priorityLevel: "HIGH", open: true });
    expect(response.status).toBe(201);
    expect((await response.json()).service).toMatchObject({ id: "explicit-service", name: "Legacy", duration: 12, priority: "high", open: true });
    expect((await create({ ...form, [key]: "explicit-service" })).status).toBe(409);
    expect(getDatabase().prepare("SELECT count(*) AS n FROM queues WHERE service_id = 'explicit-service'").get()).toEqual({ n: 1 });
  });

  it.each(["", "bad id", "x".repeat(65), null, 42, false])("rejects an invalid supplied identifier %j", async id => {
    const count = serviceRepository.count();
    const response = await create({ ...form, id });
    expect(response.status).toBe(400);
    expect((await response.json()).errors.id).toEqual(expect.any(String));
    expect(serviceRepository.count()).toBe(count);
  });

  it.each(["true", 1, null])("rejects nonboolean open %j", async open => {
    expect((await create({ ...form, open })).status).toBe(400);
  });

  it("returns both legacy validation fields and form field mappings", async () => {
    const response = await create({ ...form, duration: 0, priority: "urgent" });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false,
      errors: { expectedDuration: expect.any(String), priorityLevel: expect.any(String) },
      error: { code: "validation_error", fields: { duration: expect.any(String), priority: expect.any(String) } },
    });
  });

  it("rolls back a service when its queue insert fails and does not update runtime state", async () => {
    const db = getDatabase();
    const before = structuredClone(getQueueStore());
    db.exec(`CREATE TRIGGER reject_new_queue BEFORE INSERT ON queues
      WHEN NEW.service_id = 'broken-service' BEGIN SELECT RAISE(ABORT, 'queue write failed'); END;`);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await create({ ...form, id: "broken-service" })).status).toBe(500);
      expect(serviceRepository.findById("broken-service")).toBeNull();
      expect(db.prepare("SELECT * FROM queues WHERE service_id = 'broken-service'").get()).toBeUndefined();
      expect(getQueueStore()).toEqual(before);
    } finally {
      db.exec("DROP TRIGGER reject_new_queue");
      log.mockRestore();
    }
  });
});
