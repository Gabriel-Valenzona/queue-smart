import { moduleHandler } from "@/server/modules/http";
import {
  getNotificationDatabase,
  getPreferences,
  updatePreferences,
  validatePreferences,
} from "@/server/notifications";
import { transaction } from "@/server/db/connection";
import { readJson } from "@/server/queue";

/** GET /api/notifications/preferences — the account's delivery settings. */
export async function GET(request: Request) {
  return moduleHandler(request, (user) =>
    Response.json({
      preferences: getPreferences(getNotificationDatabase(), user.id),
    }),
  );
}

/** PUT /api/notifications/preferences — change the categories or quiet hours. */
export async function PUT(request: Request) {
  return moduleHandler(request, async (user) => {
    const patch = validatePreferences(await readJson(request));
    const db = getNotificationDatabase();
    return Response.json({
      preferences: transaction(db, () => updatePreferences(db, user.id, patch)),
    });
  });
}
