"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useAtlasStore } from "@/lib/store";
import { openAll, openInNewTab } from "@/lib/open";
import type { Link } from "@/lib/types";

export function useOpen() {
  const recordOpen = useAtlasStore((s) => s.recordOpen);
  const dismissed = useAtlasStore((s) => s.settings.dismissedPopupHint);
  const dismissPopupHint = useAtlasStore((s) => s.dismissPopupHint);

  const openLink = useCallback(
    (link: Pick<Link, "id" | "url">) => {
      openInNewTab(link.url);
      recordOpen(link.id);
    },
    [recordOpen],
  );

  const openFolder = useCallback(
    (links: Link[]) => {
      if (links.length === 0) return;
      const blocked = openAll(links.map((l) => l.url));
      links.forEach((l) => recordOpen(l.id));
      if (blocked && !dismissed) {
        toast("Some tabs were blocked", {
          description:
            "Allow pop-ups for this site in your browser to open a whole folder at once.",
          duration: 8000,
          action: {
            label: "Got it",
            onClick: () => dismissPopupHint(),
          },
        });
      }
    },
    [recordOpen, dismissed, dismissPopupHint],
  );

  return { openLink, openFolder };
}
