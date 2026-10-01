"use client";

import Link from "next/link";
import { useAdminStore } from "@/context/AdminStoreContext";
import { PriorityBadge, StatusBadge } from "@/components/admin/Badges";

export default function AdminDashboardPage() {
  const { services, queues, toggleQueueOpen } = useAdminStore();

  const totalWaiting = services.reduce((sum, s) => sum + (queues[s.id]?.length ?? 0), 0);
  const openCount = services.filter((s) => s.isOpen).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-500">Overview of all services and their queues.</p>
        </div>
        <Link
          href="/admin/services"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New service
        </Link>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <Stat label="Services" value={services.length} />
        <Stat label="Open queues" value={openCount} />
        <Stat label="Users waiting" value={totalWaiting} />
      </dl>

      {services.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No services yet. Create one to get started.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const waiting = queues[service.id]?.length ?? 0;
            return (
              <li
                key={service.id}
                className="flex flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{service.name}</h2>
                  <StatusBadge isOpen={service.isOpen} />
                </div>
                <p className="mb-4 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {service.description}
                </p>
                <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                  <PriorityBadge priority={service.priority} />
                  <span className="text-zinc-500">~{service.durationMinutes} min</span>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-semibold tabular-nums">{waiting}</span>{" "}
                  <span className="text-sm text-zinc-500">in queue</span>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleQueueOpen(service.id)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      service.isOpen
                        ? "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {service.isOpen ? "Close queue" : "Open queue"}
                  </button>
                  <Link
                    href={`/admin/queues?service=${service.id}`}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
                  >
                    Manage queue
                  </Link>
                  <Link
                    href={`/admin/services?edit=${service.id}`}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
