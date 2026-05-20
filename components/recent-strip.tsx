"use client";

import { useMemo } from "react";
import { ClockIcon } from "lucide-react";
import { LinkChip } from "@/components/link-chip";
import { useAtlasStore } from "@/lib/store";
import { useOpen } from "@/hooks/use-open";
import type { Link } from "@/lib/types";

export function RecentStrip() {
  const recent = useAtlasStore((s) => s.recent);
  const linksMap = useAtlasStore((s) => s.links);
  const { openLink } = useOpen();

  const items = useMemo(
    () =>
      recent
        .map((r) => linksMap[r.linkId])
        .filter((l): l is Link => Boolean(l)),
    [recent, linksMap],
  );

  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <ClockIcon className="size-3.5" /> Recent
      </div>
      <div className="atlas-scroll flex gap-2 overflow-x-auto pb-1">
        {items.map((link) => (
          <LinkChip
            key={link.id}
            link={link}
            onOpen={() => openLink(link)}
            className="shrink-0"
          />
        ))}
      </div>
    </section>
  );
}
