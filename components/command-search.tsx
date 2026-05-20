"use client";

import { useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { LinkFavicon } from "@/components/link-favicon";
import { useAtlasStore } from "@/lib/store";
import { useOpen } from "@/hooks/use-open";
import { fuzzyScore } from "@/lib/fuzzy";
import { hostnameOf } from "@/lib/url";
import type { Link } from "@/lib/types";

interface Result {
  link: Link;
  folderName: string;
  accentId: string;
}

export function CommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const folders = useAtlasStore((s) => s.folders);
  const linksMap = useAtlasStore((s) => s.links);
  const { openLink } = useOpen();
  const [query, setQuery] = useState("");

  const all = useMemo<Result[]>(() => {
    const out: Result[] = [];
    for (const f of folders) {
      for (const id of f.linkIds) {
        const link = linksMap[id];
        if (link) out.push({ link, folderName: f.name, accentId: f.id });
      }
    }
    return out;
  }, [folders, linksMap]);

  const results = useMemo(() => {
    if (!query.trim()) return all.slice(0, 8);
    return all
      .map((r) => {
        const score = Math.max(
          fuzzyScore(query, r.link.title),
          fuzzyScore(query, r.link.url),
          fuzzyScore(query, r.folderName) - 2,
        );
        return { r, score };
      })
      .filter((x) => x.score > -1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.r);
  }, [all, query]);

  function choose(link: Link) {
    openLink(link);
    onOpenChange(false);
    setQuery("");
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQuery("");
      }}
      className="sm:max-w-lg"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search links and folders…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No matching links.</CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading={query.trim() ? "Results" : "Jump to"}>
              {results.map(({ link, folderName }) => (
                <CommandItem
                  key={link.id}
                  value={link.id}
                  keywords={[link.title, link.url, folderName]}
                  onSelect={() => choose(link)}
                >
                  <LinkFavicon url={link.url} title={link.title} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{link.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {folderName} ·{" "}
                      {hostnameOf(link.url).replace(/^www\./, "")}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
