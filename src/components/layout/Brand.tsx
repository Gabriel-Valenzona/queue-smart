import Image from "next/image";
import { branding } from "@/config/branding";

export default function Brand({
  compact = false,
  showUniversityLogo = branding.showUniversityLogo,
  inverse = false,
}: {
  compact?: boolean;
  showUniversityLogo?: boolean;
  inverse?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center font-semibold tracking-tight ${inverse ? "text-white" : "text-gray-900 dark:text-white"}`}
    >
      {showUniversityLogo && (
        <span className="inline-flex shrink-0 p-[18px]">
          {inverse ? (
            <Image
              src="/brand/uh-white.png"
              alt="University of Houston"
              width={42}
              height={36}
              loading="eager"
              className="h-9 w-auto"
            />
          ) : (
            <>
              <Image
                src="/brand/uh-red.png"
                alt="University of Houston"
                width={42}
                height={36}
                loading="eager"
                className="h-9 w-auto dark:hidden"
              />
              <Image
                src="/brand/uh-white.png"
                alt="University of Houston"
                width={42}
                height={36}
                loading="eager"
                className="hidden h-9 w-auto dark:block"
              />
            </>
          )}
        </span>
      )}
      {!compact && (
        <span
          className={`text-xl sm:text-2xl ${showUniversityLogo ? "pr-2" : "py-6"}`}
        >
          {branding.name}
        </span>
      )}
      {compact && !showUniversityLogo && (
        <span aria-label="QueueSmart" className="py-6 text-xl">
          QS
        </span>
      )}
    </span>
  );
}
