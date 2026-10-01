"use client";
// TailAdmin dropdown appearance; native disclosure with keyboard dismissal.
import { useEffect, useRef, type ReactNode } from "react";

export default function Dropdown({
  label,
  trigger,
  children,
}: {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node))
        ref.current?.removeAttribute("open");
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return (
    <details
      ref={ref}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          ref.current?.removeAttribute("open");
          ref.current?.querySelector("summary")?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          ref.current?.removeAttribute("open");
      }}
    >
      <summary
        aria-label={label}
        className="flex cursor-pointer list-none items-center gap-2 rounded-lg [&::-webkit-details-marker]:hidden"
      >
        {trigger}
      </summary>
      <div
        className="absolute right-0 z-40 mt-3 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a,button")) {
            ref.current?.removeAttribute("open");
            ref.current?.querySelector("summary")?.focus();
          }
        }}
      >
        {children}
      </div>
    </details>
  );
}
