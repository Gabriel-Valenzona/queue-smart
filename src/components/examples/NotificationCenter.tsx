"use client";
// The in-app notification center. Static example data; no backend.
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { AccountMenu } from "@/components/layout/HeaderMenus";
import { StatCard } from "@/components/ui/Card";
import NotificationsProvider, {
  useNotifications,
} from "@/components/notifications/NotificationsProvider";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationFeed from "@/components/notifications/NotificationFeed";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";
import NotificationSimulator from "./NotificationSimulator";
import { sampleUserNotifications } from "@/data/notifications";
import Bell from "@/components/icons/Bell";
import Grid from "@/components/icons/Grid";
import Page from "@/components/icons/Page";
import Clock from "@/components/icons/Clock";
import Check from "@/components/icons/Check";
import List from "@/components/icons/List";

const navigation: NavItem[] = [
  { label: "Notifications", href: "/notifications", icon: <Bell /> },
  { label: "Admin dashboard", href: "/admin", icon: <Grid /> },
  { label: "UI kit", href: "/ui-kit", icon: <Page /> },
];

function NotificationCenterContent() {
  const { notifications, unreadCount } = useNotifications();
  const count = (category: string) =>
    notifications.filter((item) => item.category === category).length;
  return (
    <AppShell
      navigation={navigation}
      title="Notifications"
      headerActions={
        <>
          <NotificationBell />
          <AccountMenu
            name="Jordan Lee"
            email="jordan@example.com"
            links={[
              { label: "Home", href: "/" },
              { label: "Admin dashboard", href: "/admin" },
            ]}
          />
        </>
      }
    >
      <PageHeader
        title="Notifications"
        description="Queue updates and status changes, kept in one place."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Notifications" }]}
      />
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Unread"
            value={unreadCount}
            description="Waiting for your attention"
            icon={<Bell />}
          />
          <StatCard
            label="Queue updates"
            value={count("queue-update")}
            description="Position and wait changes"
            icon={<Clock />}
          />
          <StatCard
            label="Status changes"
            value={count("status-change")}
            description="Waiting, almost ready, served"
            icon={<Check className="size-5" />}
          />
          <StatCard
            label="All notifications"
            value={notifications.length}
            description="Example feed for this preview"
            icon={<List />}
          />
        </div>
        <div className="grid items-start gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <NotificationFeed />
          </div>
          <div className="space-y-6">
            <NotificationSimulator />
            <NotificationPreferences />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function NotificationCenter() {
  return (
    <NotificationsProvider initial={sampleUserNotifications}>
      <NotificationCenterContent />
    </NotificationsProvider>
  );
}
