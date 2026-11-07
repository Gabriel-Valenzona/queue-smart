import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthService } from "../../src/lib/auth/auth-service";
import { UserStore } from "../../src/lib/auth/user-store";
import { verifyPassword } from "../../src/lib/auth/crypto";
import { openDatabase, type Database } from "../../src/server/db/connection";
import { UserRepository } from "../../src/server/db/repositories/user-repository";
import { UserProfileRepository } from "../../src/server/db/repositories/user-profile-repository";

let directory: string;
let file: string;
let db: Database | undefined;
beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "queuesmart-auth-persistence-"));
  file = path.join(directory, "accounts.sqlite");
  db = openDatabase(file, false);
});
afterEach(() => {
  try { db?.close(); } finally { rmSync(directory, { recursive: true, force: true }); }
});
function reconnect() {
  db!.close();
  db = undefined;
  db = openDatabase(file, false);
}
const account = { name: "Repository User", email: "repo@example.com", role: "user" as const, passwordHash: "a".repeat(128), salt: "b".repeat(32) };

describe("credential persistence", () => {
  it("persists normalized registration, protected credentials, profile and login across connections", async () => {
    const password = "PersistentPassword123!";
    const auth = new AuthService(new UserStore(() => db!));
    const result = await auth.registerUser({ name: "Persistent User", email: "  Persist@Example.com ", password, confirmPassword: password,
      contactInfo: "  +1 713-555-0100  ", preferences: { theme: "dark", language: "en-US" } });
    expect(result.statusCode).toBe(201);
    expect(result.user).toMatchObject({ email: "persist@example.com", name: "Persistent User", role: "user" });
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.user).not.toHaveProperty("salt");
    const row = db!.prepare("SELECT * FROM user_credentials WHERE id = ?").get(result.user!.id) as Record<string, string>;
    expect(row.password_hash).toMatch(/^[a-f0-9]{128}$/);
    expect(row.salt).toMatch(/^[a-f0-9]{16,}$/);
    expect(verifyPassword(password, row.password_hash, row.salt)).toBe(true);
    expect(JSON.stringify(row)).not.toContain(password);
    const profile = new UserProfileRepository(db!).findByUserId(result.user!.id);
    expect(profile).toMatchObject({ email: "persist@example.com", fullName: "Persistent User", contactInfo: "+1 713-555-0100", preferences: { theme: "dark", language: "en-US" } });
    const storedPreferences = db!.prepare("SELECT preferences FROM user_profiles WHERE user_id = ?").get(result.user!.id) as { preferences: string };
    expect(JSON.parse(storedPreferences.preferences)).toEqual(profile!.preferences);
    const count = new UserRepository(db!).count();
    reconnect();
    const freshStore = new UserStore(() => db!);
    const freshAuth = new AuthService(freshStore);
    expect(new UserProfileRepository(db!).findByUserId(result.user!.id)).toEqual(profile);
    expect((await freshAuth.authenticateUser({ email: " PERSIST@example.com ", password })).user).toEqual(result.user);
    expect((await freshAuth.authenticateUser({ email: "persist@example.com", password: "WrongPassword123!" })).statusCode).toBe(401);
    expect((await freshAuth.registerUser({ email: "PERSIST@EXAMPLE.COM", password })).statusCode).toBe(409);
    expect(await freshStore.count()).toBe(count);
  });

  it("maps repository accounts and associated default profiles without losing values on reconnect", () => {
    const repo = new UserRepository(db!);
    expect(repo.count()).toBe(0);
    expect(repo.findById("missing")).toBeNull();
    expect(repo.findByEmail("missing@example.com")).toBeNull();
    const created = repo.create({ ...account, email: "  REPO@example.com  " });
    expect(created.id).toMatch(/^usr_/);
    expect(repo.count()).toBe(1);
    expect(repo.listAll()).toEqual([created]);
    const profile = new UserProfileRepository(db!).findByUserId(created.id);
    expect(profile).toMatchObject({ email: "repo@example.com", fullName: account.name, contactInfo: null,
      preferences: { emailNotifications: true, smsNotifications: false, theme: "system" } });
    expect(() => repo.create({ ...account, email: " REPO@EXAMPLE.COM " })).toThrow(/UNIQUE/);
    expect(repo.count()).toBe(1);
    expect(new UserProfileRepository(db!).count()).toBe(1);
    reconnect();
    const fresh = new UserRepository(db!);
    expect(fresh.findById(created.id)).toEqual(created);
    expect(fresh.findByEmail(" REPO@EXAMPLE.COM ")).toEqual(created);
    expect(new UserProfileRepository(db!).findByUserId(created.id)).toEqual(profile);
  });

  it("seeds real protected accounts and profiles idempotently, then resets its tables", () => {
    const repo = new UserRepository(db!);
    repo.seed();
    const initial = repo.listAll();
    expect(initial).toHaveLength(6);
    expect(new UserProfileRepository(db!).count()).toBe(6);
    expect(verifyPassword("Admin123!", initial[0].passwordHash, initial[0].salt)).toBe(true);
    repo.seed();
    expect(repo.listAll()).toEqual(initial);
    expect(new UserProfileRepository(db!).count()).toBe(6);
    repo.reset();
    expect(repo.count()).toBe(0);
    expect(repo.listAll()).toEqual([]);
    expect(new UserProfileRepository(db!).count()).toBe(0);
    reconnect();
    expect(new UserRepository(db!).count()).toBe(0);
  });
});
