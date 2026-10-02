// Shared notification appearance: one icon and color per category/tone.
import type { ReactNode } from "react";
import type {
  NotificationCategory,
  NotificationTone,
} from "@/data/notifications";
import Bell from "@/components/icons/Bell";
import Check from "@/components/icons/Check";
import Clock from "@/components/icons/Clock";
import List from "@/components/icons/List";

/** Tone drives color only; the title and category label carry the meaning. */
export const toneStyles: Record<
  NotificationTone,
  { chip: string; accent: string; badge: "info" | "success" | "warning" | "error" }
> = {
  info: {
    chip: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400",
    accent: "border-l-blue-light-500",
    badge: "info",
  },
  success: {
    chip: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
    accent: "border-l-success-500",
    badge: "success",
  },
  warning: {
    chip: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
    accent: "border-l-warning-500",
    badge: "warning",
  },
  error: {
    chip: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
    accent: "border-l-error-500",
    badge: "error",
  },
};

export function CategoryIcon({ category }: { category: NotificationCategory }) {
  const icons: Record<NotificationCategory, ReactNode> = {
    "queue-update": <Clock />,
    "status-change": <Check className="size-5" />,
    service: <List />,
    system: <Bell />,
  };
  return icons[category];
}

export function NotificationChip({
  category,
  tone,
  className = "",
}: {
  category: NotificationCategory;
  tone: NotificationTone;
  className?: string;
}) {
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${toneStyles[tone].chip} ${className}`}
    >
      <CategoryIcon category={category} />
    </span>
  );
}
