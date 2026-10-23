"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  createInitialUserDemo,
  createUserDemoNotifications,
} from "@/data/user-demo";
import { ApiError, queueApi } from "@/lib/api/queues";
import { getJoinError, reconcileParticipation } from "@/lib/user-demo";
import { usePolling } from "@/lib/usePolling";
import NotificationsProvider, {
  useNotifications,
} from "@/components/notifications/NotificationsProvider";
import type { UserDemoState } from "@/types/user-demo";
import type { AuthApiResponse, User } from "@/types/auth";
import Button, { ButtonLink } from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";

/** How often the user screens re-check the queue API for admin changes. */
const POLL_INTERVAL_MS = 4000;

type UserDemoContextValue = {
  user: User;
  state: UserDemoState;
  joinQueue: (serviceId: string) => Promise<void>;
  leaveQueue: () => Promise<void>;
  /** Demo stand-in for an administrator serving the person at the front. */
  advanceQueue: () => Promise<void>;
  resetDemo: () => Promise<void>;
};
const UserDemoContext = createContext<UserDemoContextValue | null>(null);

function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "The queue service could not be reached.";
}

/** Verify the existing session API before any account-specific queue requests. */
export default function UserDemoProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<{
    user: User | null;
    loading: boolean;
    error: string | null;
  }>({ user: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const rejectSession = useCallback(() => {
    setSession({ user: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    let disposed = false;
    let sequence = 0;
    let controller: AbortController | undefined;
    async function verify() {
      const started = ++sequence;
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (disposed || started !== sequence) return;
        if (response.status === 401 || response.status === 404) {
          rejectSession();
          return;
        }
        if (!response.ok) throw new Error("Session could not be verified.");
        const body: AuthApiResponse = await response.json();
        if (!body.success || !body.user)
          throw new Error("Session could not be verified.");
        if (!disposed && started === sequence)
          setSession({ user: body.user, loading: false, error: null });
      } catch {
        if (!disposed && started === sequence)
          setSession({
            user: null,
            loading: false,
            error: "Your account could not be loaded. Please retry.",
          });
      }
    }
    void verify();
    window.addEventListener("focus", verify);
    return () => {
      disposed = true;
      controller?.abort();
      window.removeEventListener("focus", verify);
    };
  }, [attempt, rejectSession]);

  if (session.loading)
    return (
      <Card>
        <CardBody>
          <p role="status">Loading your account…</p>
        </CardBody>
      </Card>
    );
  if (!session.user)
    return (
      <Card>
        <CardBody>
          {session.error ? (
            <>
              <Alert
                variant="error"
                title="Account unavailable"
                message={session.error}
              />
              <Button
                className="mt-4"
                onClick={() => {
                  setSession({ user: null, loading: true, error: null });
                  setAttempt((value) => value + 1);
                }}
              >
                Retry
              </Button>
            </>
          ) : (
            <>
              <p className="mb-4">Sign in to use your workspace.</p>
              <ButtonLink href="/login">Sign in</ButtonLink>
            </>
          )}
        </CardBody>
      </Card>
    );
  return (
    <NotificationsProvider
      key={session.user.id}
      initial={createUserDemoNotifications()}
    >
      <AuthenticatedWorkspace user={session.user} rejectSession={rejectSession}>
        {children}
      </AuthenticatedWorkspace>
    </NotificationsProvider>
  );
}

function AuthenticatedWorkspace({
  children,
  user,
  rejectSession,
}: {
  children: ReactNode;
  user: User;
  rejectSession: () => void;
}) {
  const [state, setState] = useState(createInitialUserDemo);
  // Event handlers and polling read the latest state before React re-renders.
  const latestState = useRef(state);
  // Bumped by every user action so stale poll responses are ignored.
  const version = useRef(0);
  const requestSequence = useRef(0);
  const mounted = useRef(true);
  const { notify, resetNotifications } = useNotifications();
  const router = useRouter();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const update = useCallback((patch: Partial<UserDemoState>) => {
    if (!mounted.current) return;
    latestState.current = { ...latestState.current, ...patch };
    setState(latestState.current);
  }, []);

  const refresh = useCallback(async () => {
    if (!mounted.current) return;
    const startedAt = version.current;
    const requestAt = ++requestSequence.current;
    try {
      const [services, participation] = await Promise.all([
        queueApi.list(),
        queueApi.participation(user.id),
      ]);
      if (
        !mounted.current ||
        version.current !== startedAt ||
        requestAt !== requestSequence.current
      )
        return;
      const { patch, notifications } = reconcileParticipation(
        latestState.current,
        participation,
      );
      update({ ...patch, services, loadError: null });
      notifications.forEach(notify);
    } catch (error) {
      if (
        !mounted.current ||
        version.current !== startedAt ||
        requestAt !== requestSequence.current
      )
        return;
      if (error instanceof ApiError && error.status === 401) {
        rejectSession();
        return;
      }
      if (version.current === startedAt)
        update({ loadError: "Queue data could not be loaded. Retrying…" });
    }
  }, [notify, update, user.id, rejectSession]);

  usePolling(refresh, POLL_INTERVAL_MS);

  async function joinQueue(serviceId: string) {
    const error = getJoinError(latestState.current, serviceId);
    if (error) return update({ feedback: { kind: "error", message: error } });
    version.current++;
    try {
      const { entry } = await queueApi.join(serviceId, {
        userId: user.id,
        userName: user.name,
      });
      if (!mounted.current) return;
      const name =
        latestState.current.services?.find((item) => item.id === serviceId)
          ?.name ?? "the service";
      update({
        justServed: null,
        feedback: {
          kind: "success",
          message: `You joined the queue for ${name}.`,
        },
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
      if (mounted.current) router.push("/user/queue-status");
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
      if (!mounted.current) return;
      update({
        current: null,
        feedback: {
          kind: "success",
          message: `You left the queue for ${current.service.name}.`,
        },
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
      if (!mounted.current) return;
      latestState.current = createInitialUserDemo();
      setState(latestState.current);
      resetNotifications(createUserDemoNotifications());
    } catch (error) {
      update({ feedback: { kind: "error", message: errorMessage(error) } });
    }
    await refresh();
  }

  return (
    <UserDemoContext.Provider
      value={{ user, state, joinQueue, leaveQueue, advanceQueue, resetDemo }}
    >
      {children}
    </UserDemoContext.Provider>
  );
}

export function useUserDemo() {
  const value = useContext(UserDemoContext);
  if (!value) throw new Error("User screens must be inside UserDemoProvider.");
  return value;
}
