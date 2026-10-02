"use client";
// Header bell with an unread count and the recent notification panel.
import Link from "next/link";
import Dropdown from "@/components/ui/Dropdown";
import Bell from "@/components/icons/Bell";
import NotificationRow from "./NotificationRow";
import { useNotifications } from "./NotificationsProvider";

export default function NotificationBell({
  viewAllHref,
  limit = 5,
}: {
  /** Link shown under the list; omit it when no page is available yet. */
  viewAllHref?: string;
  limit?: number;
}) {
  const { notifications, unreadCount, setRead, markAllRead, dismiss } =
    useNotifications();
  const recent = notifications.slice(0, limit);
  return (
    <Dropdown
      label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      panelWidth="w-[22rem]"
      trigger={
        <span className="relative flex size-11 items-center justify-center rounded-full border border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <Bell />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-brand-500 px-1 text-[10px] font-semibold leading-4 text-white dark:border-gray-900"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
      }
    >
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <h2 className="font-semibold">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              {unreadCount} unread
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              markAllRead();
            }}
            className="rounded-lg px-2 py-1 text-xs font-medium text-brand-500 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
          >
            Mark all read
          </button>
        )}
      </div>
      {recent.length ? (
        <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto custom-scrollbar dark:divide-gray-800">
          {recent.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onToggleRead={setRead}
              onDismiss={dismiss}
              compact
            />
          ))}
        </ul>
      ) : (
        <p className="px-1 py-3 text-sm text-gray-500 dark:text-gray-400">
          You’re all caught up.
        </p>
      )}
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="mt-3 block rounded-lg border border-gray-200 py-2 text-center text-sm font-medium hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
        >
          View all notifications
        </Link>
      )}
    </Dropdown>
  );
}
