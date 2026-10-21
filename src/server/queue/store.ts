import type { CompletedParticipation, QueueEntry, QueueService } from "./types";

/** In-memory data for the queue module. No database is used in A3. */
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
  return {
    services: seedServices.map((service) => ({ ...service })),
    queues: {
      "student-services": [
        seedEntry("seed-1", "student-services", "jordan-lee", "Jordan Lee", "2026-10-01T09:52:00Z"),
        seedEntry("seed-2", "student-services", "taylor-nguyen", "Taylor Nguyen", "2026-10-01T09:56:00Z"),
        seedEntry("seed-3", "student-services", "alex-morgan", "Alex Morgan", "2026-10-01T10:00:00Z"),
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

// Kept on globalThis so every route handler (and dev hot reloads) share one store.
const globalForQueue = globalThis as typeof globalThis & { __queueStore?: QueueStore };

export function getQueueStore(): QueueStore {
  globalForQueue.__queueStore ??= createSeedStore();
  return globalForQueue.__queueStore;
}

export function resetQueueStore(): QueueStore {
  globalForQueue.__queueStore = createSeedStore();
  return globalForQueue.__queueStore;
}
