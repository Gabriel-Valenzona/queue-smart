// Adapted from TailAdmin AvatarText (MIT).
export default function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <span
      role="img"
      aria-label={name || "Unknown user"}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 ${size === "lg" ? "size-16 text-xl" : size === "sm" ? "size-8 text-xs" : "size-11 text-sm"}`}
    >
      {initials}
    </span>
  );
}
