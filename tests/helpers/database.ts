import { afterEach } from "vitest";
import { openDatabase, type Database } from "../../src/server/db/connection";

const connections: Database[] = [];
export function memoryDatabase(): Database {
  const db = openDatabase(":memory:");
  connections.push(db);
  return db;
}
afterEach(() => {
  for (const db of connections.splice(0)) db.close();
});
