"use client";
// Adapted from TailAdmin AppSidebar/AppHeader layout (MIT).
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Brand from "./Brand";
import ThemeToggle from "./ThemeToggle";
import { IconButton } from "@/components/ui/Button";
import Close from "@/components/icons/Close";
import Menu from "@/components/icons/Menu";
import useDialog from "@/components/ui/useDialog";

export type NavItem = { label: string; href: string; icon: ReactNode };
function subscribeLocation(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}
function getHash() {
  return window.location.hash;
}
export default function AppShell({
  children,
  navigation,
  title = "Workspace",
  headerActions,
}: {
  children: ReactNode;
  navigation: NavItem[];
  title?: string;
  headerActions?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hash = useSyncExternalStore(subscribeLocation, getHash, () => "");
  const pathname = usePathname();
  const drawer = useDialog(mobileOpen);
  useEffect(() => {
    if (!mobileOpen) return;
    function resized() {
      if (window.innerWidth >= 1280) setMobileOpen(false);
    }
    window.addEventListener("resize", resized);
    return () => {
      window.removeEventListener("resize", resized);
    };
  }, [mobileOpen]);
  function nav(compact = false) {
    return (
      <nav aria-label="Main navigation" className={compact ? "px-3" : "px-5"}>
        <p
          className={`mb-5 text-xs uppercase tracking-wide text-gray-400 ${compact ? "text-center" : "px-3"}`}
        >
          {compact ? "•••" : title}
        </p>
        <ul className="space-y-1">
          {navigation.map((item, index) => {
            const active = item.href.includes("#")
              ? hash
                ? pathname + hash === item.href
                : index === 0
              : item.href === pathname;
            const NavLink = item.href.includes("#") ? "a" : Link;
            return (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  aria-current={
                    active
                      ? item.href.includes("#")
                        ? "location"
                        : "page"
                      : undefined
                  }
                  title={compact ? item.label : undefined}
                  onClick={() => {
                    setMobileOpen(false);
                  }}
                  className={`menu-item ${active ? "menu-item-active" : "menu-item-inactive"} ${compact ? "justify-center py-3" : ""}`}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center">
                    {item.icon}
                  </span>
                  <span className={compact ? "sr-only" : ""}>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }
  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 dark:bg-gray-900"
      >
        Skip to content
      </a>
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-gray-200 bg-white transition-[width] xl:flex dark:border-gray-800 dark:bg-gray-900 ${collapsed ? "w-[90px]" : "w-[290px]"}`}
      >
        <Link
          href="/"
          aria-label="QueueSmart home"
          className={`mb-6 mt-3 flex ${collapsed ? "justify-center" : "px-3"}`}
        >
          <Brand compact={collapsed} />
        </Link>
        <div className="min-h-0 flex-1 overflow-y-auto">{nav(collapsed)}</div>
        <div className="mt-auto border-t border-gray-100 p-5 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {collapsed ? "A2" : "QueueSmart · COSC 4353"}
        </div>
      </aside>
      <dialog
        ref={drawer}
        aria-label="Navigation"
        onCancel={(e) => {
          e.preventDefault();
          setMobileOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMobileOpen(false);
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-[min(320px,85vw)] max-w-none bg-white p-0 text-gray-800 backdrop:bg-gray-950/50 dark:bg-gray-900 dark:text-white"
      >
        <div className="flex h-full flex-col">
          <div className="mb-5 flex items-center justify-between pr-3">
            <Link href="/" aria-label="QueueSmart home">
              <Brand />
            </Link>
            <IconButton
              label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <Close />
            </IconButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{nav()}</div>
        </div>
      </dialog>
      <div
        className={`transition-[margin] ${collapsed ? "xl:ml-[90px]" : "xl:ml-[290px]"}`}
      >
        <header className="sticky top-0 z-20 flex min-h-20 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gray-200 bg-white px-3 py-2 sm:px-6 xl:py-0 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <IconButton
              label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed(!collapsed)}
              className="hidden rounded-lg xl:flex"
            >
              <Menu />
            </IconButton>
            <IconButton
              label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg xl:hidden"
            >
              <Menu />
            </IconButton>
            <Link href="/" aria-label="QueueSmart home" className="xl:hidden">
              <Brand compact />
            </Link>
            <span className="hidden text-sm text-gray-500 xl:block dark:text-gray-400">
              {title}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            {headerActions}
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-[1536px] p-4 sm:p-6 xl:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
