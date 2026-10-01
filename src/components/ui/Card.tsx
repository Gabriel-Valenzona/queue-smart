// Visual styles adapted from TailAdmin ComponentCard (MIT).
import type { HTMLAttributes, ReactNode } from "react";

export default function Card({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
export function CardBody({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 sm:p-6 ${className}`} {...props} />;
}
export function StatCard({
  label,
  value,
  icon,
  description,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  description?: string;
}) {
  return (
    <Card className="p-5 sm:p-6">
      {icon && (
        <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {icon}
        </div>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-title-sm font-semibold">{value}</p>
      {description && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </Card>
  );
}
