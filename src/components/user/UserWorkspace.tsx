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
import { demoAccount } from "@/data/user-demo";
import { useUserDemo } from "./UserDemoProvider";

import { useCurrentUser } from "@/lib/auth/client-auth";

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/user", icon: <Grid /> },
  { label: "Join queue", href: "/user/join-queue", icon: <Plus /> },
  { label: "Queue status", href: "/user/queue-status", icon: <Clock /> },
  { label: "History", href: "/user/history", icon: <Table /> },
  { label: "Notifications", href: "/user/notifications", icon: <Bell /> },
];

export default function UserWorkspace({ children }: { children: ReactNode }) {
  const { state } = useUserDemo();
  const { user } = useCurrentUser();

  const accountName = user ? user.name : `${demoAccount.name} · Demo`;
  const accountEmail = user ? user.email : demoAccount.email;

  return (
    <AppShell
      navigation={navigation}
      title="User workspace"
      headerActions={
        <>
          <NotificationBell viewAllHref="/user/notifications" />
          <AccountMenu
            name={accountName}
            email={accountEmail}
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
          title="Demo account"
          message="Queue positions and wait times come from the in-memory queue API and are shared with the admin dashboard. The account, history, and notifications are still simulated. Use Reset demo on Queue status to restore the examples."
        />
      </div>
      {state.feedback && (
        <div className="mb-6">
          <Alert
            variant={state.feedback.kind}
            title={
              state.feedback.kind === "error" ? "Queue action failed" : "Queue update"
            }
            message={state.feedback.message}
          />
        </div>
      )}
      {children}
    </AppShell>
  );
}
