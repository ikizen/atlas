"use client";

import { useMemo } from "react";
import { PinIcon } from "lucide-react";
import { LinkChip } from "@/components/link-chip";
import { useAtlasStore } from "@/lib/store";
import { useOpen } from "@/hooks/use-open";
import type { Link } from "@/lib/types";

export function PinnedSection() {
  const linksMap = useAtlasStore((s) => s.links);
  const { openLink } = useOpen();

  const pinned = useMemo(
    () =>
      Object.values(linksMap)
        .filter((l): l is Link => Boolean(l) && l.pinned)
        .sort((a, b) => a.createdAt - b.createdAt),
    [linksMap],
  );

  if (pinned.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <PinIcon className="size-3.5" /> Pinned
      </div>
      <div className="flex flex-wrap gap-2">
        {pinned.map((link) => (
          <LinkChip
            key={link.id}
            link={link}
            onOpen={() => openLink(link)}
          />
        ))}
      </div>
    </section>
  );
}
