/**
 * UserProfile Repository
 * Area 2: UserProfile - Stores user-related details:
 * - Full name
 * - Email (foreign key or reference)
 * - Optional contact information
 * - Preferences (if applicable)
 */

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getDatabase } from "../connection";
import type {
  CreateUserProfileInput,
  UpdateUserProfileInput,
  UserProfile,
  UserPreferences,
} from "../types";

interface UserProfileRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  contact_info: string | null;
  preferences: string | null;
  created_at: string;
  updated_at: string;
}

function parsePreferences(raw: string | null): UserPreferences | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function serializePreferences(
  prefs?: UserPreferences | string | null
): string | null {
  if (prefs === undefined || prefs === null) return null;
  if (typeof prefs === "string") {
    try {
      JSON.parse(prefs);
      return prefs;
    } catch {
      return JSON.stringify({ custom: prefs });
    }
  }
  return JSON.stringify(prefs);
}

function rowToUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    contactInfo: row.contact_info,
    preferences: parsePreferences(row.preferences),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserProfileRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  /**
   * Finds a UserProfile by email address (case-insensitive).
   */
  public findByEmail(email: string): UserProfile | null {
    const normalized = email.trim().toLowerCase();
    const row = this.db
      .prepare(
        `SELECT id, user_id, email, full_name, contact_info, preferences, created_at, updated_at
         FROM user_profiles
         WHERE LOWER(email) = LOWER(?)`
      )
      .get(normalized) as UserProfileRow | undefined;

    return row ? rowToUserProfile(row) : null;
  }

  /**
   * Finds a UserProfile by user ID.
   */
  public findByUserId(userId: string): UserProfile | null {
    const row = this.db
      .prepare(
        `SELECT id, user_id, email, full_name, contact_info, preferences, created_at, updated_at
         FROM user_profiles
         WHERE user_id = ?`
      )
      .get(userId) as UserProfileRow | undefined;

    return row ? rowToUserProfile(row) : null;
  }

  /**
   * Finds a UserProfile by profile ID.
   */
  public findById(id: string): UserProfile | null {
    const row = this.db
      .prepare(
        `SELECT id, user_id, email, full_name, contact_info, preferences, created_at, updated_at
         FROM user_profiles
         WHERE id = ?`
      )
      .get(id) as UserProfileRow | undefined;

    return row ? rowToUserProfile(row) : null;
  }

  /**
   * Creates and stores a new UserProfile record.
   * Requires foreign key reference to an existing user email and user_id.
   */
  public create(data: CreateUserProfileInput): UserProfile {
    const id = data.id || `prof_${randomUUID().replace(/-/g, "").substring(0, 16)}`;
    const now = data.createdAt || new Date().toISOString();
    const normalizedEmail = data.email.trim().toLowerCase();
    const serializedPrefs = serializePreferences(data.preferences);
    const contactInfo = data.contactInfo ? data.contactInfo.trim() : null;

    this.db
      .prepare(
        `INSERT INTO user_profiles (id, user_id, email, full_name, contact_info, preferences, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        data.userId,
        normalizedEmail,
        data.fullName.trim(),
        contactInfo,
        serializedPrefs,
        now,
        data.updatedAt || now
      );

    const created = this.findById(id);
    if (!created) {
      throw new Error(`Failed to retrieve newly created UserProfile for id: ${id}`);
    }
    return created;
  }

  /**
   * Updates an existing UserProfile by profile ID or email.
   */
  public update(
    identifier: string,
    data: UpdateUserProfileInput
  ): UserProfile {
    const existing =
      this.findById(identifier) || this.findByEmail(identifier);

    if (!existing) {
      throw new Error(`UserProfile not found for identifier "${identifier}"`);
    }

    const now = data.updatedAt || new Date().toISOString();
    const fullName =
      data.fullName !== undefined ? data.fullName.trim() : existing.fullName;

    const contactInfo =
      data.contactInfo !== undefined
        ? data.contactInfo === null
          ? null
          : data.contactInfo.trim()
        : existing.contactInfo;

    const preferencesJson =
      data.preferences !== undefined
        ? serializePreferences(data.preferences)
        : serializePreferences(existing.preferences);

    this.db
      .prepare(
        `UPDATE user_profiles
         SET full_name = ?,
             contact_info = ?,
             preferences = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(fullName, contactInfo, preferencesJson, now, existing.id);

    // Also update display name in parent user_credentials table if changed
    if (data.fullName !== undefined && data.fullName.trim().length > 0) {
      this.db
        .prepare(
          `UPDATE user_credentials SET name = ?, updated_at = ? WHERE id = ?`
        )
        .run(fullName, now, existing.userId);
    }

    const updated = this.findById(existing.id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated UserProfile for id: ${existing.id}`);
    }
    return updated;
  }

  /**
   * Upserts a UserProfile: updates if email already exists, otherwise creates.
   */
  public upsert(data: CreateUserProfileInput): UserProfile {
    const existing = this.findByEmail(data.email);
    if (existing) {
      return this.update(existing.id, {
        fullName: data.fullName,
        contactInfo: data.contactInfo,
        preferences: data.preferences,
        updatedAt: data.updatedAt,
      });
    }
    return this.create(data);
  }

  /**
   * Deletes a UserProfile by ID or email.
   */
  public delete(idOrEmail: string): boolean {
    const existing = this.findById(idOrEmail) || this.findByEmail(idOrEmail);
    if (!existing) return false;

    const result = this.db
      .prepare(`DELETE FROM user_profiles WHERE id = ?`)
      .run(existing.id);

    return result.changes > 0;
  }

  /**
   * Returns all stored user profiles.
   */
  public listAll(): UserProfile[] {
    const rows = this.db
      .prepare(
        `SELECT id, user_id, email, full_name, contact_info, preferences, created_at, updated_at
         FROM user_profiles
         ORDER BY created_at ASC`
      )
      .all() as UserProfileRow[];

    return rows.map(rowToUserProfile);
  }

  /**
   * Returns the count of profiles in the database.
   */
  public count(): number {
    const result = this.db
      .prepare(`SELECT COUNT(*) as count FROM user_profiles`)
      .get() as { count: number };
    return result?.count || 0;
  }
}

export const userProfileRepository = new UserProfileRepository();

