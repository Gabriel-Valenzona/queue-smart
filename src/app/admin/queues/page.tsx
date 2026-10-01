"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminStore } from "@/context/AdminStoreContext";
import { StatusBadge } from "@/components/admin/Badges";

export default function QueuesPage() {
  return (
    <Suspense>
      <QueueManager />
    </Suspense>
  );
}

function formatWait(joinedAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(joinedAt).getTime()) / 60_000));
  return minutes < 1 ? "just now" : `${minutes} min ago`;
}

function QueueManager() {
  const { services, queues, nowServing, toggleQueueOpen, moveEntry, removeEntry, serveNext } =
    useAdminStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Selected service lives in the URL (?service=id) so the dashboard can deep-link here.
  const requestedId = searchParams.get("service");
  const service = services.find((s) => s.id === requestedId) ?? services[0];
  const queue = service ? (queues[service.id] ?? []) : [];
  const serving = service ? nowServing[service.id] : undefined;

  function selectService(id: string) {
    router.replace(`${pathname}?service=${id}`, { scroll: false });
  }

  if (!service) {
    return <p className="text-sm text-zinc-500">No services exist yet. Create one first.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Queue management</h1>
          <p className="text-sm text-zinc-500">Reorder, remove, and serve users in a queue.</p>
        </div>
        <div>
          <label htmlFor="queue-service" className="mb-1 block text-sm font-medium">
            Service
          </label>
          <select
            id="queue-service"
            value={service.id}
            onChange={(e) => selectService(e.target.value)}
            className="w-64 max-w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({queues[s.id]?.length ?? 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{service.name}</h2>
            <StatusBadge isOpen={service.isOpen} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleQueueOpen(service.id)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {service.isOpen ? "Close queue" : "Open queue"}
            </button>
            <button
              type="button"
              onClick={() => serveNext(service.id)}
              disabled={queue.length === 0}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Serve next
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-800/60">
          <span className="text-zinc-500">Now serving: </span>
          <span className="font-medium">{serving ? serving.userName : "No one yet"}</span>
          <span className="ml-4 text-zinc-500">
            Est. wait for last in line: ~{queue.length * service.durationMinutes} min
          </span>
        </div>
      </section>

      {queue.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          This queue is empty.
        </p>
      ) : (
        <ol className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {queue.map((entry, index) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold tabular-nums dark:bg-zinc-800">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{entry.userName}</p>
                <p className="text-xs text-zinc-500" suppressHydrationWarning>Joined {formatWait(entry.joinedAt)}</p>
              </div>
              <div className="flex gap-1">
                <IconButton
                  label={`Move ${entry.userName} up`}
                  disabled={index === 0}
                  onClick={() => moveEntry(service.id, entry.id, "up")}
                >
                  &uarr;
                </IconButton>
                <IconButton
                  label={`Move ${entry.userName} down`}
                  disabled={index === queue.length - 1}
                  onClick={() => moveEntry(service.id, entry.id, "down")}
                >
                  &darr;
                </IconButton>
                <button
                  type="button"
                  onClick={() => removeEntry(service.id, entry.id)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="h-8 w-8 rounded-md border border-zinc-300 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
