import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { UserStore } from "../../src/lib/auth/user-store";
import { generateSalt, hashPassword } from "../../src/lib/auth/crypto";

describe("In-Memory UserStore", () => {
  let store: UserStore;

  beforeEach(() => {
    store = new UserStore();
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
