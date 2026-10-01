import Link from "next/link";
import type { ReactNode } from "react";
import ArrowRight from "@/components/icons/ArrowRight";
export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  action,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((item, index) => (
                <li key={item.label} className="flex items-center gap-2">
                  {index > 0 && <ArrowRight className="size-4 text-gray-400" />}
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="text-gray-500 hover:text-brand-500 dark:text-gray-400"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {action}
      </div>
    </div>
  );
}
