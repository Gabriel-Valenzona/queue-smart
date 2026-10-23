"use client";

import type { ReactNode } from "react";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { AccountMenu } from "@/components/layout/HeaderMenus";
import NotificationBell from "@/components/notifications/NotificationBell";
import Alert from "@/components/ui/Alert";
import Grid from "@/components/icons/Grid";
import Plus from "@/components/icons/Plus";
import Clock from "@/components/icons/Clock";
import Table from "@/components/icons/Table";
import Bell from "@/components/icons/Bell";
import { useUserDemo } from "./UserDemoProvider";

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/user", icon: <Grid /> },
  { label: "Join queue", href: "/user/join-queue", icon: <Plus /> },
  { label: "Queue status", href: "/user/queue-status", icon: <Clock /> },
  { label: "History", href: "/user/history", icon: <Table /> },
  { label: "Notifications", href: "/user/notifications", icon: <Bell /> },
];

export default function UserWorkspace({ children }: { children: ReactNode }) {
  const { state, user } = useUserDemo();

  return (
    <AppShell
      navigation={navigation}
      title="User workspace"
      headerActions={
        <>
          <NotificationBell viewAllHref="/user/notifications" />
          <AccountMenu
            name={user.name}
            email={user.email}
            links={[
              { label: "User dashboard", href: "/user" },
              { label: "History", href: "/user/history" },
              ...(user?.role === "admin"
                ? [{ label: "Switch to Admin workspace", href: "/admin" }]
                : []),
              { label: "Log out", href: "/login" },
            ]}
          />
        </>
      }
    >
      <div className="mb-6">
        <Alert
          variant="info"
          title="Assignment 3 workspace"
          message="Your queues and history come from the server and reset when it restarts. Notifications include example messages and in-app queue updates."
        />
      </div>
      {state.feedback && (
        <div className="mb-6">
          <Alert
            variant={state.feedback.kind}
            title={
              state.feedback.kind === "error"
                ? "Queue action failed"
                : "Queue update"
            }
            message={state.feedback.message}
          />
        </div>
      )}
      {children}
    </AppShell>
  );
}
