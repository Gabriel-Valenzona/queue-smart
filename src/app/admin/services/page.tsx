"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminStore } from "@/context/AdminStoreContext";
import ServiceForm from "@/components/admin/ServiceForm";
import { PriorityBadge, StatusBadge } from "@/components/admin/Badges";
import type { ServiceInput } from "@/types/admin";

export default function ServicesPage() {
  return (
    <Suspense>
      <ServicesManager />
    </Suspense>
  );
}

function ServicesManager() {
  const { services, getService, createService, updateService } = useAdminStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The service being edited lives in the URL (?edit=id) so the dashboard can link to it.
  const editingId = searchParams.get("edit");
  const editing = editingId ? getService(editingId) : undefined;

  function setEditing(id: string | null) {
    router.replace(id ? `${pathname}?edit=${id}` : pathname, { scroll: false });
  }

  function handleSubmit(input: ServiceInput) {
    if (editing) {
      updateService(editing.id, input);
      setEditing(null);
    } else {
      createService(input);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Services</h1>
        <p className="text-sm text-zinc-500">Create new services or edit existing ones.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <section className="h-fit rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold">
            {editing ? `Edit "${editing.name}"` : "Create a service"}
          </h2>
          {editingId && !editing && (
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              That service could not be found. You can create a new one instead.
            </p>
          )}
          {/* Keying on the id resets the form state when switching between services. */}
          <ServiceForm
            key={editing?.id ?? "new"}
            service={editing}
            onSubmit={handleSubmit}
            onCancel={editing ? () => setEditing(null) : undefined}
          />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">All services ({services.length})</h2>
          <ul className="space-y-3">
            {services.map((service) => (
              <li
                key={service.id}
                className={`rounded-lg border bg-white p-4 dark:bg-zinc-900 ${
                  service.id === editing?.id
                    ? "border-indigo-500 ring-1 ring-indigo-500"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium break-words">{service.name}</h3>
                      <StatusBadge isOpen={service.isOpen} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {service.description}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500">
                      <PriorityBadge priority={service.priority} />
                      <span>~{service.durationMinutes} min</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(service.id)}
                    className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
