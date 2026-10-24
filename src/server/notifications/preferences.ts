import {
  CONFIGURABLE_CATEGORIES,
  type NotificationCategory,
  type NotificationPreferences,
  type NotificationPreferencesPatch,
  type QuietHours,
} from "./types";

/** Queue updates and status changes matter most, so they start on. */
export function defaultPreferences(): NotificationPreferences {
  return {
    categories: {
      "queue-update": true,
      "status-change": true,
      service: true,
      system: true,
    },
    quietHours: { enabled: false, start: "21:00", end: "07:00" },
  };
}

/** Fills in anything missing and keeps system messages switched on. */
export function normalizePreferences(
  stored: NotificationPreferencesPatch | undefined,
): NotificationPreferences {
  const defaults = defaultPreferences();
  return {
    categories: {
      ...defaults.categories,
      ...stored?.categories,
      system: true,
    },
    quietHours: { ...defaults.quietHours, ...stored?.quietHours },
  };
}

export function isCategoryEnabled(
  preferences: NotificationPreferences,
  category: NotificationCategory,
) {
  if (!CONFIGURABLE_CATEGORIES.includes(category as "service")) return true;
  return preferences.categories[category] !== false;
}

function minutesOfDay(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Quiet hours may wrap past midnight, so the end can be earlier than the start. */
export function isQuietHours(quietHours: QuietHours, at: Date) {
  if (!quietHours.enabled) return false;
  const now = at.getUTCHours() * 60 + at.getUTCMinutes();
  const start = minutesOfDay(quietHours.start);
  const end = minutesOfDay(quietHours.end);
  if (start === end) return false;
  return start < end ? now >= start && now < end : now >= start || now < end;
}
