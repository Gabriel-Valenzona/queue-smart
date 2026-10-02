"use client";
// Full notification list with filters, mark-as-read, and dismissal.
import { useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Bell from "@/components/icons/Bell";
import NotificationRow from "./NotificationRow";
import { useNotifications } from "./NotificationsProvider";
import type { NotificationCategory } from "@/data/notifications";

type Filter = "all" | "unread" | NotificationCategory;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "queue-update", label: "Queue updates" },
  { value: "status-change", label: "Status changes" },
  { value: "service", label: "Services" },
];

export default function NotificationFeed({
  title = "Notifications",
  description = "In-app updates for queue activity and status changes.",
  limit,
  showFilters = true,
}: {
  title?: string;
  description?: string;
  /** Show only the newest entries of the selected filter. */
  limit?: number;
  showFilters?: boolean;
}) {
  const { notifications, unreadCount, setRead, markAllRead, dismiss, clearAll } =
    useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  function matches(value: Filter) {
    if (value === "all") return notifications;
    if (value === "unread") return notifications.filter((item) => !item.read);
    return notifications.filter((item) => item.category === value);
  }
  const visible = limit ? matches(filter).slice(0, limit) : matches(filter);

  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={markAllRead}
              disabled={!unreadCount}
            >
              Mark all read
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearAll}
              disabled={!notifications.length}
            >
              Clear all
            </Button>
          </div>
        }
      />
      {showFilters && (
        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-4 sm:px-5 dark:border-gray-800">
          {filters.map((option) => {
            const count = matches(option.value).length;
            const active = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(option.value)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                }`}
              >
                {option.label}
                <span
                  className={
                    active ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {visible.length ? (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {visible.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onToggleRead={setRead}
              onDismiss={dismiss}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          title={
            notifications.length
              ? "Nothing in this filter"
              : "You’re all caught up"
          }
          description={
            notifications.length
              ? "Choose another filter to see your other notifications."
              : "Queue updates and status changes will appear here."
          }
          icon={<Bell />}
          action={
            notifications.length ? (
              <Button size="sm" variant="outline" onClick={() => setFilter("all")}>
                Show all notifications
              </Button>
            ) : undefined
          }
        />
      )}
    </Card>
  );
}
