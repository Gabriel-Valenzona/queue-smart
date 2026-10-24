"use client";
/**
 * Holds the notifications a page displays.
 *
 * With a `userId` the provider is backed by the Notification API: it loads the
 * account's feed, polls for notifications the server raised from queue
 * activity, and sends every read, dismissal, and new notification back. Without
 * one it keeps the supplied examples in React state, which is what the
 * component gallery and the standalone demo use.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { NewNotification, Notification } from "@/data/notifications";
import {
  notificationApi,
  toDisplayNotification,
  type StoredNotification,
} from "@/lib/api/notifications";
import { usePolling } from "@/lib/usePolling";
import ToastStack from "./ToastStack";

/** How often a live feed re-checks the API for server-raised notifications. */
const POLL_INTERVAL_MS = 5000;

export type NotificationsValue = {
  notifications: Notification[];
  unreadCount: number;
  toasts: Notification[];
  notify: (event: NewNotification) => void;
  setRead: (id: string, read: boolean) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  resetNotifications: (items?: Notification[]) => void;
  dismissToast: (id: string) => void;
  /** True when the feed is backed by the API rather than page examples. */
  live: boolean;
  /** Reloads a live feed; does nothing for a page holding examples. */
  refresh: () => Promise<void>;
  /** Set when the API could not be reached. */
  syncError: string | null;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function useNotifications() {
  const value = useContext(NotificationsContext);
  if (!value)
    throw new Error(
      "Wrap the page in NotificationsProvider before using notifications.",
    );
  return value;
}

export default function NotificationsProvider({
  children,
  initial = [],
  userId,
  showToasts = true,
  toastDuration = 6000,
  pollIntervalMs = POLL_INTERVAL_MS,
}: {
  children: ReactNode;
  /** Example feed for a page without an account behind it. */
  initial?: Notification[];
  /** The signed-in account; supplying it reads and writes the real feed. */
  userId?: string;
  /** Render the floating in-app toasts for new notifications. */
  showToasts?: boolean;
  /** Milliseconds a toast stays on screen. */
  toastDuration?: number;
  pollIntervalMs?: number;
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initial);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const created = useRef(0);
  const mounted = useRef(true);
  // Ids already seen, so a poll only announces what is new to this page.
  const announced = useRef(new Set<string>());
  const loaded = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    announced.current = new Set();
    loaded.current = false;
  }, [userId]);

  const show = useCallback(
    (item: Notification) => {
      setNotifications((current) => [item, ...current]);
      if (showToasts) setToasts((current) => [...current, item].slice(-3));
    },
    [showToasts],
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const feed = await notificationApi.list();
      if (!mounted.current) return;
      const now = Date.now();
      setNotifications(
        feed.notifications.map((item) => toDisplayNotification(item, now)),
      );
      const firstLoad = !loaded.current;
      // Quiet-hours notifications stay in the feed without being announced.
      const fresh = feed.notifications.filter(
        (item: StoredNotification) =>
          !announced.current.has(item.id) && !item.read && !item.silent,
      );
      for (const item of feed.notifications) announced.current.add(item.id);
      loaded.current = true;
      if (!firstLoad && showToasts && fresh.length)
        setToasts((current) =>
          [...current, ...fresh.map((item) => toDisplayNotification(item, now))].slice(
            -3,
          ),
        );
      setSyncError(null);
    } catch {
      if (mounted.current)
        setSyncError("Notifications could not be loaded. Retrying…");
    }
  }, [userId, showToasts]);

  usePolling(refresh, pollIntervalMs);

  const notify = useCallback(
    (event: NewNotification) => {
      const local = () => {
        created.current += 1;
        show({
          ...event,
          id: `new-${created.current}`,
          time: event.time ?? "Just now",
          read: false,
        });
      };
      if (!userId) {
        local();
        return;
      }
      void (async () => {
        try {
          const stored = await notificationApi.create({
            category: event.category,
            tone: event.tone,
            title: event.title,
            detail: event.detail,
            service: event.service,
            createdAt: event.createdAt,
          });
          if (!mounted.current) return;
          // Null means the account switched this category off.
          if (!stored) return;
          announced.current.add(stored.id);
          show(toDisplayNotification(stored));
        } catch {
          // Still confirm the action on screen, even if it was not stored.
          if (mounted.current) local();
        }
      })();
    },
    [show, userId],
  );

  const setRead = useCallback(
    (id: string, read: boolean) => {
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read } : item)),
      );
      if (!userId) return;
      void notificationApi.setRead(id, read).catch(() => refresh());
    },
    [refresh, userId],
  );

  const markRead = useCallback((id: string) => setRead(id, true), [setRead]);

  const markAllRead = useCallback(() => {
    setNotifications((current) =>
      current.map((item) => (item.read ? item : { ...item, read: true })),
    );
    if (!userId) return;
    void notificationApi.markAllRead().catch(() => refresh());
  }, [refresh, userId]);

  const dismiss = useCallback(
    (id: string) => {
      setNotifications((current) => current.filter((item) => item.id !== id));
      setToasts((current) => current.filter((item) => item.id !== id));
      if (!userId) return;
      void notificationApi.dismiss(id).catch(() => refresh());
    },
    [refresh, userId],
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
    setToasts([]);
    if (!userId) return;
    void notificationApi.clearAll().catch(() => refresh());
  }, [refresh, userId]);

  /** Restores page-owned examples, or reloads a live feed after a demo reset. */
  const resetNotifications = useCallback(
    (items: Notification[] = []) => {
      setToasts([]);
      if (userId) {
        announced.current = new Set();
        loaded.current = false;
        void refresh();
        return;
      }
      setNotifications(items.map((item) => ({ ...item })));
    },
    [refresh, userId],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  // Retire the oldest visible toast on a timer; the feed entry stays.
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(
      () => setToasts((current) => current.slice(1)),
      toastDuration,
    );
    return () => clearTimeout(timer);
  }, [toasts, toastDuration]);

  const value = useMemo<NotificationsValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      toasts,
      notify,
      setRead,
      markRead,
      markAllRead,
      dismiss,
      clearAll,
      resetNotifications,
      dismissToast,
      live: Boolean(userId),
      refresh,
      syncError,
    }),
    [
      userId,
      notifications,
      toasts,
      notify,
      setRead,
      markRead,
      markAllRead,
      dismiss,
      clearAll,
      resetNotifications,
      dismissToast,
      refresh,
      syncError,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {showToasts && <ToastStack />}
    </NotificationsContext.Provider>
  );
}
