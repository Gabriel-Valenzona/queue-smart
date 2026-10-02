import type { Metadata } from "next";
import NotificationCenter from "@/components/examples/NotificationCenter";
export const metadata: Metadata = { title: "Notifications" };
export default function NotificationsPage() {
  return <NotificationCenter />;
}
