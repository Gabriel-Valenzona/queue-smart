"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  createInitialUserDemo,
  createUserDemoNotifications,
  demoAccount,
} from "@/data/user-demo";
import { ApiError, queueApi } from "@/lib/api/queues";
import { getJoinError, reconcileParticipation, toHistoryRecord } from "@/lib/user-demo";
import { usePolling } from "@/lib/usePolling";
import { useNotifications } from "@/components/notifications/NotificationsProvider";
import type { UserDemoState } from "@/types/user-demo";

/** How often the user screens re-check the queue API for admin changes. */
const POLL_INTERVAL_MS = 4000;

type UserDemoContextValue = {
  state: UserDemoState;
  joinQueue: (serviceId: string) => Promise<void>;
  leaveQueue: () => Promise<void>;
  /** Demo stand-in for an administrator serving the person at the front. */
  advanceQueue: () => Promise<void>;
  resetDemo: () => Promise<void>;
};
const UserDemoContext = createContext<UserDemoContextValue | null>(null);

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "The queue service could not be reached.";
}

export default function UserDemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(createInitialUserDemo);
  // Event handlers and polling read the latest state before React re-renders.
  const latestState = useRef(state);
  // Bumped by every user action so stale poll responses are ignored.
  const version = useRef(0);
  const { notify, resetNotifications } = useNotifications();
  const router = useRouter();

  const update = useCallback((patch: Partial<UserDemoState>) => {
    latestState.current = { ...latestState.current, ...patch };
    setState(latestState.current);
  }, []);

  const refresh = useCallback(async () => {
    const startedAt = version.current;
    try {
      const [services, participation] = await Promise.all([
        queueApi.list(),
        queueApi.participation(demoAccount.id),
      ]);
      if (version.current !== startedAt) return;
      const { patch, notifications } = reconcileParticipation(
        latestState.current,
        participation,
      );
      update({ ...patch, services, loadError: null });
      notifications.forEach(notify);
    } catch {
      if (version.current === startedAt)
        update({ loadError: "Queue data could not be loaded. Retrying…" });
    }
  }, [notify, update]);

  usePolling(refresh, POLL_INTERVAL_MS);

  async function joinQueue(serviceId: string) {
    const error = getJoinError(latestState.current, serviceId);
    if (error) return update({ feedback: { kind: "error", message: error } });
    version.current++;
    try {
      const { entry } = await queueApi.join(serviceId, {
        userId: demoAccount.id,
        userName: demoAccount.name,
      });
      const name =
        latestState.current.services?.find((item) => item.id === serviceId)?.name ?? "the service";
      update({
        justServed: null,
        feedback: { kind: "success", message: `You joined the queue for ${name}.` },
      });
      notify({
        category: "queue-update",
        tone: "info",
        title: "You’re in the queue",
        detail: `${name}: position ${entry.position}, estimated wait ${entry.estimatedWaitMinutes} minutes.`,
        service: name,
        createdAt: entry.joinedAt,
      });
      await refresh();
      router.push("/user/queue-status");
    } catch (error) {
      update({ feedback: { kind: "error", message: errorMessage(error) } });
      await refresh();
    }
  }

  async function leaveQueue() {
    const current = latestState.current.current;
    if (!current) return;
    version.current++;
    try {
      const { record } = await queueApi.leave(current.serviceId, current.id);
      update({
        current: null,
        history: [toHistoryRecord(record, current.service.name), ...latestState.current.history],
        feedback: { kind: "success", message: `You left the queue for ${current.service.name}.` },
      });
      notify({
        category: "status-change",
        tone: "warning",
        title: "Queue canceled",
        detail: `You left the queue for ${current.service.name}.`,
        service: current.service.name,
        createdAt: record.completedAt,
      });
    } catch (error) {
      update({ feedback: { kind: "error", message: errorMessage(error) } });
    }
    await refresh();
  }

  async function advanceQueue() {
    const current = latestState.current.current;
    if (!current) return;
    try {
      await queueApi.serveNext(current.serviceId);
    } catch (error) {
      update({ feedback: { kind: "error", message: errorMessage(error) } });
    }
    // The poll comparison raises the "updated", "almost ready", or "served" notice.
    await refresh();
  }

  async function resetDemo() {
    version.current++;
    try {
      await queueApi.resetDemo();
      latestState.current = createInitialUserDemo();
      setState(latestState.current);
      resetNotifications(createUserDemoNotifications());
    } catch (error) {
      update({ feedback: { kind: "error", message: errorMessage(error) } });
    }
    await refresh();
  }

  return (
    <UserDemoContext.Provider value={{ state, joinQueue, leaveQueue, advanceQueue, resetDemo }}>
      {children}
    </UserDemoContext.Provider>
  );
}

export function useUserDemo() {
  const value = useContext(UserDemoContext);
  if (!value) throw new Error("User screens must be inside UserDemoProvider.");
  return value;
}
