import { QueueError } from "@/server/queue/errors";
import {
  CONFIGURABLE_CATEGORIES,
  type NotificationCategory,
  type NotificationInput,
  type NotificationPreferencesPatch,
  type NotificationTone,
} from "./types";

export const CATEGORIES: readonly NotificationCategory[] = [
  "queue-update",
  "status-change",
  "service",
  "system",
];
export const TONES: readonly NotificationTone[] = [
  "info",
  "success",
  "warning",
  "error",
];
export const TITLE_MAX_LENGTH = 120;
export const DETAIL_MAX_LENGTH = 500;
export const SERVICE_MAX_LENGTH = 100;
export const FEED_LIMIT_MAX = 100;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const createFields = ["category", "tone", "title", "detail", "service", "createdAt"];

function requireObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    throw new QueueError(
      "validation_error",
      "Request body must be a JSON object.",
    );
  return body as Record<string, unknown>;
}

function fail(fields: Record<string, string>): never {
  throw new QueueError("validation_error", "Some fields are invalid.", fields);
}

function text(
  fields: Record<string, string>,
  data: Record<string, unknown>,
  key: string,
  maxLength: number,
) {
  const value = data[key];
  if (typeof value !== "string") fields[key] = `${key} must be a string.`;
  else if (!value.trim()) fields[key] = `${key} is required.`;
  else if (value.trim().length > maxLength)
    fields[key] = `Use ${maxLength} characters or fewer.`;
  return typeof value === "string" ? value.trim() : "";
}

/**
 * A notification a page asks the module to deliver to the signed-in account.
 * Queue-driven notifications are built on the server and skip this path.
 */
export function validateNotificationInput(
  body: unknown,
  userId: string,
): NotificationInput {
  const data = requireObject(body);
  const fields: Record<string, string> = {};
  for (const key of Object.keys(data))
    if (!createFields.includes(key)) fields[key] = "This field cannot be set here.";

  const title = text(fields, data, "title", TITLE_MAX_LENGTH);
  const detail = text(fields, data, "detail", DETAIL_MAX_LENGTH);
  if (!CATEGORIES.includes(data.category as NotificationCategory))
    fields.category = `category must be one of ${CATEGORIES.join(", ")}.`;
  if (!TONES.includes(data.tone as NotificationTone))
    fields.tone = `tone must be one of ${TONES.join(", ")}.`;

  let service: string | undefined;
  if (data.service !== undefined && data.service !== null) {
    if (typeof data.service !== "string")
      fields.service = "service must be a string.";
    else if (data.service.trim().length > SERVICE_MAX_LENGTH)
      fields.service = `Use ${SERVICE_MAX_LENGTH} characters or fewer.`;
    else service = data.service.trim() || undefined;
  }

  let createdAt: string | undefined;
  if (data.createdAt !== undefined && data.createdAt !== null) {
    if (
      typeof data.createdAt !== "string" ||
      Number.isNaN(Date.parse(data.createdAt))
    )
      fields.createdAt = "createdAt must be an ISO date-time string.";
    else createdAt = new Date(data.createdAt).toISOString();
  }

  if (Object.keys(fields).length) fail(fields);
  return {
    userId,
    category: data.category as NotificationCategory,
    tone: data.tone as NotificationTone,
    title,
    detail,
    service,
    createdAt,
  };
}

export function validateReadUpdate(body: unknown): { read: boolean } {
  const data = requireObject(body);
  if (data.read === undefined) fail({ read: "read is required." });
  if (typeof data.read !== "boolean") fail({ read: "read must be a boolean." });
  return { read: data.read };
}

/** Partial settings: only the keys a request sends are changed. */
export function validatePreferences(body: unknown): NotificationPreferencesPatch {
  const data = requireObject(body);
  const fields: Record<string, string> = {};
  for (const key of Object.keys(data))
    if (key !== "categories" && key !== "quietHours")
      fields[key] = "This field cannot be set here.";

  const result: NotificationPreferencesPatch = {};

  if (data.categories !== undefined) {
    const categories = requireObject(data.categories);
    const selected: NotificationPreferencesPatch["categories"] = {};
    for (const [key, value] of Object.entries(categories)) {
      if (!CONFIGURABLE_CATEGORIES.includes(key as "service"))
        fields[`categories.${key}`] = CATEGORIES.includes(
          key as NotificationCategory,
        )
          ? "This category is always delivered."
          : "Unknown category.";
      else if (typeof value !== "boolean")
        fields[`categories.${key}`] = "Each category must be true or false.";
      else selected[key as NotificationCategory] = value;
    }
    result.categories = selected;
  }

  if (data.quietHours !== undefined) {
    const quietHours = requireObject(data.quietHours);
    for (const key of Object.keys(quietHours))
      if (!["enabled", "start", "end"].includes(key))
        fields[`quietHours.${key}`] = "This field cannot be set here.";
    const enabled = quietHours.enabled;
    if (typeof enabled !== "boolean")
      fields["quietHours.enabled"] = "enabled must be a boolean.";
    for (const key of ["start", "end"] as const) {
      const value = quietHours[key];
      if (typeof value !== "string" || !TIME_PATTERN.test(value))
        fields[`quietHours.${key}`] = "Use a 24-hour time such as 21:00.";
    }
    if (
      enabled === true &&
      typeof quietHours.start === "string" &&
      quietHours.start === quietHours.end
    )
      fields["quietHours.end"] = "Quiet hours must end at a different time.";
    if (!Object.keys(fields).length)
      result.quietHours = {
        enabled: enabled as boolean,
        start: quietHours.start as string,
        end: quietHours.end as string,
      };
  }

  if (Object.keys(fields).length) fail(fields);
  return result;
}

export type FeedQuery = {
  filter: "all" | "unread" | NotificationCategory;
  limit?: number;
};

/** Reads `?filter=` and `?limit=` from a feed request. */
export function validateFeedQuery(params: URLSearchParams): FeedQuery {
  const fields: Record<string, string> = {};
  const filter = params.get("filter") ?? "all";
  if (
    filter !== "all" &&
    filter !== "unread" &&
    !CATEGORIES.includes(filter as NotificationCategory)
  )
    fields.filter = `filter must be all, unread, or one of ${CATEGORIES.join(", ")}.`;

  let limit: number | undefined;
  const rawLimit = params.get("limit");
  if (rawLimit !== null) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > FEED_LIMIT_MAX)
      fields.limit = `limit must be a whole number from 1 to ${FEED_LIMIT_MAX}.`;
  }

  if (Object.keys(fields).length) fail(fields);
  return { filter: filter as FeedQuery["filter"], limit };
}
