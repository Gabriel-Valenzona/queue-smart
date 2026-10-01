"use client";

import type { ReactNode } from "react";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import { AccountMenu, NotificationMenu } from "@/components/layout/HeaderMenus";
import Alert from "@/components/ui/Alert";
import Grid from "@/components/icons/Grid";
import Plus from "@/components/icons/Plus";
import Clock from "@/components/icons/Clock";
import Table from "@/components/icons/Table";
import { demoAccount } from "@/data/user-demo";
import { useUserDemo } from "./UserDemoProvider";

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/user", icon: <Grid /> },
  { label: "Join queue", href: "/user/join-queue", icon: <Plus /> },
  { label: "Queue status", href: "/user/queue-status", icon: <Clock /> },
  { label: "History", href: "/user/history", icon: <Table /> },
];

export default function UserWorkspace({ children }: { children: ReactNode }) {
  const { state } = useUserDemo();
  return (
    <AppShell
      navigation={navigation}
      title="User workspace"
      headerActions={
        <>
          <NotificationMenu items={state.notifications} />
          <AccountMenu
            name={`${demoAccount.name} · Demo`}
            email={demoAccount.email}
            links={[
              { label: "Demo account dashboard", href: "/user" },
              { label: "History", href: "/user/history" },
              { label: "Back to login", href: "/login" },
            ]}
          />
        </>
      }
    >
      <div className="mb-6">
        <Alert
          variant="info"
          title="Frontend demo"
          message="All account, service, queue, history, and notification data is simulated. Changes reset on refresh."
        />
      </div>
      {state.feedback && (
        <div className="mb-6">
          <Alert
            variant={state.feedback.kind}
            title={
              state.feedback.kind === "error" ? "Unable to join" : "Demo update"
            }
            message={state.feedback.message}
          />
        </div>
      )}
      {children}
    </AppShell>
  );
}
