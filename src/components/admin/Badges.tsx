import type { Priority } from "@/types/admin";

const priorityStyles: Record<Priority, string> = {
  low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priorityStyles[priority]}`}
    >
      {priority}
    </span>
  );
}

export function StatusBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        isOpen
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-emerald-500" : "bg-zinc-500"}`} />
      {isOpen ? "Open" : "Closed"}
    </span>
  );
}
