import type { Metadata } from "next";
import { ToastProvider } from "@/context/ToastContext";
import { AdminStoreProvider } from "@/context/AdminStoreContext";
import AdminNav from "@/components/admin/AdminNav";
import Toaster from "@/components/admin/Toaster";

export const metadata: Metadata = {
  title: "QueueSmart Admin",
  description: "Manage services and queues",
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <ToastProvider>
      <AdminStoreProvider>
        <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          <AdminNav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        </div>
        <Toaster />
      </AdminStoreProvider>
    </ToastProvider>
  );
}
