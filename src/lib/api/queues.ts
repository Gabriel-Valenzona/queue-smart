/** Front-end client for the Queue Management API (src/app/api). */
import type {
  CompletedParticipation,
  Participation,
  Priority,
  QueueDetail,
  QueueEntryView,
  QueueEvent,
  QueueService,
  QueueSummary,
} from "@/server/queue/types";

export type {
  CompletedParticipation,
  Participation,
  QueueDetail,
  QueueEntryView,
  QueueEvent,
  QueueService,
  QueueSummary,
};

/** Error carrying the API's error code, message, and per-field problems. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "unknown_error",
      error?.message ?? "The request could not be completed.",
      error?.fields,
    );
  }
  return body as T;
}

const queuePath = (serviceId: string) => `/api/queues/${encodeURIComponent(serviceId)}`;
const entryPath = (serviceId: string, entryId: string) =>
  `${queuePath(serviceId)}/entries/${encodeURIComponent(entryId)}`;

export const queueApi = {
  list: () => request<{ queues: QueueSummary[] }>("/api/queues").then((r) => r.queues),

  get: (serviceId: string) => request<QueueDetail>(queuePath(serviceId)),

  setOpen: (serviceId: string, open: boolean) =>
    request<{ service: QueueService; events: QueueEvent[] }>(queuePath(serviceId), {
      method: "PATCH",
      body: JSON.stringify({ open }),
    }),

  join: (serviceId: string, user: { userId: string; userName: string; priority?: Priority }) =>
    request<{ entry: QueueEntryView; events: QueueEvent[] }>(`${queuePath(serviceId)}/entries`, {
      method: "POST",
      body: JSON.stringify(user),
    }),

  leave: (serviceId: string, entryId: string) =>
    request<{ record: CompletedParticipation; events: QueueEvent[] }>(
      entryPath(serviceId, entryId),
      { method: "DELETE" },
    ),

  move: (serviceId: string, entryId: string, direction: "up" | "down") =>
    request<{ entries: QueueEntryView[]; events: QueueEvent[] }>(entryPath(serviceId, entryId), {
      method: "PATCH",
      body: JSON.stringify({ direction }),
    }),

  serveNext: (serviceId: string) =>
    request<{ record: CompletedParticipation; events: QueueEvent[] }>(
      `${queuePath(serviceId)}/serve`,
      { method: "POST" },
    ),

  participation: (userId: string) =>
    request<Participation>(`/api/participants/${encodeURIComponent(userId)}/queue`),

  resetDemo: () =>
    request<{ queues: QueueSummary[] }>("/api/demo/reset", { method: "POST" }).then(
      (r) => r.queues,
    ),
};
