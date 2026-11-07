import {
  type Database,
  getDatabase,
  SQLITE_CONSTRAINT_UNIQUE,
  sqliteErrorCode,
  transaction,
} from "@/server/db/connection";
import { seedUsers } from "@/lib/auth/user-store";
import { QueueError } from "./errors";
import {
  clearQueues,
  countQueues,
  readQueueState,
  saveLine,
} from "./repository";
import type { CompletedParticipation, QueueEntry, QueueService } from "./types";
import { serviceRepository } from "@/server/db/repositories/service-repository";

/**
 * The queue module's working data. The server's store is loaded from SQLite
 * (see `loadQueueStore`) and every queue change is written back to it; stores
 * from `createSeedStore`/`createEmptyStore` stay in memory for unit tests.
 * Services are synced with SQLite via `loadServicesFromDb`/`syncQueueServices`.
 */
export type QueueStore = {
  services: QueueService[];
  /** Ordered waiting lists keyed by service id; index 0 is served next. */
  queues: Record<string, QueueEntry[]>;
  completed: CompletedParticipation[];
};

const seedServices: QueueService[] = [
  {
    id: "student-services",
    name: "Student services",
    description: "General student questions and support.",
    duration: 5,
    priority: "medium",
    open: true,
  },
  {
    id: "technology-support",
    name: "Technology support",
    description: "Help with account access and device troubleshooting.",
    duration: 10,
    priority: "high",
    open: true,
  },
  {
    id: "academic-advising",
    name: "Academic advising",
    description: "Course selection and degree-planning assistance.",
    duration: 15,
    priority: "low",
    open: false,
  },
];

function loadServicesFromDb(): QueueService[] {
  try {
    const list = serviceRepository.listAll();
    if (list && list.length > 0) {
      return list.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.expectedDuration,
        priority: s.priorityLevel,
        open: s.open,
      }));
    }
  } catch {
    // Fall back to seedServices if DB is not available
  }
  return seedServices.map((service) => ({ ...service }));
}

function seedEntry(
  id: string,
  serviceId: string,
  userId: string,
  userName: string,
  joinedAt: string,
): QueueEntry {
  return { id, serviceId, userId, userName, priority: "medium", joinedAt };
}

/** Matches the A2 demo: Alex Morgan starts third in line for Student services. */
export function createSeedStore(): QueueStore {
  const services = loadServicesFromDb();
  return {
    services,
    queues: {
      "student-services": [
        seedEntry("seed-1", "student-services", "usr_demo_003", "Jordan Lee", "2026-10-01T09:52:00Z"),
        seedEntry("seed-2", "student-services", "taylor-nguyen", "Taylor Nguyen", "2026-10-01T09:56:00Z"),
        seedEntry("seed-3", "student-services", "usr_alex_002", "Alex Morgan", "2026-10-01T10:00:00Z"),
      ],
      "technology-support": [
        seedEntry("seed-4", "technology-support", "casey-kim", "Casey Kim", "2026-10-01T09:41:00Z"),
        seedEntry("seed-5", "technology-support", "avery-brooks", "Avery Brooks", "2026-10-01T09:48:00Z"),
      ],
      "academic-advising": [],
    },
    completed: [],
  };
}

export function createEmptyStore(services: QueueService[] = []): QueueStore {
  return {
    services: services.map((service) => ({ ...service })),
    queues: Object.fromEntries(services.map((service) => [service.id, []])),
    completed: [],
  };
}

/** Stores loaded from a database, and the database each writes through to. */
const databases = new WeakMap<QueueStore, Database>();

/** Replaces the store's queue data with what the database holds. */
function hydrate(store: QueueStore, db: Database) {
  const state = readQueueState(db, store.services);
  for (const service of store.services)
    service.open = state.open.get(service.id) ?? service.open;
  store.queues = state.queues;
  store.completed = state.completed;
}

/** Writes the demo queues, and the accounts waiting in them, into a database with no queues yet. */
export function seedQueues(db: Database) {
  seedUsers(db);
  transaction(db, () => {
    if (countQueues(db) > 0) return;
    const seed = createSeedStore();
    for (const service of seed.services) saveLine(db, service, seed.queues[service.id] ?? []);
  });
}

/**
 * Loads queues and entries from the database. Services are not in the
 * database yet, so `services` (the seed list by default) decides which queues
 * the store exposes; any of them without a queue gets one.
 */
export function loadQueueStore(
  db: Database,
  services: QueueService[] = createSeedStore().services,
): QueueStore {
  const store = createEmptyStore(services);
  transaction(db, () => hydrate(store, db));
  databases.set(store, db);
  return store;
}

/**
 * Commits `write` for a store loaded from a database. Queue logic changes the
 * store first; if the database rejects the change, the store is reloaded so it
 * never shows data that was not saved. Stores built in memory skip this.
 */
export function writeThrough(store: QueueStore, write: (db: Database) => void) {
  const db = databases.get(store);
  if (!db) return;
  try {
    transaction(db, () => write(db));
  } catch (error) {
    hydrate(store, db);
    if (
      sqliteErrorCode(error) === SQLITE_CONSTRAINT_UNIQUE &&
      error instanceof Error &&
      error.message.includes("queue_entries.user_id")
    )
      throw new QueueError(
        "already_in_queue",
        "This user is already waiting in another queue. Leave that queue first.",
      );
    throw error;
  }
}

// Kept on globalThis so every route handler (and dev hot reloads) share one store.
const globalForQueue = globalThis as typeof globalThis & { __queueStore?: QueueStore };

export function getQueueStore(): QueueStore {
  if (!globalForQueue.__queueStore) {
    const db = getDatabase();
    seedQueues(db);
    globalForQueue.__queueStore = loadQueueStore(db);
  }
  return globalForQueue.__queueStore;
}

/** Deletes every saved queue and entry, then restores the demo queues. */
export function resetQueueStore(): QueueStore {
  const db = getDatabase();
  transaction(db, () => clearQueues(db));
  seedQueues(db);
  globalForQueue.__queueStore = loadQueueStore(db);
  return globalForQueue.__queueStore;
}

/**
 * Synchronizes queue store services with SQLite database.
 */
export function syncQueueServices(store: QueueStore): QueueStore {
  const dbServices = loadServicesFromDb();
  store.services = dbServices;
  for (const s of dbServices) {
    store.queues[s.id] ??= [];
  }
  return store;
}
