import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { reconcileServiceAvailability } from "@/server/queue/repository";
import { applySchema, seedDatabase } from "./schema";

/** SQLite database for A4, using Node's built-in driver (Node 22.13+). */
export type Database = DatabaseSync;

/** `QUEUESMART_DB_PATH` or `DATABASE_PATH` overrides the file; tests use ":memory:". */
export function databasePath() {
  return (
    process.env.QUEUESMART_DB_PATH ??
    process.env.DATABASE_PATH ??
    path.join(process.cwd(), "data", "queuesmart.sqlite")
  );
}

export function getDefaultDatabasePath(): string {
  return databasePath();
}

export function openDatabase(file = databasePath(), autoSeed: boolean = true): Database {
  const isMemory = file === ":memory:";
  if (!isMemory) mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
  `);
  applySchema(db);

  if (autoSeed) {
    try {
      const userCount = (
        db.prepare("SELECT COUNT(*) as count FROM user_credentials").get() as { count: number }
      )?.count ?? 0;
      const serviceCount = (
        db.prepare("SELECT COUNT(*) as count FROM services").get() as { count: number }
      )?.count ?? 0;
      if (userCount === 0 || serviceCount === 0) {
        seedDatabase(db);
      }
    } catch {
      // Ignore if check fails
    }
  }

  reconcileServiceAvailability(db);
  return db;
}

export function createDatabaseConnection(location = databasePath(), autoSeed = true): Database {
  return openDatabase(location, autoSeed);
}

// Kept on globalThis so every route handler (and dev hot reloads) share one connection.
const globalForDb = globalThis as typeof globalThis & { __queueSmartDb?: Database };

export function getDatabase(): Database {
  globalForDb.__queueSmartDb ??= openDatabase();
  return globalForDb.__queueSmartDb;
}

/** Creates an in-memory database instance (ideal for unit testing). */
export function createTestDatabase(seed: boolean = true): Database {
  return openDatabase(":memory:", seed);
}

export function closeDatabase(): void {
  if (globalForDb.__queueSmartDb) {
    try {
      globalForDb.__queueSmartDb.close();
    } catch {
      // Ignored
    }
    delete globalForDb.__queueSmartDb;
  }
}

/** Runs `write` atomically: every statement commits, or none do. */
export function transaction<T>(db: Database, write: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = write();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** SQLite's extended result code, when `error` came from a failed statement. */
export function sqliteErrorCode(error: unknown): number | undefined {
  if (error instanceof Error && "errcode" in error && typeof error.errcode === "number")
    return error.errcode;
  return undefined;
}

export const SQLITE_CONSTRAINT_UNIQUE = 2067;
