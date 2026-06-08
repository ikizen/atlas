"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { EmptyState } from "@/components/empty-state";
import { PinnedSection } from "@/components/pinned-section";
import { RecentStrip } from "@/components/recent-strip";
import { FolderGrid } from "@/components/folder-grid";
import { CommandSearch } from "@/components/command-search";
import { FolderDialog } from "@/components/folder-dialog";
import { useAtlasStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    el.isContentEditable ||
    el.getAttribute("role") === "textbox"
  );
}

export function AtlasApp() {
  const mounted = useMounted();
  const folderCount = useAtlasStore((s) => s.folders.length);
  const addFolder = useAtlasStore((s) => s.addFolder);

  const [searchOpen, setSearchOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
        return;
      }
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    // Capture phase so Cmd/Ctrl+K still toggles the palette closed even while
    // the dialog's focus trap would otherwise swallow the event.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    <div className="relative z-1 mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 sm:py-10">
      <Header
        onOpenSearch={() => setSearchOpen(true)}
        onNewFolder={() => setNewFolderOpen(true)}
      />

      {mounted && (
        <main className="flex flex-1 flex-col gap-8">
          {folderCount === 0 ? (
            <EmptyState onCreate={() => setNewFolderOpen(true)} />
          ) : (
            <>
              <PinnedSection />
              <RecentStrip />
              <FolderGrid />
            </>
          )}
        </main>
      )}

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <FolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        mode="create"
        onSubmit={(draft) => addFolder(draft.name, draft.accent)}
      />
    </div>
  );
}
