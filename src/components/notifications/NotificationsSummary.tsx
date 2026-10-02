"use client";
// Compact notifications card for the user and admin dashboards.
import Link from "next/link";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import NotificationRow from "./NotificationRow";
import { useNotifications } from "./NotificationsProvider";

export default function NotificationsSummary({
  href,
  limit = 3,
  title = "Notifications",
  description = "Your latest queue updates.",
}: {
  /** Link to the full notification list, when that page exists. */
  href?: string;
  limit?: number;
  title?: string;
  description?: string;
}) {
  const { notifications, unreadCount, setRead } = useNotifications();
  const recent = notifications.slice(0, limit);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title={title}
        description={description}
        action={
          unreadCount > 0 ? (
            <Badge color="warning" size="sm">
              {unreadCount} unread
            </Badge>
          ) : (
            <Badge color="success" size="sm">
              All read
            </Badge>
          )
        }
      />
      {recent.length ? (
        <ul className="flex-1 divide-y divide-gray-100 p-2 dark:divide-gray-800">
          {recent.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onToggleRead={setRead}
              compact
            />
          ))}
        </ul>
      ) : (
        <CardBody className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You’re all caught up. New queue updates will appear here.
          </p>
        </CardBody>
      )}
      {href && (
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <Link
            href={href}
            className="text-sm font-medium text-brand-500 hover:underline dark:text-brand-400"
          >
            View all notifications
          </Link>
        </div>
      )}
    </Card>
  );
}
