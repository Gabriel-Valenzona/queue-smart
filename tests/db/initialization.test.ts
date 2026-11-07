import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDatabaseConnection, databasePath, getDefaultDatabasePath, transaction, type Database } from "../../src/server/db/connection";
import { initSchema } from "../../src/server/db/schema";
import { ServiceRepository } from "../../src/server/db/repositories/service-repository";
import { UserProfileRepository } from "../../src/server/db/repositories/user-profile-repository";
import { seedQueues } from "../../src/server/queue/store";
import { seedNotifications } from "../../src/server/notifications/store";

let directory: string;
let file: string;
let db: Database | undefined;
beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "queuesmart-initialization-"));
  file = path.join(directory, "nested", "app.sqlite");
});
afterEach(() => {
  try { db?.close(); } finally {
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true, force: true });
  }
});
function reconnect(autoSeed: boolean) {
  db!.close();
  db = undefined;
  db = createDatabaseConnection(file, autoSeed);
}

it("applies every A4 table, view and required index without seeding or erasing existing records", () => {
  db = createDatabaseConnection(file, false);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
  expect(tables).toEqual([
    "notification_preferences", "notification_wait_baselines", "notifications", "queue_entries",
    "queues", "services", "user_credentials", "user_profiles",
  ].map(name => ({ name })));
  expect(db.prepare("SELECT * FROM users").all()).toEqual([]);
  expect(db.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
  expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all()).toEqual(expect.arrayContaining([
    { name: "queue_entries_one_waiting_per_user" }, { name: "queue_entries_position" },
    { name: "notifications_user_feed" }, { name: "notifications_user_unread" },
  ]));
  const service = new ServiceRepository(db).create({ id: "unseeded", name: "Custom", description: "Help", duration: 4, open: false });
  const schema = db.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY name").all();
  const queue = db.prepare("SELECT * FROM queues").all();
  initSchema(db);
  initSchema(db);
  expect(db.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY name").all()).toEqual(schema);
  expect(new ServiceRepository(db).findById(service.id)).toEqual(service);
  expect(db.prepare("SELECT * FROM queues").all()).toEqual(queue);
  reconnect(false);
  expect(new ServiceRepository(db!).listAll()).toEqual([service]);
  expect(db!.prepare("SELECT * FROM user_credentials").all()).toEqual([]);
  expect(db!.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});

it("seeds once on startup and retains saved service/profile edits and queue rows after reopening", () => {
  db = createDatabaseConnection(file);
  seedQueues(db);
  seedNotifications(db);
  expect(db.prepare("SELECT count(*) AS n FROM user_credentials").get()).toEqual({ n: 6 });
  expect(new UserProfileRepository(db).count()).toBe(6);
  expect(new ServiceRepository(db).count()).toBe(3);
  const service = new ServiceRepository(db).update("student-services", { name: "Saved service", open: false });
  const profile = new UserProfileRepository(db).update("alex@example.com", { fullName: "Saved Alex" });
  const queues = db.prepare("SELECT * FROM queues ORDER BY id").all();
  const entries = db.prepare("SELECT * FROM queue_entries ORDER BY id").all();
  reconnect(true);
  seedQueues(db!);
  seedNotifications(db!);
  expect(new ServiceRepository(db!).findById(service.id)).toEqual(service);
  expect(new UserProfileRepository(db!).findById(profile.id)).toEqual(profile);
  expect(db!.prepare("SELECT name FROM user_credentials WHERE id = ?").get(profile.userId)).toEqual({ name: "Saved Alex" });
  expect(db!.prepare("SELECT * FROM queues ORDER BY id").all()).toEqual(queues);
  expect(db!.prepare("SELECT * FROM queue_entries ORDER BY id").all()).toEqual(entries);
  expect(db!.prepare("SELECT count(*) AS n FROM notifications").get()).toEqual({ n: 3 });
  expect(db!.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
  expect(db!.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  expect(() => db!.prepare("DELETE FROM user_credentials WHERE id = ?").run("usr_alex_002")).toThrow(/FOREIGN KEY/);
});

it("rolls back a failed multi-table transaction and permits the next transaction to commit", () => {
  db = createDatabaseConnection(file, false);
  const service = new ServiceRepository(db).create({ id: "atomic", name: "Original", description: "Help", duration: 5, open: true });
  const queue = db.prepare("SELECT * FROM queues").all();
  expect(() => transaction(db!, () => {
    db!.prepare("UPDATE services SET name = ? WHERE id = ?").run("Should roll back", service.id);
    db!.prepare("UPDATE queues SET status = ? WHERE service_id = ?").run("paused", service.id);
  })).toThrow(/CHECK/);
  expect(new ServiceRepository(db).findById(service.id)).toEqual(service);
  expect(db.prepare("SELECT * FROM queues").all()).toEqual(queue);
  expect(transaction(db, () => {
    db!.prepare("UPDATE services SET name = ? WHERE id = ?").run("Committed", service.id);
    return "committed";
  })).toBe("committed");
  reconnect(false);
  expect(new ServiceRepository(db!).findById(service.id)?.name).toBe("Committed");
  expect(db!.prepare("SELECT * FROM queues").all()).toEqual(queue);
});

it("honors configured path precedence and wrapper defaults without opening the application database", () => {
  vi.stubEnv("DATABASE_PATH", path.join(directory, "fallback.sqlite"));
  vi.stubEnv("QUEUESMART_DB_PATH", file);
  expect(databasePath()).toBe(file);
  expect(getDefaultDatabasePath()).toBe(file);
  db = createDatabaseConnection(undefined, false);
  expect(db.prepare("SELECT * FROM services").all()).toEqual([]);
  vi.stubEnv("QUEUESMART_DB_PATH", undefined);
  expect(databasePath()).toBe(path.join(directory, "fallback.sqlite"));
  vi.stubEnv("DATABASE_PATH", undefined);
  expect(databasePath()).toBe(path.join(process.cwd(), "data", "queuesmart.sqlite"));
});
