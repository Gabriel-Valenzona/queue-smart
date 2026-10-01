import type { Metadata } from "next";
import QueueStatusScreen from "@/components/user/QueueStatusScreen";

export const metadata: Metadata = { title: "Queue status" };

export default function QueueStatusPage() {
  return <QueueStatusScreen />;
}
