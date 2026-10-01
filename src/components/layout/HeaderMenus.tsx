import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Dropdown from "@/components/ui/Dropdown";
import Bell from "@/components/icons/Bell";
import ChevronDown from "@/components/icons/ChevronDown";

export type AccountMenuProps = {
  name: string;
  email: string;
  links: { label: string; href: string }[];
};
export function AccountMenu({ name, email, links }: AccountMenuProps) {
  return (
    <Dropdown
      label="Account menu"
      trigger={
        <>
          <Avatar name={name} />
          <span className="hidden text-sm font-medium sm:block">{name}</span>
          <ChevronDown className="size-4 text-gray-500" />
        </>
      }
    >
      <p className="px-2 pt-1 text-sm font-semibold">{name}</p>
      <p className="mb-3 break-all px-2 text-xs text-gray-500 dark:text-gray-400">
        {email}
      </p>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="block rounded-lg px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {link.label}
        </Link>
      ))}
    </Dropdown>
  );
}
export type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  unread?: boolean;
};
export function NotificationMenu({ items }: { items: NotificationItem[] }) {
  const unread = items.filter((item) => item.unread).length;
  return (
    <Dropdown
      label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      trigger={
        <span className="relative flex size-11 items-center justify-center rounded-full border border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <Bell />
          {unread > 0 && (
            <span className="absolute right-0 top-0 size-2.5 rounded-full border-2 border-white bg-warning-500 dark:border-gray-900" />
          )}
        </span>
      }
    >
      <h2 className="px-2 py-2 font-semibold">Notifications</h2>
      {items.length ? (
        <ul className="max-h-80 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-t border-gray-100 px-2 py-3 dark:border-gray-800"
            >
              <p className="text-sm font-medium">
                {item.title}
                {item.unread && <span className="sr-only"> — Unread</span>}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {item.detail}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {item.time}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-2 text-sm text-gray-500 dark:text-gray-400">
          You’re all caught up.
        </p>
      )}
    </Dropdown>
  );
}
