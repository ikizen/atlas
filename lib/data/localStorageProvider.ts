import type { DataProvider } from "@/lib/data/provider";
import {
  ATLAS_SCHEMA_VERSION,
  createEmptyData,
  type AtlasData,
} from "@/lib/types";

const STORAGE_KEY = "atlas:v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Validate & normalize an unknown parsed blob into AtlasData. Anything that
 * doesn't look right is dropped rather than crashing the app — the user's
 * launcher must always open.
 */
export function normalize(raw: unknown): AtlasData {
  const base = createEmptyData();
  if (!isRecord(raw)) return base;

  const links: AtlasData["links"] = {};
  if (isRecord(raw.links)) {
    for (const [id, l] of Object.entries(raw.links)) {
      if (!isRecord(l)) continue;
      if (typeof l.id !== "string" || typeof l.url !== "string") continue;
      links[id] = {
        id: l.id,
        title: typeof l.title === "string" ? l.title : l.url,
        url: l.url,
        pinned: l.pinned === true,
        source: l.source === "drive" ? "drive" : "manual",
        createdAt: typeof l.createdAt === "number" ? l.createdAt : Date.now(),
      };
    }
  }

  const folders: AtlasData["folders"] = Array.isArray(raw.folders)
    ? raw.folders
        .filter(isRecord)
        .map((f) => ({
          id: String(f.id ?? crypto.randomUUID()),
          parentId: typeof f.parentId === "string" ? f.parentId : undefined,
          name: typeof f.name === "string" ? f.name : "Untitled",
          accent: typeof f.accent === "string" ? (f.accent as AtlasData["folders"][number]["accent"]) : "slate",
          linkIds: Array.isArray(f.linkIds)
            ? (f.linkIds.filter((x) => typeof x === "string" && x in links) as string[])
            : [],
          childFolderIds: Array.isArray(f.childFolderIds)
            ? (f.childFolderIds.filter((x) => typeof x === "string") as string[])
            : [],
          createdAt: typeof f.createdAt === "number" ? f.createdAt : Date.now(),
        }))
    : [];

  const recent: AtlasData["recent"] = Array.isArray(raw.recent)
    ? raw.recent
        .filter(isRecord)
        .filter((r) => typeof r.linkId === "string" && (r.linkId as string) in links)
        .map((r) => ({
          linkId: r.linkId as string,
          openedAt: typeof r.openedAt === "number" ? r.openedAt : Date.now(),
        }))
    : [];

  const settings: AtlasData["settings"] = isRecord(raw.settings)
    ? {
        theme: raw.settings.theme === "light" ? "light" : "dark",
        dismissedPopupHint: raw.settings.dismissedPopupHint === true,
      }
    : base.settings;

  return { version: ATLAS_SCHEMA_VERSION, folders, links, recent, settings };
}

/** Run forward migrations for older schema versions (none yet). */
function migrate(raw: unknown): unknown {
  return raw;
}

export class LocalStorageProvider implements DataProvider {
  getInitialState(): AtlasData {
    if (typeof window === "undefined") return createEmptyData();
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return createEmptyData();
      return normalize(migrate(JSON.parse(stored)));
    } catch {
      return createEmptyData();
    }
  }

  async save(data: AtlasData): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Quota / private-mode failures are non-fatal for the in-memory session.
    }
  }
}

export const localStorageProvider = new LocalStorageProvider();
