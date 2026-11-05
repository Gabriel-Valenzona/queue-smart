import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { applySchema } from "./schema";

/** SQLite database for A4, using Node's built-in driver (Node 22.13+). */
export type Database = DatabaseSync;

/** `QUEUESMART_DB_PATH` overrides the file; tests use ":memory:". */
export function databasePath() {
  return (
    process.env.QUEUESMART_DB_PATH ??
    path.join(process.cwd(), "data", "queuesmart.sqlite")
  );
}

export function openDatabase(file = databasePath()): Database {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
  `);
  applySchema(db);
  return db;
}

// Kept on globalThis so every route handler (and dev hot reloads) share one connection.
const globalForDb = globalThis as typeof globalThis & { __queueSmartDb?: Database };

export function getDatabase(): Database {
  globalForDb.__queueSmartDb ??= openDatabase();
  return globalForDb.__queueSmartDb;
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
