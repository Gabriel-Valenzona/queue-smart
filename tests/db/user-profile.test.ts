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
});
