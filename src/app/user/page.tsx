import type { Metadata } from "next";
import DashboardScreen from "@/components/user/DashboardScreen";

export const metadata: Metadata = { title: "User dashboard" };

export default function UserDashboardPage() {
  return <DashboardScreen />;
}
