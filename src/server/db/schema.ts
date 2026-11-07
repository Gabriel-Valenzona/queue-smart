import type { DatabaseSync } from "node:sqlite";
import { applyNotificationSchema } from "@/server/notifications/schema";
import { generateSalt, hashPassword } from "@/lib/auth/crypto";

/**
 * SQLite Schema definitions and seed fixtures for QueueSmart.
 * Covers user_credentials, queues, queue_entries, notifications,
 * Area 2: UserProfile and Area 3: Service.
 */
export const tables = `
  CREATE TABLE IF NOT EXISTS user_credentials (
    id             TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
    -- Stored trimmed and lowercase, so UNIQUE also ignores case.
    email          TEXT NOT NULL UNIQUE
                   CHECK (length(email) BETWEEN 3 AND 254 AND email = lower(trim(email)) AND email LIKE '%_@_%'),
    name           TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    password_hash  TEXT NOT NULL
                   CHECK (length(password_hash) = 128 AND password_hash NOT GLOB '*[^0-9a-f]*'),
    salt           TEXT NOT NULL CHECK (length(salt) >= 16 AND salt NOT GLOB '*[^0-9a-f]*'),
    role           TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at     TEXT NOT NULL CHECK (julianday(created_at) IS NOT NULL),
    updated_at     TEXT NOT NULL CHECK (julianday(updated_at) IS NOT NULL)
  ) STRICT;

  CREATE VIEW IF NOT EXISTS users AS SELECT * FROM user_credentials;

  CREATE TABLE IF NOT EXISTS queues (
    id          TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
    service_id  TEXT NOT NULL UNIQUE CHECK (length(service_id) BETWEEN 1 AND 64),
    status      TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
    created_at  TEXT NOT NULL CHECK (julianday(created_at) IS NOT NULL)
  ) STRICT;

  CREATE TABLE IF NOT EXISTS queue_entries (
    id            TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
    queue_id      TEXT NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES user_credentials(id),
    user_name     TEXT NOT NULL CHECK (length(trim(user_name)) BETWEEN 1 AND 100),
    priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    position      INTEGER CHECK (position >= 1),
    joined_at     TEXT NOT NULL CHECK (julianday(joined_at) IS NOT NULL),
    status        TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'served', 'canceled')),
    completed_at  TEXT CHECK (completed_at IS NULL OR julianday(completed_at) IS NOT NULL),
    service_name  TEXT CHECK (length(trim(service_name)) BETWEEN 1 AND 100),
    CHECK ((status = 'waiting') = (position IS NOT NULL)),
    CHECK ((status = 'waiting') = (completed_at IS NULL)),
    CHECK ((status = 'waiting') = (service_name IS NULL))
  ) STRICT;

  CREATE UNIQUE INDEX IF NOT EXISTS queue_entries_position
    ON queue_entries (queue_id, position) WHERE status = 'waiting';

  CREATE UNIQUE INDEX IF NOT EXISTS queue_entries_one_waiting_per_user
    ON queue_entries (user_id) WHERE status = 'waiting';

  CREATE INDEX IF NOT EXISTS queue_entries_user_history
    ON queue_entries (user_id, completed_at);

  -- Area 2: UserProfile
  -- Stores user-related details:
  -- - Full name
  -- - Email (foreign key or reference)
  -- - Optional contact information
  -- - Preferences (if applicable)
  CREATE TABLE IF NOT EXISTS user_profiles (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES user_credentials(id) ON DELETE CASCADE,
    email        TEXT NOT NULL UNIQUE REFERENCES user_credentials(email) ON UPDATE CASCADE ON DELETE CASCADE,
    full_name    TEXT NOT NULL,
    contact_info TEXT,
    preferences  TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

  -- Area 3: Service
  -- Stores services offered by the organization:
  -- - Service ID
  -- - Service name
  -- - Description
  -- - Expected duration
  -- - Priority level
  CREATE TABLE IF NOT EXISTS services (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    description       TEXT NOT NULL,
    expected_duration INTEGER NOT NULL,
    priority_level    TEXT NOT NULL CHECK(priority_level IN ('low', 'medium', 'high')),
    open              INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_services_priority ON services(priority_level);
`;

export const SCHEMA_SQL = tables;

export interface SeedUserFixture {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  passwordPlain: string;
  contactInfo?: string | null;
  preferences?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export const SEED_USERS: SeedUserFixture[] = [
  {
    id: "usr_admin_001",
    name: "QueueSmart Administrator",
    email: "admin@queuesmart.com",
    role: "admin",
    passwordPlain: "Admin123!",
    contactInfo: "+1 (713) 743-2255",
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      theme: "dark",
      language: "en-US",
    },
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "usr_alex_002",
    name: "Alex Morgan",
    email: "alex@example.com",
    role: "user",
    passwordPlain: "User123!",
    contactInfo: "+1 (713) 555-0199",
    preferences: {
      emailNotifications: true,
      smsNotifications: true,
      theme: "system",
      language: "en-US",
    },
    createdAt: "2026-01-02T09:00:00.000Z",
    updatedAt: "2026-01-02T09:00:00.000Z",
  },
  {
    id: "usr_demo_003",
    name: "Jordan Lee",
    email: "user@queuesmart.com",
    role: "user",
    passwordPlain: "User123!",
    contactInfo: null,
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      theme: "light",
      language: "en-US",
    },
    createdAt: "2026-01-03T10:00:00.000Z",
    updatedAt: "2026-01-03T10:00:00.000Z",
  },
  // Waiting in the demo queues, so queue entries can reference them.
  {
    id: "taylor-nguyen",
    name: "Taylor Nguyen",
    email: "taylor@example.com",
    role: "user",
    passwordPlain: "User123!",
    contactInfo: null,
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      theme: "system",
      language: "en-US",
    },
    createdAt: "2026-01-04T10:00:00.000Z",
    updatedAt: "2026-01-04T10:00:00.000Z",
  },
  {
    id: "casey-kim",
    name: "Casey Kim",
    email: "casey@example.com",
    role: "user",
    passwordPlain: "User123!",
    contactInfo: null,
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      theme: "system",
      language: "en-US",
    },
    createdAt: "2026-01-05T10:00:00.000Z",
    updatedAt: "2026-01-05T10:00:00.000Z",
  },
  {
    id: "avery-brooks",
    name: "Avery Brooks",
    email: "avery@example.com",
    role: "user",
    passwordPlain: "User123!",
    contactInfo: null,
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      theme: "system",
      language: "en-US",
    },
    createdAt: "2026-01-06T10:00:00.000Z",
    updatedAt: "2026-01-06T10:00:00.000Z",
  },
];

export interface SeedServiceFixture {
  id: string;
  name: string;
  description: string;
  expectedDuration: number;
  priorityLevel: "low" | "medium" | "high";
  open: boolean;
  createdAt: string;
  updatedAt: string;
}

export const SEED_SERVICES: SeedServiceFixture[] = [
  {
    id: "student-services",
    name: "Student services",
    description: "General student questions and support.",
    expectedDuration: 5,
    priorityLevel: "medium",
    open: true,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "technology-support",
    name: "Technology support",
    description: "Help with account access and device troubleshooting.",
    expectedDuration: 10,
    priorityLevel: "high",
    open: true,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "academic-advising",
    name: "Academic advising",
    description: "Course selection and degree-planning assistance.",
    expectedDuration: 15,
    priorityLevel: "low",
    open: false,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
];

export function applySchema(db: DatabaseSync) {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(tables);
  applyNotificationSchema(db);
}

export function initSchema(db: DatabaseSync): void {
  applySchema(db);
}

export function seedDatabase(db: DatabaseSync): void {
  applySchema(db);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO user_credentials (id, email, name, role, password_hash, salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProfile = db.prepare(`
    INSERT OR IGNORE INTO user_profiles (id, user_id, email, full_name, contact_info, preferences, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const user of SEED_USERS) {
    const salt = generateSalt();
    const passwordHash = hashPassword(user.passwordPlain, salt);

    insertUser.run(
      user.id,
      user.email.toLowerCase(),
      user.name,
      user.role,
      passwordHash,
      salt,
      user.createdAt,
      user.updatedAt
    );

    const profileId = `prof_${user.id.replace("usr_", "")}`;
    const preferencesJson = user.preferences ? JSON.stringify(user.preferences) : null;

    insertProfile.run(
      profileId,
      user.id,
      user.email.toLowerCase(),
      user.name,
      user.contactInfo || null,
      preferencesJson,
      user.createdAt,
      user.updatedAt
    );
  }

  const insertService = db.prepare(`
    INSERT OR IGNORE INTO services (id, name, description, expected_duration, priority_level, open, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const service of SEED_SERVICES) {
    insertService.run(
      service.id,
      service.name,
      service.description,
      service.expectedDuration,
      service.priorityLevel,
      service.open ? 1 : 0,
      service.createdAt,
      service.updatedAt
    );
  }
}

export function clearDatabase(db: DatabaseSync): void {
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec("DELETE FROM user_profiles;");
  db.exec("DELETE FROM user_credentials;");
  db.exec("DELETE FROM services;");
  db.exec("PRAGMA foreign_keys = ON;");
}
