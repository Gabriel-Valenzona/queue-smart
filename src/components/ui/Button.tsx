// Visual styles adapted from TailAdmin (MIT).
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

type Appearance = {
  variant?: "primary" | "outline" | "danger";
  size?: "sm" | "md";
  className?: string;
};
const variants = {
  primary:
    "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
  outline:
    "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5",
  danger: "bg-error-600 text-white hover:bg-error-700",
};
function styles({
  variant = "primary",
  size = "md",
  className = "",
}: Appearance) {
  return `inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${size === "sm" ? "px-4 py-3" : "px-5 py-3.5"} ${variants[variant]} ${className}`;
}
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Appearance & { startIcon?: ReactNode; endIcon?: ReactNode };
export default function Button({
  variant,
  size,
  className,
  startIcon,
  endIcon,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={styles({ variant, size, className })}
      {...props}
    >
      {startIcon}
      {children}
      {endIcon}
    </button>
  );
}
export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & Appearance) {
  return <Link className={styles({ variant, size, className })} {...props} />;
}
export function IconButton({
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 ${className}`}
      {...props}
    />
  );
}
