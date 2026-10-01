import Link from "next/link";
import Brand from "./Brand";
import ThemeToggle from "./ThemeToggle";
import { ButtonLink } from "@/components/ui/Button";
export default function PublicHeader() {
  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-3 pb-3 sm:px-6 sm:pb-0">
        <Link href="/" aria-label="QueueSmart home">
          <Brand />
        </Link>
        <nav
          aria-label="Public navigation"
          className="flex items-center gap-3 sm:gap-5"
        >
          <Link
            href="/#overview"
            className="hidden text-sm text-gray-500 hover:text-brand-500 md:block dark:text-gray-400"
          >
            How it works
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium hover:text-brand-500"
          >
            Log in
          </Link>
          <ButtonLink href="/register" size="sm">
            Register
          </ButtonLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
