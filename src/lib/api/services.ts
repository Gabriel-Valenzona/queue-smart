import type { QueueService } from "@/server/queue/types";
import type { ServiceInput } from "@/server/services/validation";
import { moduleRequest } from "./module-request";

export const servicesApi = {
  list: () =>
    moduleRequest<{ services: QueueService[] }>("/api/services").then(
      (r) => r.services,
    ),
  create: (input: ServiceInput) =>
    moduleRequest<{ service: QueueService }>("/api/services", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.service),
  update: (id: string, input: ServiceInput) =>
    moduleRequest<{ service: QueueService }>(
      `/api/services/${encodeURIComponent(id)}`,
      { method: "PUT", body: JSON.stringify(input) },
    ).then((r) => r.service),
};
