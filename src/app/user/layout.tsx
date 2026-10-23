import type { ReactNode } from "react";
import UserDemoProvider from "@/components/user/UserDemoProvider";
import UserWorkspace from "@/components/user/UserWorkspace";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <UserDemoProvider>
      <UserWorkspace>{children}</UserWorkspace>
    </UserDemoProvider>
  );
}
