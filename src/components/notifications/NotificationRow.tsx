// One notification in a list. Presentation only; the page owns the actions.
import Badge from "@/components/ui/Badge";
import Check from "@/components/icons/Check";
import Close from "@/components/icons/Close";
import EyeOff from "@/components/icons/EyeOff";
import { categoryLabels, type Notification } from "@/data/notifications";
import { NotificationChip } from "./display";

export default function NotificationRow({
  notification,
  onToggleRead,
  onDismiss,
  compact = false,
}: {
  notification: Notification;
  onToggleRead?: (id: string, read: boolean) => void;
  onDismiss?: (id: string) => void;
  /** Tighter spacing for the header panel and dashboard summaries. */
  compact?: boolean;
}) {
  const { id, title, detail, service, time, createdAt, category, tone, read } =
    notification;
  return (
    <li
      className={`flex gap-3 ${compact ? "rounded-lg px-3 py-3" : "px-4 py-4 sm:px-5"} ${
        read ? "" : "bg-brand-25 dark:bg-brand-500/5"
      }`}
    >
      <NotificationChip category={category} tone={tone} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {categoryLabels[category]}
          </span>
          {service && (
            <Badge color="light" size="sm">
              {service}
            </Badge>
          )}
          {!read && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 dark:text-brand-400">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-brand-500 dark:bg-brand-400"
              />
              New
            </span>
          )}
        </div>
        <p className="mt-1 text-sm font-medium">{title}</p>
        <p
          className={`mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400 ${compact ? "line-clamp-2" : ""}`}
        >
          {detail}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {createdAt ? <time dateTime={createdAt}>{time}</time> : time}
        </p>
      </div>
      {(onToggleRead || onDismiss) && (
        <div className="flex shrink-0 items-start gap-1">
          {onToggleRead && (
            <button
              type="button"
              aria-label={`Mark “${title}” as ${read ? "unread" : "read"}`}
              title={read ? "Mark as unread" : "Mark as read"}
              onClick={(event) => {
                event.stopPropagation();
                onToggleRead(id, !read);
              }}
              className="flex size-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {read ? <EyeOff className="size-4" /> : <Check />}
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              aria-label={`Dismiss “${title}”`}
              title="Dismiss"
              onClick={(event) => {
                event.stopPropagation();
                onDismiss(id);
              }}
              className="flex size-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Close className="size-4 fill-current" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
