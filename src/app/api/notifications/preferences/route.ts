import { moduleHandler } from "@/server/modules/http";
import {
  getNotificationStore,
  getPreferences,
  updatePreferences,
  validatePreferences,
} from "@/server/notifications";
import { readJson } from "@/server/queue";

/** GET /api/notifications/preferences — the account's delivery settings. */
export async function GET(request: Request) {
  return moduleHandler(request, (user) =>
    Response.json({
      preferences: getPreferences(getNotificationStore(), user.id),
    }),
  );
}

/** PUT /api/notifications/preferences — change the categories or quiet hours. */
export async function PUT(request: Request) {
  return moduleHandler(request, async (user) => {
    const patch = validatePreferences(await readJson(request));
    return Response.json({
      preferences: updatePreferences(getNotificationStore(), user.id, patch),
    });
  });
}
