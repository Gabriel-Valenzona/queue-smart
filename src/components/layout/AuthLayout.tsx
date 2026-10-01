// Composition adapted from TailAdmin authentication layout (MIT).
import Link from "next/link";
import type { ReactNode } from "react";
import Brand from "./Brand";
import ThemeToggle from "./ThemeToggle";
import ChevronLeft from "@/components/icons/ChevronLeft";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-2 dark:bg-gray-900">
      <main className="flex flex-col px-6 pb-10 sm:px-12">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="QueueSmart home">
            <Brand />
          </Link>
          <ThemeToggle />
        </div>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-1 self-start text-sm text-gray-500 hover:text-brand-500 dark:text-gray-400"
        >
          <ChevronLeft />
          Back to home
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          {children}
        </div>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          COSC 4353 · Frontend preview
        </p>
      </main>
      <aside className="relative hidden overflow-hidden bg-brand-950 lg:flex lg:items-center lg:justify-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10 [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        />
        <div className="relative max-w-sm px-6 text-center">
          <Brand inverse />
          <h2 className="mt-8 text-3xl font-medium text-white">
            A clearer view of your wait.
          </h2>
          <p className="mt-4 leading-7 text-white/70">
            Find a service, join its queue, and keep track of your place with
            QueueSmart.
          </p>
        </div>
      </aside>
    </div>
  );
}
