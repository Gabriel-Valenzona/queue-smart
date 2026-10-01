import type { ReactNode } from "react";
export default function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      {icon && (
        <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-500 dark:bg-gray-800">
          {icon}
        </div>
      )}
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
