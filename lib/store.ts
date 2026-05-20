"use client";

import { create } from "zustand";
import { localStorageProvider } from "@/lib/data/localStorageProvider";
import type { DataProvider } from "@/lib/data/provider";
import {
  RECENT_LIMIT,
  createEmptyData,
  type AccentKey,
  type AtlasData,
  type Folder,
  type Link,
  type ThemeMode,
} from "@/lib/types";

// The single seam Phase 2 swaps. Everything below talks to `provider`, never
// to localStorage directly.
const provider: DataProvider = localStorageProvider;

interface AtlasState extends AtlasData {
  // Folder actions
  addFolder: (name: string, accent: AccentKey) => string;
  renameFolder: (id: string, name: string) => void;
  setFolderAccent: (id: string, accent: AccentKey) => void;
  deleteFolder: (id: string) => void;
  reorderFolders: (orderedIds: string[]) => void;

  // Link actions
  addLink: (folderId: string, title: string, url: string) => void;
  editLink: (id: string, title: string, url: string) => void;
  deleteLink: (id: string) => void;
  reorderLinks: (folderId: string, orderedIds: string[]) => void;
  togglePin: (id: string) => void;
  recordOpen: (id: string) => void;

  // Settings / data
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  dismissPopupHint: () => void;
  replaceAll: (data: AtlasData) => void;
  exportData: () => AtlasData;
}

function toData(s: AtlasData): AtlasData {
  return {
    version: s.version,
    folders: s.folders,
    links: s.links,
    recent: s.recent,
    settings: s.settings,
  };
}

const initial = provider.getInitialState();

export const useAtlasStore = create<AtlasState>((set, get) => ({
  ...initial,

  addFolder: (name, accent) => {
    const id = crypto.randomUUID();
    const folder: Folder = {
      id,
      name: name.trim() || "Untitled",
      accent,
      linkIds: [],
      createdAt: Date.now(),
    };
    set((s) => ({ folders: [...s.folders, folder] }));
    return id;
  },

  renameFolder: (id, name) =>
    set((s) => ({
      folders: s.folders.map((f) =>
        f.id === id ? { ...f, name: name.trim() || f.name } : f,
      ),
    })),

  setFolderAccent: (id, accent) =>
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, accent } : f)),
    })),

  deleteFolder: (id) =>
    set((s) => {
      const folder = s.folders.find((f) => f.id === id);
      const links = { ...s.links };
      folder?.linkIds.forEach((lid) => delete links[lid]);
      const removed = new Set(folder?.linkIds ?? []);
      return {
        folders: s.folders.filter((f) => f.id !== id),
        links,
        recent: s.recent.filter((r) => !removed.has(r.linkId)),
      };
    }),

  reorderFolders: (orderedIds) =>
    set((s) => {
      const byId = new Map(s.folders.map((f) => [f.id, f]));
      const next = orderedIds
        .map((id) => byId.get(id))
        .filter((f): f is Folder => Boolean(f));
      // Keep any folders not present in the ordered list (defensive).
      for (const f of s.folders) if (!orderedIds.includes(f.id)) next.push(f);
      return { folders: next };
    }),

  addLink: (folderId, title, url) =>
    set((s) => {
      const id = crypto.randomUUID();
      const link: Link = {
        id,
        title: title.trim() || url,
        url,
        pinned: false,
        source: "manual",
        createdAt: Date.now(),
      };
      return {
        links: { ...s.links, [id]: link },
        folders: s.folders.map((f) =>
          f.id === folderId ? { ...f, linkIds: [...f.linkIds, id] } : f,
        ),
      };
    }),

  editLink: (id, title, url) =>
    set((s) => {
      const link = s.links[id];
      if (!link) return {};
      return {
        links: {
          ...s.links,
          [id]: { ...link, title: title.trim() || url, url },
        },
      };
    }),

  deleteLink: (id) =>
    set((s) => {
      const links = { ...s.links };
      delete links[id];
      return {
        links,
        folders: s.folders.map((f) => ({
          ...f,
          linkIds: f.linkIds.filter((lid) => lid !== id),
        })),
        recent: s.recent.filter((r) => r.linkId !== id),
      };
    }),

  reorderLinks: (folderId, orderedIds) =>
    set((s) => ({
      folders: s.folders.map((f) =>
        f.id === folderId ? { ...f, linkIds: orderedIds } : f,
      ),
    })),

  togglePin: (id) =>
    set((s) => {
      const link = s.links[id];
      if (!link) return {};
      return { links: { ...s.links, [id]: { ...link, pinned: !link.pinned } } };
    }),

  recordOpen: (id) =>
    set((s) => {
      if (!s.links[id]) return {};
      const recent = [
        { linkId: id, openedAt: Date.now() },
        ...s.recent.filter((r) => r.linkId !== id),
      ].slice(0, RECENT_LIMIT);
      return { recent };
    }),

  setTheme: (theme) =>
    set((s) => ({ settings: { ...s.settings, theme } })),

  toggleTheme: () =>
    set((s) => ({
      settings: {
        ...s.settings,
        theme: s.settings.theme === "dark" ? "light" : "dark",
      },
    })),

  dismissPopupHint: () =>
    set((s) => ({ settings: { ...s.settings, dismissedPopupHint: true } })),

  replaceAll: (data) =>
    set(() => ({
      version: data.version,
      folders: data.folders,
      links: data.links,
      recent: data.recent,
      settings: data.settings,
    })),

  exportData: () => toData(get()),
}));

// Single persistence subscription: any state change schedules a debounced
// write through the provider. This is the only place storage is written.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
useAtlasStore.subscribe((state) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void provider.save(toData(state));
  }, 250);
});

export const emptyData = createEmptyData;
