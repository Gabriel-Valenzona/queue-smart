import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  createTestDatabase,
  initSchema,
  seedDatabase,
  clearDatabase,
} from "../../src/server/db";
import { generateSalt, hashPassword } from "../../src/lib/auth/crypto";

describe("SQLite Database Layer - Schema & Integrity", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDatabase(false);
  });

  afterEach(() => db.close());

  it("should initialize schema and tables correctly", () => {
    initSchema(db);

    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('user_credentials', 'user_profiles', 'services')`
      )
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name).sort();
    assert.deepEqual(tableNames, ["services", "user_credentials", "user_profiles"]);
  });

  it("should enforce foreign key constraint between user_profiles(email) and user_credentials(email)", () => {
    initSchema(db);

    // Attempt to insert a user_profile for an email that does NOT exist in user_credentials table
    assert.throws(
      () => {
        db.prepare(
          `INSERT INTO user_profiles (id, user_id, email, full_name, contact_info, preferences, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          "prof_orphan",
          "usr_nonexistent",
          "orphan@example.com",
          "Orphan User",
          null,
          null,
          new Date().toISOString(),
          new Date().toISOString()
        );
      },
      /FOREIGN KEY constraint failed/,
      "Expected foreign key constraint violation when referencing non-existent user"
    );
  });

  it("should successfully insert user_profiles when referencing a valid user", () => {
    initSchema(db);

    const now = new Date().toISOString();
    const salt = generateSalt();
    const hash = hashPassword("Test1234!", salt);

    db.prepare(
      `INSERT INTO user_credentials (id, email, name, role, password_hash, salt, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("usr_test_1", "valid@example.com", "Valid User", "user", hash, salt, now, now);

    assert.doesNotThrow(() => {
      db.prepare(
        `INSERT INTO user_profiles (id, user_id, email, full_name, contact_info, preferences, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        "prof_test_1",
        "usr_test_1",
        "valid@example.com",
        "Valid User",
        "+1 713-000-0000",
        JSON.stringify({ theme: "dark" }),
        now,
        now
      );
    });

    const profile = db
      .prepare(`SELECT * FROM user_profiles WHERE email = ?`)
      .get("valid@example.com") as { full_name: string; contact_info: string };

    assert.ok(profile);
    assert.equal(profile.full_name, "Valid User");
    assert.equal(profile.contact_info, "+1 713-000-0000");
  });

  it("should cascade delete user_profiles when parent user is deleted", () => {
    initSchema(db);

    const now = new Date().toISOString();
    const salt = generateSalt();
    const hash = hashPassword("Delete123!", salt);

    db.prepare(
      `INSERT INTO user_credentials (id, email, name, role, password_hash, salt, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("usr_del", "delete-me@example.com", "To Delete", "user", hash, salt, now, now);

    db.prepare(
      `INSERT INTO user_profiles (id, user_id, email, full_name, contact_info, preferences, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("prof_del", "usr_del", "delete-me@example.com", "To Delete", null, null, now, now);

    // Verify profile exists
    assert.ok(db.prepare(`SELECT * FROM user_profiles WHERE id = 'prof_del'`).get());

    // Delete user
    db.prepare(`DELETE FROM user_credentials WHERE id = 'usr_del'`).run();

    // Verify profile was cascade-deleted
    const profileAfter = db.prepare(`SELECT * FROM user_profiles WHERE id = 'prof_del'`).get();
    assert.equal(profileAfter, undefined);
  });

  it("should seed default users, profiles, and services", () => {
    seedDatabase(db);

    const userCount = (
      db.prepare(`SELECT COUNT(*) as count FROM user_credentials`).get() as { count: number }
    ).count;
    const profileCount = (
      db.prepare(`SELECT COUNT(*) as count FROM user_profiles`).get() as { count: number }
    ).count;
    const serviceCount = (
      db.prepare(`SELECT COUNT(*) as count FROM services`).get() as { count: number }
    ).count;

    assert.ok(userCount >= 3, "Expected at least 3 seeded users");
    assert.ok(profileCount >= 3, "Expected at least 3 seeded profiles");
    assert.ok(serviceCount >= 3, "Expected at least 3 seeded services");

    // Verify specific seeded service
    const studentServices = db
      .prepare(`SELECT * FROM services WHERE id = 'student-services'`)
      .get() as {
      id: string;
      name: string;
      expected_duration: number;
      priority_level: string;
    };
    assert.ok(studentServices);
    assert.equal(studentServices.name, "Student services");
    assert.equal(studentServices.expected_duration, 5);
    assert.equal(studentServices.priority_level, "medium");
  });

  it("should clear database tables cleanly", () => {
    seedDatabase(db);
    clearDatabase(db);

    const userCount = (
      db.prepare(`SELECT COUNT(*) as count FROM user_credentials`).get() as { count: number }
    ).count;
    const profileCount = (
      db.prepare(`SELECT COUNT(*) as count FROM user_profiles`).get() as { count: number }
    ).count;
    const serviceCount = (
      db.prepare(`SELECT COUNT(*) as count FROM services`).get() as { count: number }
    ).count;

    assert.equal(userCount, 0);
    assert.equal(profileCount, 0);
    assert.equal(serviceCount, 0);
  });
});


