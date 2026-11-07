import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { AuthService } from "../../src/lib/auth/auth-service";
import { UserStore } from "../../src/lib/auth/user-store";
import { openDatabase, type Database } from "../../src/server/db/connection";
import { UserProfileRepository } from "../../src/server/db/repositories/user-profile-repository";

let directory: string;
let file: string;
let db: Database | undefined;
beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "queuesmart-profiles-"));
  file = path.join(directory, "profiles.sqlite");
  db = openDatabase(file);
});
afterEach(() => {
  try { db?.close(); } finally { rmSync(directory, { recursive: true, force: true }); }
});
function reconnect() {
  db!.close();
  db = undefined;
  db = openDatabase(file);
}

it("persists profile edits and parent display names, optional clears and deletion across reconnections", async () => {
  const auth = new AuthService(new UserStore(() => db!));
  const original = (await auth.getUserProfile("usr_alex_002"))!;
  expect(await auth.getUserProfile(" ALEX@EXAMPLE.COM ")).toEqual(original);
  expect(await auth.getUserProfile("unknown-user")).toBeNull();
  const updated = await auth.updateUserProfile(original.email, { fullName: "Persistent Alex", contactInfo: "555-0100", preferences: { theme: "dark", language: "es-ES" } });
  const other = await auth.getUserProfile("usr_admin_001");
  reconnect();
  const store = new UserStore(() => db!);
  const fresh = new AuthService(store);
  expect(await fresh.getUserProfile(original.userId)).toEqual(updated);
  expect((await fresh.getUserById(original.userId))?.name).toBe("Persistent Alex");
  expect(await fresh.getUserProfile("usr_admin_001")).toEqual(other);
  expect(await fresh.getStore().listAllProfiles()).toContainEqual(updated);
  expect(store.getDatabase()).toBe(db);
  const cleared = await fresh.updateUserProfile(updated.id, { contactInfo: null, preferences: null });
  reconnect();
  const repo = new UserProfileRepository(db!);
  expect(repo.findById(updated.id)).toEqual(cleared);
  expect(repo.delete(updated.email)).toBe(true);
  reconnect();
  expect(new UserProfileRepository(db!).findById(updated.id)).toBeNull();
  expect(new UserProfileRepository(db!).findById(other!.id)).toEqual(other);
  expect(db!.prepare("SELECT name FROM user_credentials WHERE id = ?").get(original.userId)).toEqual({ name: "Persistent Alex" });
});
