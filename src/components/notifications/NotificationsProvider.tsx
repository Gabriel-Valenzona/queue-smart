"use client";
/**
 * Holds the notifications a page displays, in React state only.
 * Pages call `notify` from their own interactions; this provider never decides
 * when a notification happens and never stores one past a page reload.
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
import ToastStack from "./ToastStack";

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
  dismissToast: (id: string) => void;
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
  showToasts = true,
  toastDuration = 6000,
}: {
  children: ReactNode;
  /** Static example feed for this page. */
  initial?: Notification[];
  /** Render the floating in-app toasts for new notifications. */
  showToasts?: boolean;
  /** Milliseconds a toast stays on screen. */
  toastDuration?: number;
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initial);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const created = useRef(0);

  const notify = useCallback(
    (event: NewNotification) => {
      created.current += 1;
      const item: Notification = {
        ...event,
        id: `new-${created.current}`,
        time: event.time ?? "Just now",
        read: false,
      };
      setNotifications((current) => [item, ...current]);
      if (showToasts) setToasts((current) => [...current, item].slice(-3));
    },
    [showToasts],
  );

  const setRead = useCallback((id: string, read: boolean) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read } : item)),
    );
  }, []);

  const markRead = useCallback(
    (id: string) => setRead(id, true),
    [setRead],
  );

  const markAllRead = useCallback(() => {
    setNotifications((current) =>
      current.map((item) => (item.read ? item : { ...item, read: true })),
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setToasts([]);
  }, []);

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
      dismissToast,
    }),
    [
      notifications,
      toasts,
      notify,
      setRead,
      markRead,
      markAllRead,
      dismiss,
      clearAll,
      dismissToast,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {showToasts && <ToastStack />}
    </NotificationsContext.Provider>
  );
}
