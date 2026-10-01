"use client";

import { useToast } from "@/context/ToastContext";
import type { ToastVariant } from "@/types/admin";

const variantStyles: Record<ToastVariant, string> = {
  success:
    "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  info: "border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100",
  warning: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  error: "border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
};

export default function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border-l-4 px-4 py-3 text-sm shadow-lg ${variantStyles[toast.variant]}`}
        >
          <p className="flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="opacity-60 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
