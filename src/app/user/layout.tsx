import type { ReactNode } from "react";
import UserDemoProvider from "@/components/user/UserDemoProvider";
import UserWorkspace from "@/components/user/UserWorkspace";
import NotificationsProvider from "@/components/notifications/NotificationsProvider";
import { createUserDemoNotifications } from "@/data/user-demo";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <NotificationsProvider initial={createUserDemoNotifications()}>
      <UserDemoProvider>
        <UserWorkspace>{children}</UserWorkspace>
      </UserDemoProvider>
    </NotificationsProvider>
  );
}
