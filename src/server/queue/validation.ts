import { QueueError } from "./errors";
import type { Priority } from "./types";

export const PRIORITIES: readonly Priority[] = ["low", "medium", "high"];
export const USER_ID_MAX_LENGTH = 64;
export const USER_NAME_MAX_LENGTH = 100;
const USER_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export type JoinQueueInput = {
  userId: string;
  userName: string;
  priority: Priority;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireObject(body: unknown) {
  if (!isRecord(body))
    throw new QueueError("validation_error", "Request body must be a JSON object.");
  return body;
}

function fail(fields: Record<string, string>): never {
  throw new QueueError("validation_error", "Some fields are invalid.", fields);
}

export function validateJoinQueue(body: unknown): JoinQueueInput {
  const data = requireObject(body);
  const fields: Record<string, string> = {};

  const userId = data.userId;
  if (userId === undefined || userId === null || userId === "")
    fields.userId = "userId is required.";
  else if (typeof userId !== "string") fields.userId = "userId must be a string.";
  else if (userId.length > USER_ID_MAX_LENGTH)
    fields.userId = `userId must be ${USER_ID_MAX_LENGTH} characters or fewer.`;
  else if (!USER_ID_PATTERN.test(userId))
    fields.userId = "userId may only contain letters, numbers, hyphens, and underscores.";

  const userName = data.userName;
  if (userName === undefined || userName === null)
    fields.userName = "userName is required.";
  else if (typeof userName !== "string") fields.userName = "userName must be a string.";
  else if (!userName.trim()) fields.userName = "userName is required.";
  else if (userName.trim().length > USER_NAME_MAX_LENGTH)
    fields.userName = `userName must be ${USER_NAME_MAX_LENGTH} characters or fewer.`;

  const priority = data.priority ?? "medium";
  if (typeof priority !== "string" || !PRIORITIES.includes(priority as Priority))
    fields.priority = "priority must be one of low, medium, or high.";

  if (Object.keys(fields).length) fail(fields);
  return {
    userId: userId as string,
    userName: (userName as string).trim(),
    priority: priority as Priority,
  };
}

export function validateSetQueueOpen(body: unknown): { open: boolean } {
  const data = requireObject(body);
  if (data.open === undefined) fail({ open: "open is required." });
  if (typeof data.open !== "boolean") fail({ open: "open must be a boolean." });
  return { open: data.open };
}

export function validateMoveEntry(body: unknown): { direction: "up" | "down" } {
  const data = requireObject(body);
  if (data.direction === undefined) fail({ direction: "direction is required." });
  if (data.direction !== "up" && data.direction !== "down")
    fail({ direction: 'direction must be "up" or "down".' });
  return { direction: data.direction };
}

/** Validates a route parameter such as a service, entry, or user id. */
export function validateId(value: string, name: string) {
  if (!value || value.length > USER_ID_MAX_LENGTH || !USER_ID_PATTERN.test(value))
    fail({ [name]: `${name} is not a valid identifier.` });
  return value;
}
