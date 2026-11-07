import { describe, it, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DuplicateEmailError, UserStore } from "../../src/lib/auth/user-store";
import { memoryDatabase } from "../helpers/database";
import { openDatabase } from "../../src/server/db/connection";
import { generateSalt, hashPassword } from "../../src/lib/auth/crypto";

describe("UserStore", () => {
  let store: UserStore;

  beforeEach(() => {
    store = new UserStore(() => memoryDatabase());
  });

  it("should initialize with default pre-seeded users", async () => {
    const count = await store.count();
    assert.ok(count >= 2, "Expected at least 2 seeded users (admin and user)");

    const admin = await store.findByEmail("admin@queuesmart.com");
    assert.ok(admin);
    assert.equal(admin.role, "admin");

    const user = await store.findByEmail("alex@example.com");
    assert.ok(user);
    assert.equal(user.role, "user");
  });

  it("should find users case-insensitively", async () => {
    const userLower = await store.findByEmail("admin@queuesmart.com");
    const userUpper = await store.findByEmail("ADMIN@QUEUESMART.COM");
    const userMixed = await store.findByEmail("  Admin@QueueSmart.Com  ");

    assert.ok(userLower);
    assert.ok(userUpper);
    assert.ok(userMixed);
    assert.equal(userLower.id, userUpper.id);
    assert.equal(userLower.id, userMixed.id);
  });

  it("should return null for non-existent email or ID", async () => {
    const nonExistentEmail = await store.findByEmail("nobody@nowhere.com");
    assert.equal(nonExistentEmail, null);

    const nonExistentId = await store.findById("usr_fake_9999");
    assert.equal(nonExistentId, null);
  });

  it("should create and retrieve a new user record", async () => {
    const salt = generateSalt();
    const hash = hashPassword("TestPass123!", salt);

    const created = await store.create({
      name: "Morgan Patel",
      email: "morgan.patel@example.com",
      role: "user",
      passwordHash: hash,
      salt,
    });

    assert.ok(created.id.startsWith("usr_"));
    assert.equal(created.name, "Morgan Patel");
    assert.equal(created.email, "morgan.patel@example.com");
    assert.equal(created.role, "user");
    assert.ok(created.createdAt);
    assert.ok(created.updatedAt);

    const foundById = await store.findById(created.id);
    assert.ok(foundById);
    assert.equal(foundById.name, "Morgan Patel");

    const foundByEmail = await store.findByEmail("morgan.patel@example.com");
    assert.ok(foundByEmail);
    assert.equal(foundByEmail.id, created.id);
  });

  it("should reset all entries when requested", async () => {
    store.reset();
    const count = await store.count();
    assert.equal(count, 0);

    const admin = await store.findByEmail("admin@queuesmart.com");
    assert.equal(admin, null);

    // Re-seed
    store.seedDefaultUsers();
    const restoredCount = await store.count();
    assert.ok(restoredCount > 0);
  });

  it("should list all users without mutating internal state", async () => {
    const users = await store.listAll();
    assert.ok(Array.isArray(users));
    assert.ok(users.length > 0);

    // Verify copy protection
    users[0].name = "Mutated Name";
    const freshUser = await store.findById(users[0].id);
    assert.notEqual(freshUser?.name, "Mutated Name");
  });
});

describe("user_credentials table", () => {
  const hash = "a".repeat(128);
  const salt = "b".repeat(32);
  const account = { name: "Sam", email: "sam@example.com", role: "user" as const, passwordHash: hash, salt };

  function insert(db: ReturnType<typeof openDatabase>, values: Record<string, unknown>) {
    const row = {
      id: "usr_1",
      email: "sam@example.com",
      name: "Sam",
      password_hash: hash,
      salt,
      role: "user",
      created_at: "2026-11-01T09:00:00Z",
      updated_at: "2026-11-01T09:00:00Z",
      ...values,
    };
    const columns = Object.keys(row);
    db.prepare(
      `INSERT INTO user_credentials (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    ).run(...(Object.values(row) as (string | Uint8Array | null)[]));
  }

  it("stores only a password hash, never the password", async () => {
    const db = memoryDatabase();
    const store = new UserStore(() => db);
    await store.count();
    const rows = db.prepare("SELECT * FROM user_credentials").all() as Record<string, string>[];
    assert.equal(rows.length, 6);
    for (const row of rows) {
      assert.match(row.password_hash, /^[0-9a-f]{128}$/);
      assert.ok(!JSON.stringify(row).includes("123!"));
    }
  });

  it("rejects a plain-text password, even from code that skips validation", () => {
    const db = memoryDatabase();
    assert.throws(() => insert(db, { password_hash: "User123!" }), /CHECK/);
    assert.throws(() => insert(db, { password_hash: "Z".repeat(128) }), /CHECK/);
    assert.throws(() => insert(db, { password_hash: null }), /NOT NULL/);
  });

  it("enforces required fields, types, lengths, and roles", () => {
    const db = memoryDatabase();
    assert.throws(() => insert(db, { email: null }), /NOT NULL/);
    assert.throws(() => insert(db, { name: null }), /NOT NULL/);
    assert.throws(() => insert(db, { name: "   " }), /CHECK/);
    assert.throws(() => insert(db, { name: "x".repeat(101) }), /CHECK/);
    assert.throws(() => insert(db, { email: `${"x".repeat(250)}@a.co` }), /CHECK/);
    assert.throws(() => insert(db, { email: "not-an-email" }), /CHECK/);
    assert.throws(() => insert(db, { email: "Upper@Example.com" }), /CHECK/);
    assert.throws(() => insert(db, { role: "owner" }), /CHECK/);
    assert.throws(() => insert(db, { salt: "short" }), /CHECK/);
    assert.throws(() => insert(db, { created_at: "yesterday" }), /CHECK/);
    assert.throws(() => insert(db, { id: new Uint8Array([1]) }), /cannot store BLOB/);
    insert(db, {});
  });

  it("refuses a second account for an email, whatever its case", async () => {
    const store = new UserStore(() => memoryDatabase());
    await store.create(account);
    await assert.rejects(store.create({ ...account, email: "  SAM@example.com " }), DuplicateEmailError);
    await assert.rejects(store.create({ ...account, email: "alex@example.com" }), DuplicateEmailError);
  });

  it("rethrows database errors other than a taken email", async () => {
    const store = new UserStore(() => memoryDatabase());
    await assert.rejects(store.create({ ...account, passwordHash: "plain text" }), /CHECK/);
  });

  it("keeps registered accounts across connections, and seeds only once", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "queuesmart-users-"));
    try {
      const file = path.join(dir, "users.sqlite");
      const firstDb = openDatabase(file);
      let created;
      let count;
      try {
        created = await new UserStore(() => firstDb).create(account);
        count = await new UserStore(() => firstDb).count();
      } finally {
        firstDb.close();
      }

      const secondDb = openDatabase(file);
      try {
        const second = new UserStore(() => secondDb);
        assert.deepEqual(await second.findById(created.id), created);
        assert.equal(await second.count(), count);
      } finally {
        secondDb.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
