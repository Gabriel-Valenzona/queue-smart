"use client";
// TailAdmin modal appearance, using a native dialog for modal focus behavior.
import { useId, type ReactNode } from "react";
import useDialog from "./useDialog";
import Close from "@/components/icons/Close";
import { IconButton } from "./Button";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useDialog(open);
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl bg-white p-0 text-gray-800 shadow-theme-xl backdrop:bg-gray-950/40 backdrop:backdrop-blur-sm dark:bg-gray-900 dark:text-white/90"
    >
      <div className="p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <Close />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  );
}
