"use client";

import { LinkFavicon } from "@/components/link-favicon";
import type { Link } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LinkChip({
  link,
  onOpen,
  className,
}: {
  link: Link;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={link.url}
      className={cn(
        "group/chip flex max-w-[220px] items-center gap-2 rounded-lg border bg-card/40 px-2.5 py-1.5 text-sm transition-colors hover:border-foreground/20 hover:bg-muted",
        className,
      )}
    >
      <LinkFavicon url={link.url} title={link.title} />
      <span className="truncate font-medium">{link.title}</span>
    </button>
  );
}
