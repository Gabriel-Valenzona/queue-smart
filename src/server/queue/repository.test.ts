import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type Database,
  databasePath,
  getDatabase,
  openDatabase,
  sqliteErrorCode,
  transaction,
} from "@/server/db/connection";
import { ServiceRepository } from "@/server/db/repositories/service-repository";
import { QueueError } from "./errors";
import {
  getParticipation,
  getQueue,
  joinQueue,
  leaveQueue,
  listQueues,
  moveEntry,
  serveNext,
  setQueueOpen,
} from "./queueService";
import { ensureQueue, readQueueState, saveLine } from "./repository";
import {
  getQueueStore,
  loadQueueStore,
  resetQueueStore,
  seedQueues,
  writeThrough,
  type QueueStore,
} from "./store";
import type { QueueService } from "./types";

const advising: QueueService = {
  id: "advising",
  name: "Advising",
  description: "Course help.",
  duration: 10,
  priority: "medium",
  open: true,
};

const clock = (time: string) => () => new Date(time);

/** Entries must belong to real accounts, so tests add the ones they use. */
function addUsers(database: Database, ...ids: string[]) {
  const insert = database.prepare(
    `INSERT INTO user_credentials
       (id, email, name, password_hash, salt, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'user', ?, ?)`,
  );
  for (const id of ids)
    insert.run(
      id,
      `${id}@example.com`,
      id,
      "a".repeat(128),
      "b".repeat(32),
      "2026-11-01T09:00:00Z",
      "2026-11-01T09:00:00Z",
    );
}

let db: Database;
let store: QueueStore;
beforeEach(() => {
  db = openDatabase(":memory:");
  addUsers(db, "a", "b", "c", "user-1", "user-2");
  new ServiceRepository(db).create({
    id: advising.id, name: advising.name, description: advising.description,
    duration: advising.duration, priority: advising.priority, open: advising.open,
  });
  store = loadQueueStore(db, [{ ...advising }]);
});
afterEach(() => db.close());

/** A fresh store over the same database, as after a server restart. */
const reload = (services: QueueService[] = [{ ...advising }]) =>
  loadQueueStore(db, services);

function join(userId: string, serviceId = "advising", time = "2026-11-01T10:00:00Z") {
  return joinQueue(
    store,
    serviceId,
    { userId, userName: userId.toUpperCase(), priority: "medium" },
    clock(time),
  ).entry;
}

function queueId(serviceId = "advising") {
  return (db.prepare("SELECT id FROM queues WHERE service_id = ?").get(serviceId) as { id: string })
    .id;
}

function insertEntry(values: Record<string, unknown>) {
  const row = {
    id: "entry-1",
    queue_id: queueId(),
    user_id: "user-1",
    user_name: "User",
    priority: "medium",
    position: 1,
    joined_at: "2026-11-01T10:00:00Z",
    status: "waiting",
    completed_at: null,
    service_name: null,
    ...values,
  };
  const columns = Object.keys(row);
  db.prepare(
    `INSERT INTO queue_entries (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
  ).run(...(Object.values(row) as (string | number | null)[]));
}

describe("queue table", () => {
  it("creates one queue per service with its status and created date", () => {
    const rows = db.prepare("SELECT * FROM queues").all() as Record<string, string>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ service_id: "advising", status: "open" });
    expect(Number.isNaN(Date.parse(rows[0].created_at))).toBe(false);
    expect(ensureQueue(db, advising)).toBe(rows[0].id);
    expect(db.prepare("SELECT count(*) AS n FROM queues").get()).toEqual({ n: 1 });
  });

  it("rejects a second queue for a service, an unknown status, and missing fields", () => {
    const insert = db.prepare(
      "INSERT INTO queues (id, service_id, status, created_at) VALUES (?, ?, ?, ?)",
    );
    expect(() => insert.run("q2", "advising", "open", "2026-11-01T10:00:00Z")).toThrow(/UNIQUE/);
    expect(() => insert.run("q3", "other", "paused", "2026-11-01T10:00:00Z")).toThrow(/CHECK/);
    expect(() => insert.run("q4", "other", "open", "not a date")).toThrow(/CHECK/);
    expect(() => insert.run("q5", null, "open", "2026-11-01T10:00:00Z")).toThrow(/NOT NULL/);
    expect(() => insert.run("q6", "x".repeat(65), "open", "2026-11-01T10:00:00Z")).toThrow(
      /CHECK/,
    );
  });

  it("persists opening and closing a queue", () => {
    setQueueOpen(store, "advising", false);
    expect(reload().services[0].open).toBe(false);
    setQueueOpen(store, "advising", true);
    expect(reload().services[0].open).toBe(true);
  });
});

describe("queue_entries table", () => {
  it("rejects missing required fields, wrong types, and over-long values", () => {
    expect(() => insertEntry({ user_id: null })).toThrow(/NOT NULL/);
    expect(() => insertEntry({ joined_at: null })).toThrow(/NOT NULL/);
    expect(() => insertEntry({ user_name: "   " })).toThrow(/CHECK/);
    expect(() => insertEntry({ user_name: "x".repeat(101) })).toThrow(/CHECK/);
    expect(() => insertEntry({ position: "first" })).toThrow(/cannot store TEXT/);
    expect(() => insertEntry({ position: 0 })).toThrow(/CHECK/);
    expect(() => insertEntry({ priority: "urgent" })).toThrow(/CHECK/);
    expect(() => insertEntry({ status: "skipped" })).toThrow(/CHECK/);
    expect(() => insertEntry({ joined_at: "yesterday" })).toThrow(/CHECK/);
  });

  it("requires an existing queue and an existing user", () => {
    expect(() => insertEntry({ queue_id: "missing" })).toThrow(/FOREIGN KEY/);
    expect(() => insertEntry({ user_id: "missing" })).toThrow(/FOREIGN KEY/);
  });

  it("does not let an account with queue visits be deleted", () => {
    join("a");
    expect(() => db.exec("DELETE FROM user_credentials WHERE id = 'a'")).toThrow(/FOREIGN KEY/);
  });

  it("keeps position, completion time, and service name consistent with the status", () => {
    expect(() => insertEntry({ position: null })).toThrow(/CHECK/);
    expect(() => insertEntry({ status: "served" })).toThrow(/CHECK/);
    expect(() =>
      insertEntry({
        status: "served",
        position: null,
        completed_at: "2026-11-01T10:05:00Z",
      }),
    ).toThrow(/CHECK/);
    insertEntry({
      status: "served",
      position: null,
      completed_at: "2026-11-01T10:05:00Z",
      service_name: "Advising",
    });
  });

  it("allows one waiting entry per place in line and per user", () => {
    insertEntry({});
    expect(() => insertEntry({ id: "entry-2", user_id: "user-2" })).toThrow(/UNIQUE/);
    expect(() => insertEntry({ id: "entry-2", position: 2 })).toThrow(/UNIQUE/);
    insertEntry({ id: "entry-2", user_id: "user-2", position: 2 });
  });

  it("saves joins in priority order with positions from 1", () => {
    join("a");
    joinQueue(store, "advising", { userId: "b", userName: "B", priority: "high" });
    join("c");
    const rows = db
      .prepare("SELECT user_id, position, status FROM queue_entries ORDER BY position")
      .all();
    expect(rows).toEqual([
      { user_id: "b", position: 1, status: "waiting" },
      { user_id: "a", position: 2, status: "waiting" },
      { user_id: "c", position: 3, status: "waiting" },
    ]);
    expect(getQueue(reload(), "advising").entries).toEqual(getQueue(store, "advising").entries);
  });

  it("marks served and canceled entries and renumbers the rest of the line", () => {
    const a = join("a");
    const b = join("b");
    join("c");
    serveNext(store, "advising", clock("2026-11-01T10:10:00Z"));
    leaveQueue(store, "advising", b.id, clock("2026-11-01T10:12:00Z"));

    const rows = db
      .prepare(
        "SELECT user_id, position, status, completed_at, service_name FROM queue_entries ORDER BY user_id",
      )
      .all();
    expect(rows).toEqual([
      {
        user_id: "a",
        position: null,
        status: "served",
        completed_at: "2026-11-01T10:10:00.000Z",
        service_name: "Advising",
      },
      {
        user_id: "b",
        position: null,
        status: "canceled",
        completed_at: "2026-11-01T10:12:00.000Z",
        service_name: "Advising",
      },
      { user_id: "c", position: 1, status: "waiting", completed_at: null, service_name: null },
    ]);

    const restarted = reload();
    expect(restarted.completed).toEqual(store.completed);
    expect(restarted.completed.map((record) => record.entryId)).toEqual([b.id, a.id]);
    expect(getParticipation(restarted, "a").lastCompleted?.outcome).toBe("served");
    expect(listQueues(restarted)).toEqual(listQueues(store));
  });

  it("saves administrator reordering", () => {
    join("a");
    const b = join("b");
    moveEntry(store, "advising", b.id, "up");
    expect(getQueue(reload(), "advising").entries.map((entry) => entry.userId)).toEqual([
      "b",
      "a",
    ]);
  });

  it("gives a newly created service a queue the first time it is used", () => {
    const tutoring = { ...advising, id: "tutoring", name: "Tutoring" };
    new ServiceRepository(db).create({ id: tutoring.id, name: tutoring.name, description: tutoring.description,
      duration: tutoring.duration, priority: tutoring.priority, open: tutoring.open });
    store.services.push(tutoring);
    join("a", "tutoring");
    expect(getQueue(reload([{ ...advising }, { ...tutoring }]), "tutoring").entries).toHaveLength(
      1,
    );
  });
});

describe("write-through failures", () => {
  it("reloads the store and reports a conflict when the database refuses a join", () => {
    // The user already waits in a queue this store does not show.
    new ServiceRepository(db).create({ id: "other", name: "Other", description: advising.description,
      duration: advising.duration, priority: advising.priority, open: advising.open });
    const other = loadQueueStore(db, [{ ...advising, id: "other", name: "Other" }]);
    joinQueue(other, "other", { userId: "a", userName: "A", priority: "medium" });
    join("b");

    expect(() => join("a")).toThrow(
      expect.objectContaining({ code: "already_in_queue", status: 409 }),
    );
    expect(getQueue(store, "advising").entries.map((entry) => entry.userId)).toEqual(["b"]);
    expect(getQueue(reload(), "advising").entries.map((entry) => entry.userId)).toEqual(["b"]);
  });

  it("reloads the store when an entry names an account that does not exist", () => {
    expect(() => join("nobody")).toThrow(/FOREIGN KEY/);
    expect(store.queues.advising).toEqual([]);
  });

  it("rolls back every statement and rethrows other database errors", () => {
    join("a");
    expect(() =>
      writeThrough(store, (database) => {
        database.prepare("UPDATE queues SET status = 'closed'").run();
        database.prepare("UPDATE queues SET status = 'paused'").run();
      }),
    ).toThrow(/CHECK/);
    expect(reload().services[0].open).toBe(true);
    expect(store.queues.advising).toHaveLength(1);
  });

  it("refuses to save a line that no longer matches the stored one", () => {
    join("a");
    expect(() => transaction(db, () => saveLine(db, advising, []))).toThrow(/no longer matches/);
    const record = {
      entryId: "missing",
      serviceId: "advising",
      serviceName: "Advising",
      userId: "x",
      userName: "X",
      joinedAt: "2026-11-01T10:00:00Z",
      completedAt: "2026-11-01T10:05:00Z",
      outcome: "served" as const,
    };
    expect(() => transaction(db, () => saveLine(db, advising, [], record))).toThrow(
      /is not waiting/,
    );
    expect(readQueueState(db, [advising]).queues.advising).toHaveLength(1);
  });

  it("restores the line and history when a completion write fails", () => {
    join("a");
    join("b");
    const before = structuredClone(store);
    const rows = db.prepare("SELECT * FROM queue_entries ORDER BY id").all();
    db.exec(`CREATE TRIGGER reject_completion BEFORE UPDATE ON queue_entries
      WHEN NEW.status = 'served' BEGIN SELECT RAISE(ABORT, 'completion failed'); END;`);
    try {
      expect(() => serveNext(store, "advising")).toThrow(/completion failed/);
      expect(store).toEqual(before);
      expect(db.prepare("SELECT * FROM queue_entries ORDER BY id").all()).toEqual(rows);
      expect(reload()).toEqual(before);
    } finally {
      db.exec("DROP TRIGGER reject_completion");
    }
  });

  it("does not translate errors that are not SQLite errors", () => {
    expect(sqliteErrorCode(new Error("plain"))).toBeUndefined();
    expect(sqliteErrorCode("text")).toBeUndefined();
    expect(() =>
      writeThrough(store, () => {
        throw new QueueError("queue_empty", "Nothing to do.");
      }),
    ).toThrow(QueueError);
  });
});

describe("seeding and restarts", () => {
  it("seeds the demo queues once, and keeps later changes", () => {
    const seeded = openDatabase(":memory:");
    try {
      seedQueues(seeded);
      const first = loadQueueStore(seeded);
      expect(getQueue(first, "student-services").entries.map((entry) => entry.id)).toEqual([
        "seed-1",
        "seed-2",
        "seed-3",
      ]);
      serveNext(first, "student-services");
      seedQueues(seeded);
      const second = loadQueueStore(seeded);
      expect(getQueue(second, "student-services").entries).toHaveLength(2);
      expect(second.services.find((service) => service.id === "academic-advising")?.open).toBe(false);
      expect(seeded.prepare("SELECT count(*) AS n FROM user_credentials").get()).toEqual({ n: 6 });
    } finally {
      seeded.close();
    }
  });

  it("keeps queue data in the database file across connections", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "queuesmart-"));
    const file = path.join(dir, "nested", "queues.sqlite");
    try {
      const firstDb = openDatabase(file);
      let entry;
      try {
        addUsers(firstDb, "a");
        new ServiceRepository(firstDb).create({ id: advising.id, name: advising.name, description: advising.description,
          duration: advising.duration, priority: advising.priority, open: advising.open });
        const first = loadQueueStore(firstDb, [{ ...advising }]);
        entry = joinQueue(first, "advising", {
          userId: "a",
          userName: "A",
          priority: "low",
        }).entry;
      } finally {
        firstDb.close();
      }

      const secondDb = openDatabase(file);
      try {
        const second = loadQueueStore(secondDb, [{ ...advising }]);
        expect(second.queues.advising).toEqual([
          {
            id: entry.id,
            serviceId: "advising",
            userId: "a",
            userName: "A",
            priority: "low",
            joinedAt: entry.joinedAt,
          },
        ]);
      } finally {
        secondDb.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("retains reordered positions and served/canceled outcomes across a real reconnection", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "queuesmart-outcomes-"));
    const file = path.join(directory, "outcomes.sqlite");
    let connection: Database | undefined;
    try {
      connection = openDatabase(file);
      addUsers(connection, "a", "b", "c");
      new ServiceRepository(connection).create(advising);
      const initial = loadQueueStore(connection);
      const a = joinQueue(initial, "advising", { userId: "a", userName: "A", priority: "medium" }, clock("2026-11-06T12:00:00Z")).entry;
      const b = joinQueue(initial, "advising", { userId: "b", userName: "B", priority: "high" }, clock("2026-11-06T12:01:00Z")).entry;
      const c = joinQueue(initial, "advising", { userId: "c", userName: "C", priority: "medium" }, clock("2026-11-06T12:02:00Z")).entry;
      expect(initial.queues.advising.map(entry => entry.id)).toEqual([b.id, a.id, c.id]);
      moveEntry(initial, "advising", c.id, "up");
      expect(initial.queues.advising.map(entry => entry.id)).toEqual([b.id, c.id, a.id]);
      serveNext(initial, "advising", clock("2026-11-06T13:00:00Z"));
      leaveQueue(initial, "advising", c.id, clock("2026-11-06T13:01:00Z"));
      const before = structuredClone(initial);
      const persisted = connection.prepare("SELECT * FROM queue_entries ORDER BY id").all();
      connection.close();
      connection = undefined;
      connection = openDatabase(file);
      const fresh = loadQueueStore(connection);
      expect(fresh).toEqual(before);
      expect(connection.prepare("SELECT * FROM queue_entries ORDER BY id").all()).toEqual(persisted);
      expect(getQueue(fresh, "advising").entries).toMatchObject([{ id: a.id, userId: "a", position: 1 }]);
      expect(fresh.completed).toMatchObject([{ entryId: c.id, outcome: "canceled" }, { entryId: b.id, outcome: "served" }]);
      joinQueue(fresh, "advising", { userId: "b", userName: "B", priority: "low" });
      expect(fresh.queues.advising).toHaveLength(2);
      expect(fresh.completed).toEqual(before.completed);
      expect(connection.prepare("SELECT status, position FROM queue_entries WHERE id = ?").get(b.id)).toEqual({ status: "served", position: null });
    } finally {
      try { connection?.close(); } finally { rmSync(directory, { recursive: true, force: true }); }
    }
  });

});

describe("shared connection", () => {
  it("uses the configured path, falling back to data/queuesmart.sqlite", () => {
    expect(databasePath()).toBe(":memory:");
    const saved = process.env.QUEUESMART_DB_PATH;
    delete process.env.QUEUESMART_DB_PATH;
    try {
      expect(databasePath()).toBe(path.join(process.cwd(), "data", "queuesmart.sqlite"));
    } finally {
      process.env.QUEUESMART_DB_PATH = saved;
    }
  });

  it("restores the seeded queues and removes everything else on reset", () => {
    const shared = resetQueueStore();
    serveNext(shared, "student-services");
    expect(getDatabase().prepare("SELECT count(*) AS n FROM queue_entries WHERE status <> 'waiting'").get()).toEqual({ n: 1 });
    const fresh = resetQueueStore();
    expect(fresh).toBe(getQueueStore());
    expect(fresh.completed).toEqual([]);
    expect(getQueue(fresh, "student-services").entries).toHaveLength(3);
  });
});
