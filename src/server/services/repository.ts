import type { QueueStore } from "@/server/queue/store";
import type { QueueService } from "@/server/queue/types";
import { QueueError } from "@/server/queue/errors";
import type { ServiceInput } from "./validation";

/** A3 adapter over the queue owner's shared store; replace this boundary in A4. */
export function readServices(store: QueueStore): QueueService[] {
  return store.services.map((service) => ({ ...service }));
}

export function insertService(
  store: QueueStore,
  service: QueueService,
): QueueService {
  store.services.push(service);
  store.queues[service.id] = [];
  return { ...service };
}

export function replaceServiceDetails(
  store: QueueStore,
  id: string,
  input: ServiceInput,
): QueueService {
  const service = store.services.find((item) => item.id === id);
  if (!service)
    throw new QueueError(
      "service_not_found",
      `Service "${id}" does not exist.`,
    );
  Object.assign(service, input);
  return { ...service };
}
