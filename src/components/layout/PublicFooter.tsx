import Link from "next/link";
import Brand from "./Brand";
export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-3 py-5 sm:px-6">
        <Brand />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          University of Houston · COSC 4353 student project
        </p>
        <Link
          href="/ui-kit"
          className="text-sm font-medium text-gray-600 underline-offset-4 hover:underline dark:text-gray-300"
        >
          Explore the UI kit
        </Link>
      </div>
    </footer>
  );
}
