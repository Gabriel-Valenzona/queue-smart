import { randomUUID } from "node:crypto";
import type { QueueStore } from "@/server/queue/store";
import { validateId } from "@/server/queue/validation";
import { validateServiceInput } from "./validation";
import {
  insertService,
  readServices,
  replaceServiceDetails,
} from "./repository";

export function listServices(store: QueueStore) {
  return readServices(store);
}

export function createService(store: QueueStore, body: unknown) {
  const input = validateServiceInput(body);
  return insertService(store, {
    ...input,
    id: `service-${randomUUID()}`,
    open: false,
  });
}

/** Only editable service fields change; queue ordering and availability stay with queue management. */
export function updateService(store: QueueStore, id: string, body: unknown) {
  validateId(id, "serviceId");
  const input = validateServiceInput(body);
  return replaceServiceDetails(store, id, input);
}
