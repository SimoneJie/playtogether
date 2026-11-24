"use client";

import type { TitleTag } from "@/lib/types";
import { cn } from "@/lib/cn";

/** 小型称号标签，尽量不占空间。 */
export function TitleBadge({
  title,
  leave,
  className,
}: {
  title?: TitleTag | null;
  leave?: string | null;
  className?: string;
}) {
  if (!title && !leave) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal leading-none text-gray-500",
        className
      )}
    >
      {title && (
        <span className="whitespace-nowrap">
          {title.emoji} {title.name}
        </span>
      )}
      {leave && (
        <span className="whitespace-nowrap text-accent-600">· 🏖️ {leave}</span>
      )}
    </span>
  );
}
