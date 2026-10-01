"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { QueueEntry, QueueMap, Service, ServiceInput } from "@/types/admin";
import { mockQueues, mockServices } from "@/lib/mockData";
import { createId } from "@/lib/id";
import { useToast } from "@/context/ToastContext";

interface AdminStoreValue {
  services: Service[];
  queues: QueueMap;
  /** The user most recently called up by "serve next", per service. */
  nowServing: Record<string, QueueEntry | undefined>;
  getService: (id: string) => Service | undefined;
  createService: (input: ServiceInput) => Service;
  updateService: (id: string, input: ServiceInput) => void;
  toggleQueueOpen: (serviceId: string) => void;
  moveEntry: (serviceId: string, entryId: string, direction: "up" | "down") => void;
  removeEntry: (serviceId: string, entryId: string) => void;
  serveNext: (serviceId: string) => void;
}

const AdminStoreContext = createContext<AdminStoreValue | null>(null);

export function AdminStoreProvider({ children }: { children: React.ReactNode }) {
  const { notify } = useToast();
  const [services, setServices] = useState<Service[]>(mockServices);
  const [queues, setQueues] = useState<QueueMap>(mockQueues);
  const [nowServing, setNowServing] = useState<Record<string, QueueEntry | undefined>>({});

  const getService = useCallback(
    (id: string) => services.find((s) => s.id === id),
    [services],
  );

  const createService = useCallback(
    (input: ServiceInput) => {
      const service: Service = { ...input, id: createId("svc"), isOpen: false };
      setServices((prev) => [...prev, service]);
      setQueues((prev) => ({ ...prev, [service.id]: [] }));
      notify(`Service "${service.name}" created.`, "success");
      return service;
    },
    [notify],
  );

  const updateService = useCallback(
    (id: string, input: ServiceInput) => {
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...input } : s)));
      notify(`Service "${input.name}" updated.`, "success");
    },
    [notify],
  );

  const toggleQueueOpen = useCallback(
    (serviceId: string) => {
      const service = services.find((s) => s.id === serviceId);
      if (!service) return;
      const isOpen = !service.isOpen;
      setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, isOpen } : s)));
      notify(
        `${service.name} queue is now ${isOpen ? "open" : "closed"}.`,
        isOpen ? "success" : "warning",
      );
    },
    [services, notify],
  );

  const moveEntry = useCallback(
    (serviceId: string, entryId: string, direction: "up" | "down") => {
      const queue = queues[serviceId] ?? [];
      const from = queue.findIndex((e) => e.id === entryId);
      const to = direction === "up" ? from - 1 : from + 1;
      if (from === -1 || to < 0 || to >= queue.length) return;

      const next = [...queue];
      [next[from], next[to]] = [next[to], next[from]];
      setQueues((prev) => ({ ...prev, [serviceId]: next }));
      notify(`${queue[from].userName} moved to position ${to + 1}.`, "info");
    },
    [queues, notify],
  );

  const removeEntry = useCallback(
    (serviceId: string, entryId: string) => {
      const entry = queues[serviceId]?.find((e) => e.id === entryId);
      if (!entry) return;
      setQueues((prev) => ({
        ...prev,
        [serviceId]: (prev[serviceId] ?? []).filter((e) => e.id !== entryId),
      }));
      notify(`${entry.userName} was removed from the queue.`, "warning");
    },
    [queues, notify],
  );

  const serveNext = useCallback(
    (serviceId: string) => {
      const [next, ...rest] = queues[serviceId] ?? [];
      const service = services.find((s) => s.id === serviceId);
      if (!next || !service) {
        notify("No one is waiting in this queue.", "info");
        return;
      }
      setQueues((prev) => ({ ...prev, [serviceId]: rest }));
      setNowServing((prev) => ({ ...prev, [serviceId]: next }));
      notify(`Now serving ${next.userName} for ${service.name}.`, "success");
    },
    [queues, services, notify],
  );

  const value = useMemo<AdminStoreValue>(
    () => ({
      services,
      queues,
      nowServing,
      getService,
      createService,
      updateService,
      toggleQueueOpen,
      moveEntry,
      removeEntry,
      serveNext,
    }),
    [services, queues, nowServing, getService, createService, updateService, toggleQueueOpen, moveEntry, removeEntry, serveNext],
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}

export function useAdminStore() {
  const ctx = useContext(AdminStoreContext);
  if (!ctx) throw new Error("useAdminStore must be used within an AdminStoreProvider");
  return ctx;
}
