"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { EmptyState } from "@/components/empty-state";
import { PinnedSection } from "@/components/pinned-section";
import { RecentStrip } from "@/components/recent-strip";
import { FolderGrid } from "@/components/folder-grid";
import { CommandSearch } from "@/components/command-search";
import { FolderDialog } from "@/components/folder-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAtlasStore, hydrate } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { getSupabaseClient } from "@/lib/supabase/client";
import { SupabaseProvider } from "@/lib/data/supabaseProvider";
import { normalize } from "@/lib/data/localStorageProvider";

const LOCAL_KEY = "atlas:v1";

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

function readLocalData() {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const data = normalize(parsed);
    // Only worth migrating if there's actual content
    if (data.folders.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

function getFirstLoginCookie() {
  return document.cookie.split(";").some((c) => c.trim().startsWith("atlas_first_login="));
}

export function AtlasApp() {
  const mounted = useMounted();
  const folderCount = useAtlasStore((s) => s.folders.length);
  const addFolder = useAtlasStore((s) => s.addFolder);
  const replaceAll = useAtlasStore((s) => s.replaceAll);

  const [searchOpen, setSearchOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [localData, setLocalData] = useState<ReturnType<typeof readLocalData>>(null);
  const [supabaseProvider, setSupabaseProvider] = useState<SupabaseProvider | null>(null);

  // ── Hydration: swap to SupabaseProvider on mount ─────────────────────────
  useEffect(() => {
    const supabase = getSupabaseClient();
    const provider = new SupabaseProvider(supabase);
    setSupabaseProvider(provider);
    hydrate(provider);

    // Migration prompt: check if this is the first login and local data exists
    if (getFirstLoginCookie()) {
      const existing = readLocalData();
      if (existing) {
        setLocalData(existing);
        setMigrationOpen(true);
      }
      // Clear the cookie so we never show the prompt again
      document.cookie = "atlas_first_login=; Max-Age=0; path=/";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-refresh on window focus ─────────────────────────────────────────
  useEffect(() => {
    if (!supabaseProvider) return;
    function onFocus() {
      void supabaseProvider!.load().then((data) => replaceAll(data));
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [supabaseProvider, replaceAll]);

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
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

  // ── Sign out ──────────────────────────────────────────────────────────────
  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // ── Migration: import localStorage data into Supabase ────────────────────
  function handleMigrationConfirm() {
    if (localData && supabaseProvider) {
      replaceAll(localData);
      // Save to Supabase (provider is already swapped)
      void supabaseProvider.save(localData);
    }
    setMigrationOpen(false);
  }

  return (
    <div className="relative z-1 mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 sm:py-10">
      <Header
        onOpenSearch={() => setSearchOpen(true)}
        onNewFolder={() => setNewFolderOpen(true)}
        onSignOut={handleSignOut}
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

      {/* localStorage migration prompt (first login only) */}
      <ConfirmDialog
        open={migrationOpen}
        onOpenChange={setMigrationOpen}
        title="Import your existing data?"
        description={`You have ${localData?.folders.length ?? 0} folder${(localData?.folders.length ?? 0) === 1 ? "" : "s"} saved locally. Import them into your account?`}
        confirmLabel="Import data"
        onConfirm={handleMigrationConfirm}
      />
    </div>
  );
}
