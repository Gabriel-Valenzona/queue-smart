import { randomUUID } from "node:crypto";
import {
  type Database,
  getDatabase,
  SQLITE_CONSTRAINT_UNIQUE,
  sqliteErrorCode,
  transaction,
} from "@/server/db/connection";
import type { StoredUser, UserRole } from "@/types/auth";
import type {
  UpdateUserProfileInput,
  UserProfile,
  UserPreferences,
} from "@/server/db/types";
import { generateSalt, hashPassword } from "./crypto";
import { UserProfileRepository } from "@/server/db/repositories/user-profile-repository";

/** The email is already registered; the database's unique constraint refused it. */
export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`An account already exists for ${email}.`);
    this.name = "DuplicateEmailError";
  }
}

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  salt: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

function toUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    salt: row.salt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function insertUser(db: Database, user: StoredUser) {
  db.prepare(
    `INSERT INTO user_credentials
       (id, email, name, password_hash, salt, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    user.id,
    user.email,
    user.name,
    user.passwordHash,
    user.salt,
    user.role,
    user.createdAt,
    user.updatedAt,
  );
}

function insertProfile(db: Database, user: StoredUser) {
  const profileId = `prof_${user.id.replace("usr_", "")}`;
  const insert = db.prepare(
    `INSERT OR IGNORE INTO user_profiles
       (id, user_id, email, full_name, contact_info, preferences, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insert.run(
    profileId,
    user.id,
    user.email,
    user.name,
    user.email === "admin@queuesmart.com"
      ? "+1 (713) 743-2255"
      : user.email === "alex@example.com"
      ? "+1 (713) 555-0199"
      : null,
    JSON.stringify({
      emailNotifications: true,
      smsNotifications: user.email === "alex@example.com",
      theme: user.email === "admin@queuesmart.com" ? "dark" : "system",
    }),
    user.createdAt,
    user.updatedAt
  );
}

/** Accounts for the demo, including everyone waiting in the demo queues. */
const demoAccounts: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
  createdAt: string;
}[] = [
  {
    id: "usr_admin_001",
    name: "QueueSmart Administrator",
    email: "admin@queuesmart.com",
    role: "admin",
    password: "Admin123!",
    createdAt: "2026-01-01T08:00:00.000Z",
  },
  // Alex Morgan from the A2 front-end demo.
  {
    id: "usr_alex_002",
    name: "Alex Morgan",
    email: "alex@example.com",
    role: "user",
    password: "User123!",
    createdAt: "2026-01-02T09:00:00.000Z",
  },
  {
    id: "usr_demo_003",
    name: "Jordan Lee",
    email: "user@queuesmart.com",
    role: "user",
    password: "User123!",
    createdAt: "2026-01-03T10:00:00.000Z",
  },
  {
    id: "taylor-nguyen",
    name: "Taylor Nguyen",
    email: "taylor@example.com",
    role: "user",
    password: "User123!",
    createdAt: "2026-01-04T10:00:00.000Z",
  },
  {
    id: "casey-kim",
    name: "Casey Kim",
    email: "casey@example.com",
    role: "user",
    password: "User123!",
    createdAt: "2026-01-05T10:00:00.000Z",
  },
  {
    id: "avery-brooks",
    name: "Avery Brooks",
    email: "avery@example.com",
    role: "user",
    password: "User123!",
    createdAt: "2026-01-06T10:00:00.000Z",
  },
];

// Hashing is deliberately slow, so one process only does it once.
let demoUsers: StoredUser[] | undefined;

function hashedDemoUsers(): StoredUser[] {
  demoUsers ??= demoAccounts.map(({ password, ...account }) => {
    const salt = generateSalt();
    return {
      ...account,
      passwordHash: hashPassword(password, salt),
      salt,
      updatedAt: account.createdAt,
    };
  });
  return demoUsers;
}

function countUsers(db: Database) {
  return (db.prepare("SELECT count(*) AS n FROM user_credentials").get() as { n: number }).n;
}

/** Writes the demo accounts into a database that has no accounts yet. */
export function seedUsers(db: Database) {
  if (countUsers(db) > 0) return;
  const users = hashedDemoUsers();
  transaction(db, () => {
    for (const user of users) {
      insertUser(db, user);
      insertProfile(db, user);
    }
  });
}

/**
 * Accounts in the `user_credentials` and `user_profiles` table.
 * The default store connects on first use, so importing this module does not open
 * the database (as during a build).
 */
export class UserStore {
  private connection?: Database;

  constructor(private readonly source: () => Database = getDatabase) {}

  private get db(): Database {
    if (!this.connection) {
      this.connection = this.source();
      seedUsers(this.connection);
    }
    return this.connection;
  }

  /**
   * Removes every account and profile.
   */
  public reset(): void {
    this.db.exec("DELETE FROM user_profiles");
    this.db.exec("DELETE FROM user_credentials");
  }

  /**
   * Restores the demo accounts, if there are no accounts.
   */
  public seedDefaultUsers(): void {
    seedUsers(this.db);
  }

  /**
   * Finds a user by email address (case-insensitive).
   */
  public async findByEmail(email: string): Promise<StoredUser | null> {
    const row = this.db
      .prepare("SELECT * FROM user_credentials WHERE email = ?")
      .get(email.trim().toLowerCase()) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  /**
   * Finds a user by their unique ID.
   */
  public async findById(id: string): Promise<StoredUser | null> {
    const row = this.db.prepare("SELECT * FROM user_credentials WHERE id = ?").get(id) as
      | UserRow
      | undefined;
    return row ? toUser(row) : null;
  }

  /**
   * Saves a new user, or throws DuplicateEmailError if the email is taken.
   * Also creates the corresponding UserProfile record with foreign keys.
   */
  public async create(data: {
    name: string;
    email: string;
    role: UserRole;
    passwordHash: string;
    salt: string;
    contactInfo?: string | null;
    preferences?: UserPreferences | null;
  }): Promise<StoredUser> {
    const now = new Date().toISOString();
    const email = data.email.trim().toLowerCase();
    const user: StoredUser = {
      id: `usr_${randomUUID()}`,
      name: data.name,
      email,
      role: data.role,
      passwordHash: data.passwordHash,
      salt: data.salt,
      createdAt: now,
      updatedAt: now,
    };
    try {
      insertUser(this.db, user);

      const profileRepo = new UserProfileRepository(this.db);
      profileRepo.upsert({
        userId: user.id,
        email,
        fullName: user.name,
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
    } catch (error) {
      if (
        sqliteErrorCode(error) === SQLITE_CONSTRAINT_UNIQUE &&
        error instanceof Error &&
        error.message.includes("user_credentials.email")
      )
        throw new DuplicateEmailError(email);
      throw error;
    }
    return user;
  }

  /**
   * Returns all stored users, oldest first.
   */
  public async listAll(): Promise<StoredUser[]> {
    const rows = this.db
      .prepare("SELECT * FROM user_credentials ORDER BY rowid")
      .all() as UserRow[];
    return rows.map(toUser);
  }

  /**
   * Total number of users currently in the store.
   */
  public async count(): Promise<number> {
    return countUsers(this.db);
  }

  /**
   * Finds a UserProfile by email.
   */
  public async findProfileByEmail(email: string): Promise<UserProfile | null> {
    const profileRepo = new UserProfileRepository(this.db);
    return profileRepo.findByEmail(email);
  }

  /**
   * Finds a UserProfile by user ID.
   */
  public async findProfileByUserId(userId: string): Promise<UserProfile | null> {
    const profileRepo = new UserProfileRepository(this.db);
    return profileRepo.findByUserId(userId);
  }

  /**
   * Updates a UserProfile by profile ID, email, or user ID.
   */
  public async updateProfile(
    identifier: string,
    data: UpdateUserProfileInput
  ): Promise<UserProfile> {
    const profileRepo = new UserProfileRepository(this.db);
    return profileRepo.update(identifier, data);
  }

  /**
   * Lists all user profiles.
   */
  public async listAllProfiles(): Promise<UserProfile[]> {
    const profileRepo = new UserProfileRepository(this.db);
    return profileRepo.listAll();
  }

  /**
   * Returns the underlying SQLite database instance.
   */
  public getDatabase(): Database {
    return this.db;
  }
}

// Kept on globalThis so every route handler (and dev hot reloads) share one store.
const globalStore = globalThis as unknown as {
  __queueSmartUserStore?: UserStore;
};

if (!globalStore.__queueSmartUserStore) {
  globalStore.__queueSmartUserStore = new UserStore();
}

export const userStore = globalStore.__queueSmartUserStore;
