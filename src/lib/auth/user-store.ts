import type { StoredUser, UserRole } from "@/types/auth";
import { generateSalt, hashPassword } from "./crypto";

/**
 * In-Memory User Repository for QueueSmart
 * Conforms to Deliverable 4 (No persistent database required in A3;
 * in-memory collections / mocked objects used).
 */
export class UserStore {
  private users: Map<string, StoredUser>;

  constructor() {
    this.users = new Map<string, StoredUser>();
    this.seedDefaultUsers();
  }

  /**
   * Resets the in-memory store to an empty state.
   */
  public reset(): void {
    this.users.clear();
  }

  /**
   * Seeds the in-memory store with default users for demo and testing.
   */
  public seedDefaultUsers(): void {
    this.users.clear();

    // 1. Administrator Account
    const adminSalt = generateSalt();
    const adminUser: StoredUser = {
      id: "usr_admin_001",
      name: "QueueSmart Administrator",
      email: "admin@queuesmart.com",
      role: "admin",
      passwordHash: hashPassword("Admin123!", adminSalt),
      salt: adminSalt,
      createdAt: "2026-01-01T08:00:00.000Z",
      updatedAt: "2026-01-01T08:00:00.000Z",
    };
    this.users.set(adminUser.id, adminUser);

    // 2. Standard User Account (Alex Morgan from A2 front-end demo)
    const alexSalt = generateSalt();
    const alexUser: StoredUser = {
      id: "usr_alex_002",
      name: "Alex Morgan",
      email: "alex@example.com",
      role: "user",
      passwordHash: hashPassword("User123!", alexSalt),
      salt: alexSalt,
      createdAt: "2026-01-02T09:00:00.000Z",
      updatedAt: "2026-01-02T09:00:00.000Z",
    };
    this.users.set(alexUser.id, alexUser);

    // 3. General Demo User Account
    const userSalt = generateSalt();
    const demoUser: StoredUser = {
      id: "usr_demo_003",
      name: "Jordan Lee",
      email: "user@queuesmart.com",
      role: "user",
      passwordHash: hashPassword("User123!", userSalt),
      salt: userSalt,
      createdAt: "2026-01-03T10:00:00.000Z",
      updatedAt: "2026-01-03T10:00:00.000Z",
    };
    this.users.set(demoUser.id, demoUser);
  }

  /**
   * Finds a user by email address (case-insensitive).
   */
  public async findByEmail(email: string): Promise<StoredUser | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return { ...user };
      }
    }
    return null;
  }

  /**
   * Finds a user by their unique ID.
   */
  public async findById(id: string): Promise<StoredUser | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  /**
   * Creates and stores a new user record in memory.
   */
  public async create(data: {
    name: string;
    email: string;
    role: UserRole;
    passwordHash: string;
    salt: string;
  }): Promise<StoredUser> {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const newUser: StoredUser = {
      id,
      name: data.name,
      email: data.email.trim().toLowerCase(),
      role: data.role,
      passwordHash: data.passwordHash,
      salt: data.salt,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, newUser);
    return { ...newUser };
  }

  /**
   * Returns all stored users (without passwords for safety).
   */
  public async listAll(): Promise<StoredUser[]> {
    return Array.from(this.users.values()).map((u) => ({ ...u }));
  }

  /**
   * Total number of users currently in the store.
   */
  public async count(): Promise<number> {
    return this.users.size;
  }
}

// Preserve in-memory singleton across hot module reloads in Next.js development
const globalStore = globalThis as unknown as {
  __queueSmartUserStore?: UserStore;
};

if (!globalStore.__queueSmartUserStore) {
  globalStore.__queueSmartUserStore = new UserStore();
}

export const userStore = globalStore.__queueSmartUserStore;
