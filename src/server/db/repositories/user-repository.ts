/**
 * User Account Repository for SQLite
 * Manages user credentials and roles, coordinating with UserProfile.
 */

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { StoredUser } from "@/types/auth";
import { getDatabase } from "../connection";
import { SEED_USERS } from "../schema";
import { generateSalt, hashPassword } from "@/lib/auth/crypto";
import type { CreateDbUserInput, DbUserAccount } from "../types";
import { UserProfileRepository } from "./user-profile-repository";

function rowToStoredUser(row: DbUserAccount): StoredUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.passwordHash,
    salt: row.salt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class UserRepository {
  private db: DatabaseSync;
  private profileRepo: UserProfileRepository;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
    this.profileRepo = new UserProfileRepository(this.db);
  }

  /**
   * Finds a user by email address (case-insensitive).
   */
  public findByEmail(email: string): StoredUser | null {
    const normalized = email.trim().toLowerCase();
    const row = this.db
      .prepare(
        `SELECT id, email, name, role, password_hash as passwordHash, salt, created_at as createdAt, updated_at as updatedAt
         FROM users
         WHERE LOWER(email) = LOWER(?)`
      )
      .get(normalized) as DbUserAccount | undefined;

    return row ? rowToStoredUser(row) : null;
  }

  /**
   * Finds a user by unique ID.
   */
  public findById(id: string): StoredUser | null {
    const row = this.db
      .prepare(
        `SELECT id, email, name, role, password_hash as passwordHash, salt, created_at as createdAt, updated_at as updatedAt
         FROM users
         WHERE id = ?`
      )
      .get(id) as DbUserAccount | undefined;

    return row ? rowToStoredUser(row) : null;
  }

  /**
   * Creates a new user record and an associated UserProfile record in SQLite.
   */
  public create(data: CreateDbUserInput): StoredUser {
    const id = data.id || `usr_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();
    const now = data.createdAt || new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO user_credentials (id, email, name, role, password_hash, salt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        email,
        name,
        data.role,
        data.passwordHash,
        data.salt,
        now,
        data.updatedAt || now
      );

    // Create the associated UserProfile (Area 2: UserProfile)
    // with foreign key reference to email and user_id
    this.profileRepo.upsert({
      userId: id,
      email,
      fullName: name,
      contactInfo: data.contactInfo !== undefined ? data.contactInfo : null,
      preferences:
        data.preferences !== undefined
          ? data.preferences
          : {
              emailNotifications: true,
              smsNotifications: false,
              theme: "system",
            },
      createdAt: now,
      updatedAt: now,
    });

    const created = this.findById(id);
    if (!created) {
      throw new Error(`Failed to retrieve newly created user for id: ${id}`);
    }
    return created;
  }

  /**
   * Lists all stored users.
   */
  public listAll(): StoredUser[] {
    const rows = this.db
      .prepare(
        `SELECT id, email, name, role, password_hash as passwordHash, salt, created_at as createdAt, updated_at as updatedAt
         FROM users
         ORDER BY created_at ASC`
      )
      .all() as DbUserAccount[];

    return rows.map(rowToStoredUser);
  }

  /**
   * Returns total count of users in database.
   */
  public count(): number {
    const result = this.db
      .prepare(`SELECT COUNT(*) as count FROM users`)
      .get() as { count: number };
    return result?.count || 0;
  }

  /**
   * Seeds default users and user profiles.
   */
  public seed(): void {
    const insertUser = this.db.prepare(`
      INSERT OR IGNORE INTO user_credentials (id, email, name, role, password_hash, salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of SEED_USERS) {
      const salt = generateSalt();
      const passwordHash = hashPassword(u.passwordPlain, salt);

      insertUser.run(
        u.id,
        u.email.toLowerCase(),
        u.name,
        u.role,
        passwordHash,
        salt,
        u.createdAt,
        u.updatedAt
      );

      this.profileRepo.upsert({
        userId: u.id,
        email: u.email.toLowerCase(),
        fullName: u.name,
        contactInfo: u.contactInfo || null,
        preferences: u.preferences || null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      });
    }
  }

  /**
   * Resets users and user profiles in the database.
   */
  public reset(): void {
    this.db.exec("DELETE FROM user_profiles;");
    this.db.exec("DELETE FROM user_credentials;");
  }
}

export const userRepository = new UserRepository();
