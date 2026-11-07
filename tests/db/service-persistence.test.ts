import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { openDatabase, type Database } from "../../src/server/db/connection";
import { ServiceRepository } from "../../src/server/db/repositories/service-repository";
import { loadQueueStore } from "../../src/server/queue/store";

let directory: string;
let db: Database | undefined;
beforeEach(() => { directory = mkdtempSync(path.join(tmpdir(), "queuesmart-services-")); });
afterEach(() => {
  try { db?.close(); } finally { rmSync(directory, { recursive: true, force: true }); }
});
it("keeps a service and its empty queue across real file reconnection", () => {
  const file = path.join(directory, "services.sqlite");
  db = openDatabase(file);
  const created = new ServiceRepository(db).create({ id: "persistent-service", name: "Persistent", description: "Help", duration: 9, priority: "high", open: false });
  const queue = db.prepare("SELECT * FROM queues WHERE service_id = ?").get(created.id);
  db.close();
  db = undefined;
  db = openDatabase(file);
  expect(new ServiceRepository(db).findById(created.id)).toEqual(created);
  expect(db.prepare("SELECT * FROM queues WHERE service_id = ?").get(created.id)).toEqual(queue);
  const store = loadQueueStore(db, [created]);
  expect(store.services[0].open).toBe(false);
  expect(store.queues[created.id]).toEqual([]);
});
