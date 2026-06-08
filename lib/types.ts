export const ATLAS_SCHEMA_VERSION = 1;

export type AccentKey =
  | "slate"
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "cyan"
  | "fuchsia";

// `source` is forward-looking: Phase 2 adds "drive" for Google Drive synced links.
export type LinkSource = "manual" | "drive";

export interface Link {
  id: string;
  title: string;
  url: string;
  pinned: boolean;
  source: LinkSource;
  createdAt: number;
}

export interface Folder {
  id: string;
  parentId?: string; // For nested folders
  name: string;
  accent: AccentKey;
  linkIds: string[];
  childFolderIds: string[]; // For nested folders
  createdAt: number;
}

export interface RecentEntry {
  linkId: string;
  openedAt: number;
}

export type ThemeMode = "light" | "dark";

export interface Settings {
  theme: ThemeMode;
  dismissedPopupHint: boolean;
}

export interface AtlasData {
  version: number;
  folders: Folder[];
  links: Record<string, Link>;
  recent: RecentEntry[];
  settings: Settings;
}

export const RECENT_LIMIT = 10;

export function createEmptyData(): AtlasData {
  return {
    version: ATLAS_SCHEMA_VERSION,
    folders: [],
    links: {},
    recent: [],
    settings: { theme: "dark", dismissedPopupHint: false },
  };
}
