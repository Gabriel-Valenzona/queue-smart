import { moduleHandler } from "@/server/modules/http";
import {
  dismissNotification,
  getNotificationDatabase,
  listNotifications,
  setNotificationRead,
  validateReadUpdate,
} from "@/server/notifications";
import { readJson, validateId } from "@/server/queue";

type Context = RouteContext<"/api/notifications/[notificationId]">;

async function readId(ctx: Context) {
  return validateId((await ctx.params).notificationId, "notificationId");
}

/** PATCH /api/notifications/:id { read } — mark one notification read or unread. */
export async function PATCH(request: Request, ctx: Context) {
  return moduleHandler(request, async (user) => {
    const id = await readId(ctx);
    const { read } = validateReadUpdate(await readJson(request));
    const db = getNotificationDatabase();
    const notification = setNotificationRead(db, user.id, id, read);
    const { unreadCount, total } = listNotifications(db, user.id);
    return Response.json({ notification, unreadCount, total });
  });
}

/** DELETE /api/notifications/:id — dismiss one notification. */
export async function DELETE(request: Request, ctx: Context) {
  return moduleHandler(request, async (user) => {
    const id = await readId(ctx);
    const db = getNotificationDatabase();
    dismissNotification(db, user.id, id);
    const { unreadCount, total } = listNotifications(db, user.id);
    return Response.json({ dismissed: id, unreadCount, total });
  });
}
