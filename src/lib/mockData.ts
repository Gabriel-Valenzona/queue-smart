import type { QueueEntry, QueueMap, Service } from "@/types/admin";

export const mockServices: Service[] = [
  {
    id: "svc-1",
    name: "Academic Advising",
    description: "Course planning, degree audits, and registration help.",
    durationMinutes: 20,
    priority: "high",
    isOpen: true,
  },
  {
    id: "svc-2",
    name: "Financial Aid",
    description: "Questions about scholarships, loans, and aid packages.",
    durationMinutes: 15,
    priority: "medium",
    isOpen: true,
  },
  {
    id: "svc-3",
    name: "IT Help Desk",
    description: "Account access, Wi-Fi issues, and device setup.",
    durationMinutes: 10,
    priority: "low",
    isOpen: false,
  },
];

function entry(id: string, userName: string, minutesAgo: number): QueueEntry {
  return {
    id,
    userName,
    joinedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  };
}

export const mockQueues: QueueMap = {
  "svc-1": [
    entry("q-1", "Alex Kim", 32),
    entry("q-2", "Priya Patel", 25),
    entry("q-3", "Jordan Lee", 18),
    entry("q-4", "Sam Rivera", 6),
  ],
  "svc-2": [entry("q-5", "Taylor Chen", 12), entry("q-6", "Morgan Davis", 4)],
  "svc-3": [],
};
