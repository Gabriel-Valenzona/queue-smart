"use client";
// Gallery preview of the notification system with its own example feed.
import NotificationsProvider from "@/components/notifications/NotificationsProvider";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationFeed from "@/components/notifications/NotificationFeed";
import NotificationsSummary from "@/components/notifications/NotificationsSummary";
import NotificationSimulator from "./NotificationSimulator";
import { ButtonLink } from "@/components/ui/Button";
import ArrowRight from "@/components/icons/ArrowRight";
import { sampleUserNotifications } from "@/data/notifications";

export default function NotificationExample() {
  return (
    <NotificationsProvider initial={sampleUserNotifications.slice(0, 4)}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <NotificationBell viewAllHref="/notifications" />
          <p className="flex-1 text-sm text-gray-500 dark:text-gray-400">
            The header bell shows the unread count and the newest updates. Use
            the buttons below to add one and watch the toast appear.
          </p>
          <ButtonLink href="/notifications" variant="outline" size="sm">
            Open notification center
            <ArrowRight />
          </ButtonLink>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <NotificationsSummary href="/notifications" />
          <NotificationSimulator />
        </div>
        <NotificationFeed limit={4} />
      </div>
    </NotificationsProvider>
  );
}
