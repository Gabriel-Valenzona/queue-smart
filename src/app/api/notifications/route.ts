import { moduleHandler } from "@/server/modules/http";
import {
  clearNotifications,
  createNotification,
  getNotificationStore,
  listNotifications,
  markAllRead,
  validateFeedQuery,
  validateNotificationInput,
  validateReadUpdate,
} from "@/server/notifications";
import { readJson } from "@/server/queue";
import { QueueError } from "@/server/queue/errors";

/** GET /api/notifications?filter=&limit= — the signed-in account's feed. */
export async function GET(request: Request) {
  return moduleHandler(request, (user) => {
    const query = validateFeedQuery(new URL(request.url).searchParams);
    return Response.json(
      listNotifications(getNotificationStore(), user.id, query),
    );
  });
}

/**
 * POST /api/notifications — deliver a notification to the signed-in account.
 * Queue activity is notified by the server; this is for a screen that wants to
 * record something the user just did.
 */
export async function POST(request: Request) {
  return moduleHandler(request, async (user) => {
    const input = validateNotificationInput(await readJson(request), user.id);
    const notification = createNotification(getNotificationStore(), input);
    return notification
      ? Response.json({ notification }, { status: 201 })
      : Response.json(
          {
            suppressed: true,
            message: "This category is switched off in your settings.",
          },
          { status: 200 },
        );
  });
}

/** PATCH /api/notifications { read: true } — mark the whole feed as read. */
export async function PATCH(request: Request) {
  return moduleHandler(request, async (user) => {
    const { read } = validateReadUpdate(await readJson(request));
    if (!read)
      throw new QueueError("validation_error", "Some fields are invalid.", {
        read: "Only marking every notification as read is supported here.",
      });
    const store = getNotificationStore();
    const updated = markAllRead(store, user.id);
    const { unreadCount, total } = listNotifications(store, user.id);
    return Response.json({ updated, unreadCount, total });
  });
}

/** DELETE /api/notifications — clear the signed-in account's feed. */
export async function DELETE(request: Request) {
  return moduleHandler(request, (user) => {
    const removed = clearNotifications(getNotificationStore(), user.id);
    return Response.json({ removed, unreadCount: 0, total: 0 });
  });
}
