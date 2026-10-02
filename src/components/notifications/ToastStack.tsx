"use client";
// Floating in-app notifications for the newest events. Display only.
import { useNotifications } from "./NotificationsProvider";
import { NotificationChip, toneStyles } from "./display";
import { categoryLabels } from "@/data/notifications";
import Close from "@/components/icons/Close";

export default function ToastStack() {
  const { toasts, dismissToast } = useNotifications();
  return (
    // The region stays mounted so screen readers announce each new toast.
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 sm:bottom-6 sm:right-6"
    >
      {toasts.map((toast) => (
        <article
          key={toast.id}
          className={`toast-enter pointer-events-auto flex gap-3 rounded-xl border-l-4 bg-white p-4 shadow-theme-lg ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800 ${toneStyles[toast.tone].accent}`}
        >
          <NotificationChip category={toast.category} tone={toast.tone} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {categoryLabels[toast.category]}
            </p>
            <p className="mt-0.5 text-sm font-medium">{toast.title}</p>
            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {toast.detail}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Dismiss notification: ${toast.title}`}
            onClick={() => dismissToast(toast.id)}
            className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Close className="size-4 fill-current" />
          </button>
        </article>
      ))}
    </div>
  );
}
