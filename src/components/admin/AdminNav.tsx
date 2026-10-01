"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/queues", label: "Queues" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/admin" className="text-lg font-semibold tracking-tight">
          QueueSmart <span className="text-sm font-normal text-zinc-500">Admin</span>
        </Link>
        <nav className="flex gap-1">
          {links.map((link) => {
            const active =
              link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
