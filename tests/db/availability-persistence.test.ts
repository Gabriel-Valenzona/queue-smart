import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getDatabase, openDatabase, type Database } from "../../src/server/db/connection";
import { ServiceRepository } from "../../src/server/db/repositories/service-repository";
import { createSeedStore, loadQueueStore, seedQueues, syncQueueServices } from "../../src/server/queue/store";
import { joinQueue, serveNext, setQueueOpen } from "../../src/server/queue/queueService";

let directory: string;
let db: Database | undefined;
let file: string;
beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "queuesmart-availability-"));
  file = path.join(directory, "app.sqlite");
  db = openDatabase(file);
});
afterEach(() => {
  try { db?.close(); } finally { rmSync(directory, { recursive: true, force: true }); }
});
function reconnect() {
  db!.close();
  db = undefined;
  db = openDatabase(file);
  return db;
}

it.each(["service", "queue"])("persists both availability directions through %s operations and reconnection", path => {
  const created = new ServiceRepository(db!).create({ id: "custom", name: "Custom", description: "Help", duration: 5, open: true });
  let store = loadQueueStore(db!);
  joinQueue(store, created.id, { userId: "usr_admin_001", userName: "Admin", priority: "medium" });
  serveNext(store, created.id);
  const history = structuredClone(store.completed);
  for (const open of [false, true]) {
    if (path === "queue") setQueueOpen(store, created.id, open);
    else new ServiceRepository(db!).setOpen(created.id, open);
    reconnect();
    store = loadQueueStore(db!);
    expect(new ServiceRepository(db!).findById(created.id)?.open).toBe(open);
    expect(store.services.find(s => s.id === created.id)?.open).toBe(open);
    expect(db!.prepare("SELECT status FROM queues WHERE service_id = ?").get(created.id)).toEqual({ status: open ? "open" : "closed" });
    expect(store.completed).toEqual(history);
  }
});

it("reconciles old mismatches to queue status on connection initialization, preserving queues and entries", () => {
  seedQueues(db!);
  const queues = db!.prepare("SELECT * FROM queues ORDER BY id").all();
  const entries = db!.prepare("SELECT * FROM queue_entries ORDER BY id").all();
  db!.exec("UPDATE services SET open = 1 - open");
  reconnect();
  expect(db!.prepare(`SELECT s.id FROM services s JOIN queues q ON q.service_id = s.id
    WHERE s.open <> CASE q.status WHEN 'open' THEN 1 ELSE 0 END`).all()).toEqual([]);
  expect(db!.prepare("SELECT * FROM queues ORDER BY id").all()).toEqual(queues);
  expect(db!.prepare("SELECT * FROM queue_entries ORDER BY id").all()).toEqual(entries);
  expect(loadQueueStore(db!).services.find(s => s.id === "academic-advising")?.open).toBe(false);
});

it("keeps in-memory stores independent of persisted custom services and availability", () => {
  const global = getDatabase();
  new ServiceRepository(global).create({ id: "global-custom", name: "Global", description: "Help", duration: 1 });
  const before = global.prepare("SELECT * FROM services ORDER BY id").all();
  const store = createSeedStore();
  expect(store.services).toHaveLength(3);
  setQueueOpen(store, "student-services", false);
  syncQueueServices(store);
  expect(store.services.find(s => s.id === "student-services")?.open).toBe(false);
  expect(global.prepare("SELECT * FROM services ORDER BY id").all()).toEqual(before);
  expect(new ServiceRepository(db!).findById("global-custom")).toBeNull();
});

it("uses one availability transaction and a read-only runtime refresh on the same connection", () => {
  const store = loadQueueStore(db!);
  const sql = vi.spyOn(db!, "exec");
  try {
    new ServiceRepository(db!).setOpen("student-services", false);
    syncQueueServices(store);
    expect(store.services.find(s => s.id === "student-services")?.open).toBe(false);
    expect(sql.mock.calls.filter(([statement]) => statement === "BEGIN IMMEDIATE")).toHaveLength(1);
    sql.mockClear();
    setQueueOpen(store, "student-services", true);
    expect(new ServiceRepository(db!).findById("student-services")?.open).toBe(true);
    expect(sql.mock.calls.filter(([statement]) => statement === "BEGIN IMMEDIATE")).toHaveLength(1);
  } finally {
    sql.mockRestore();
  }
});
