import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import NotificationFeed from "@/components/notifications/NotificationFeed";

export const metadata: Metadata = { title: "Notifications" };

export default function UserNotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Review the demo queue updates and status changes for this account."
        breadcrumbs={[
          { label: "Dashboard", href: "/user" },
          { label: "Notifications" },
        ]}
      />
      <NotificationFeed description="Example notifications and updates from your simulated queue interactions." />
    </>
  );
}
