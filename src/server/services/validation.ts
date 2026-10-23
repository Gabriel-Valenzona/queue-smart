import { QueueError } from "@/server/queue/errors";
import type { QueueService } from "@/server/queue/types";

export type ServiceInput = Pick<
  QueueService,
  "name" | "description" | "duration" | "priority"
>;
const editableFields = ["name", "description", "duration", "priority"];

/** Pure validation shared by module business logic and its form. */
export function validateServiceInput(body: unknown): ServiceInput {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    throw new QueueError(
      "validation_error",
      "Request body must be a JSON object.",
    );
  const data = body as Record<string, unknown>;
  const fields: Record<string, string> = {};
  for (const key of Object.keys(data)) {
    if (!editableFields.includes(key))
      fields[key] = "This field cannot be set here.";
  }
  for (const key of ["name", "description"] as const) {
    if (typeof data[key] !== "string") fields[key] = `${key} must be a string.`;
    else if (!data[key].trim()) fields[key] = `${key} is required.`;
  }
  if (typeof data.name === "string" && data.name.trim().length > 100)
    fields.name = "Use 100 characters or fewer.";
  if (
    typeof data.duration !== "number" ||
    !Number.isFinite(data.duration) ||
    !Number.isInteger(data.duration) ||
    data.duration <= 0
  )
    fields.duration = "Enter a whole number of minutes greater than zero.";
  if (
    data.priority !== "low" &&
    data.priority !== "medium" &&
    data.priority !== "high"
  )
    fields.priority = "Select low, medium, or high.";
  if (Object.keys(fields).length)
    throw new QueueError(
      "validation_error",
      "Some fields are invalid.",
      fields,
    );
  return {
    name: (data.name as string).trim(),
    description: (data.description as string).trim(),
    duration: data.duration as number,
    priority: data.priority as ServiceInput["priority"],
  };
}
