import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  createTestDatabase,
  UserProfileRepository,
  UserRepository,
} from "../../src/server/db";
import { generateSalt, hashPassword } from "../../src/lib/auth/crypto";

describe("Area 2: UserProfile Repository", () => {
  let db: DatabaseSync;
  let userRepo: UserRepository;
  let profileRepo: UserProfileRepository;

  beforeEach(() => {
    db = createTestDatabase(true);
    userRepo = new UserRepository(db);
    profileRepo = new UserProfileRepository(db);
  });

  afterEach(() => db.close());

  it("should retrieve seeded user profiles by email case-insensitively", () => {
    const profile = profileRepo.findByEmail("admin@queuesmart.com");
    assert.ok(profile);
    assert.equal(profile.fullName, "QueueSmart Administrator");
    assert.equal(profile.email, "admin@queuesmart.com");
    assert.equal(profile.contactInfo, "+1 (713) 743-2255");
    assert.ok(profile.preferences);
    assert.equal(profile.preferences.emailNotifications, true);
    assert.equal(profile.preferences.theme, "dark");

    const profileUpper = profileRepo.findByEmail("ADMIN@QUEUESMART.COM");
    assert.ok(profileUpper);
    assert.equal(profileUpper.id, profile.id);
  });

  it("should retrieve user profiles by user ID", () => {
    const profile = profileRepo.findByUserId("usr_alex_002");
    assert.ok(profile);
    assert.equal(profile.fullName, "Alex Morgan");
    assert.equal(profile.email, "alex@example.com");
    assert.equal(profile.contactInfo, "+1 (713) 555-0199");
    assert.equal(profile.preferences?.smsNotifications, true);
  });

  it("should create a new user profile with all required and optional fields", () => {
    const salt = generateSalt();
    const hash = hashPassword("JamiePass123!", salt);

    const user = userRepo.create({
      name: "Jamie Vance",
      email: "jamie.vance@example.com",
      role: "user",
      passwordHash: hash,
      salt: salt,
      contactInfo: "Cell: +1 713-111-2222",
      preferences: {
        emailNotifications: false,
        smsNotifications: true,
        theme: "light",
      },
    });

    const profile = profileRepo.findByEmail("jamie.vance@example.com");
    assert.ok(profile);
    assert.equal(profile.userId, user.id);
    assert.equal(profile.email, "jamie.vance@example.com");
    assert.equal(profile.fullName, "Jamie Vance");
    assert.equal(profile.contactInfo, "Cell: +1 713-111-2222");
    assert.deepEqual(profile.preferences, {
      emailNotifications: false,
      smsNotifications: true,
      theme: "light",
    });
  });

  it("should handle optional contact information as null when not provided", () => {
    const salt = generateSalt();
    const hash = hashPassword("NoContact123!", salt);

    const user = userRepo.create({
      name: "No Contact User",
      email: "nocontact@example.com",
      role: "user",
      passwordHash: hash,
      salt: salt,
      contactInfo: null,
      preferences: null,
    });

    const profile = profileRepo.findByEmail("nocontact@example.com");
    assert.ok(profile);
    assert.equal(profile.userId, user.id);
    assert.equal(profile.fullName, "No Contact User");
    assert.equal(profile.contactInfo, null);
    assert.equal(profile.preferences, null);
  });

  it("should update full name, contact information, and preferences", () => {
    const updated = profileRepo.update("alex@example.com", {
      fullName: "Alexandria Morgan",
      contactInfo: "+1 (832) 999-8888",
      preferences: {
        emailNotifications: false,
        smsNotifications: true,
        theme: "dark",
        language: "es-ES",
      },
    });

    assert.equal(updated.fullName, "Alexandria Morgan");
    assert.equal(updated.contactInfo, "+1 (832) 999-8888");
    assert.equal(updated.preferences?.theme, "dark");
    assert.equal(updated.preferences?.language, "es-ES");

    // Verify parent users table name was also updated
    const user = userRepo.findByEmail("alex@example.com");
    assert.equal(user?.name, "Alexandria Morgan");
  });

  it("should delete user profile by ID", () => {
    const profile = profileRepo.findByEmail("user@queuesmart.com");
    assert.ok(profile);

    const deleted = profileRepo.delete(profile.id);
    assert.equal(deleted, true);

    const after = profileRepo.findByEmail("user@queuesmart.com");
    assert.equal(after, null);
  });

  it("should list all user profiles", () => {
    const list = profileRepo.listAll();
    assert.ok(list.length >= 3);
    const emails = list.map((p) => p.email);
    assert.ok(emails.includes("admin@queuesmart.com"));
    assert.ok(emails.includes("alex@example.com"));
  });
  it("finds profile IDs, handles missing records, and reports actual counts", () => {
    const profile = profileRepo.findByEmail("alex@example.com")!;
    assert.deepEqual(profileRepo.findById(profile.id), profile);
    assert.equal(profileRepo.findById("missing"), null);
    assert.equal(profileRepo.findByUserId("missing"), null);
    assert.equal(profileRepo.findByEmail("missing@example.com"), null);
    assert.equal(profileRepo.delete("missing"), false);
    assert.throws(() => profileRepo.update("missing", { fullName: "Unknown" }), /not found/);
    assert.equal(profileRepo.count(), profileRepo.listAll().length);
  });

  it("preserves omitted optional fields and explicitly clears contact/preferences", () => {
    const before = profileRepo.findByEmail("alex@example.com")!;
    const partial = profileRepo.update(before.id, { fullName: "  Alexandria  " });
    assert.equal(partial.fullName, "Alexandria");
    assert.equal(partial.contactInfo, before.contactInfo);
    assert.deepEqual(partial.preferences, before.preferences);
    const cleared = profileRepo.update(before.id, { contactInfo: null, preferences: null });
    assert.equal(cleared.fullName, "Alexandria");
    assert.equal(cleared.contactInfo, null);
    assert.equal(cleared.preferences, null);
    assert.deepEqual({ ...db.prepare("SELECT contact_info, preferences FROM user_profiles WHERE id = ?").get(before.id) as object }, { contact_info: null, preferences: null });
  });

  it("serializes object and legacy string preferences and tolerates corrupt stored JSON", () => {
    const profile = profileRepo.findByEmail("alex@example.com")!;
    for (const [input, expected] of [
      [{ theme: "dark", nested: { locale: "en-US" } }, { theme: "dark", nested: { locale: "en-US" } }],
      ['{"theme":"light"}', { theme: "light" }],
      ["legacy setting", { custom: "legacy setting" }],
    ] as const) {
      const updated = profileRepo.update(profile.id, { preferences: input });
      assert.deepEqual(updated.preferences, expected);
      const row = db.prepare("SELECT preferences FROM user_profiles WHERE id = ?").get(profile.id) as { preferences: string };
      assert.deepEqual(JSON.parse(row.preferences), expected);
    }
    db.prepare("UPDATE user_profiles SET preferences = ? WHERE id = ?").run("{broken", profile.id);
    assert.equal(profileRepo.findById(profile.id)?.preferences, null);
  });

  it("upserts an existing profile without changing its identity or creation date", () => {
    const before = profileRepo.findByEmail("alex@example.com")!;
    const updatedAt = "2026-11-06T12:00:00.000Z";
    const count = profileRepo.count();
    const updated = profileRepo.upsert({ userId: before.userId, email: " ALEX@EXAMPLE.COM ", fullName: "Alex Updated", contactInfo: "  555-0100  ", preferences: { theme: "light" }, updatedAt });
    assert.equal(updated.id, before.id);
    assert.equal(updated.createdAt, before.createdAt);
    assert.equal(updated.updatedAt, updatedAt);
    assert.equal(updated.contactInfo, "555-0100");
    assert.equal(profileRepo.count(), count);
    assert.equal(userRepo.findById(before.userId)?.name, "Alex Updated");
  });

  it("enforces both implemented parent references and unique email on direct profile creation", () => {
    const original = profileRepo.findByEmail("alex@example.com")!;
    profileRepo.delete(original.id);
    const input = { userId: original.userId, email: original.email, fullName: "Alex" };
    assert.throws(() => profileRepo.create({ ...input, userId: "missing-user" }), /FOREIGN KEY/);
    assert.throws(() => profileRepo.create({ ...input, email: "missing@example.com" }), /FOREIGN KEY/);
    const created = profileRepo.upsert(input);
    assert.ok(created.id.startsWith("prof_"));
    assert.equal(created.contactInfo, null);
    assert.equal(created.preferences, null);
    assert.throws(() => profileRepo.create(input), /UNIQUE/);
    assert.equal(profileRepo.findByUserId(original.userId)?.id, created.id);
  });

  it("cascades parent email changes and deletes without removing other profiles", () => {
    const profile = profileRepo.findByEmail("alex@example.com")!;
    const other = profileRepo.findByEmail("admin@queuesmart.com");
    db.prepare("UPDATE user_credentials SET email = ? WHERE id = ?").run("updated-alex@example.com", profile.userId);
    assert.equal(profileRepo.findByEmail("alex@example.com"), null);
    assert.equal(profileRepo.findById(profile.id)?.email, "updated-alex@example.com");
    db.prepare("DELETE FROM user_credentials WHERE id = ?").run(profile.userId);
    assert.equal(profileRepo.findById(profile.id), null);
    assert.deepEqual(profileRepo.findByEmail("admin@queuesmart.com"), other);
  });

});
