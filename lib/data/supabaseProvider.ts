import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataProvider } from "@/lib/data/provider";
import {
  ATLAS_SCHEMA_VERSION,
  createEmptyData,
  type AccentKey,
  type AtlasData,
  type Folder,
  type Link,
  type ThemeMode,
} from "@/lib/types";

// ─── DB row shapes ──────────────────────────────────────────────────────────

interface DbFolder {
  id: string;
  name: string;
  accent: string;
  position: number;
  parent_id: string | null;
  drive_folder_id: string | null;
  drive_folder_name: string | null;
  drive_last_synced_at: string | null;
  created_at: string;
}

interface DbLink {
  id: string;
  folder_id: string;
  title: string;
  url: string;
  position: number;
  pinned: boolean;
  source: string;
  drive_file_id: string | null;
  created_at: string;
}

interface DbRecent {
  link_id: string;
  opened_at: string;
}

interface DbSettings {
  theme: string;
  dismissed_popup_hint: boolean;
}

// ─── SupabaseProvider ────────────────────────────────────────────────────────

export class SupabaseProvider implements DataProvider {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /** Sync; returns empty — real data comes via load(). */
  getInitialState(): AtlasData {
    return createEmptyData();
  }

  async load(): Promise<AtlasData> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return createEmptyData();

    const [foldersRes, linksRes, recentRes, settingsRes] = await Promise.all([
      this.supabase
        .from("folders")
        .select("*")
        .eq("user_id", user.id)
        .order("position"),
      this.supabase
        .from("links")
        .select("*")
        .eq("user_id", user.id)
        .order("position"),
      this.supabase
        .from("recent")
        .select("link_id, opened_at")
        .eq("user_id", user.id)
        .order("opened_at", { ascending: false })
        .limit(10),
      this.supabase
        .from("settings")
        .select("theme, dismissed_popup_hint")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    // Build links map, grouped by folder
    const linksByFolder = new Map<string, DbLink[]>();
    const links: AtlasData["links"] = {};
    for (const row of (linksRes.data ?? []) as DbLink[]) {
      const link: Link = {
        id: row.id,
        title: row.title,
        url: row.url,
        pinned: row.pinned,
        source: row.source === "drive" ? "drive" : "manual",
        createdAt: new Date(row.created_at).getTime(),
        ...(row.drive_file_id ? { driveFileId: row.drive_file_id } : {}),
      };
      links[row.id] = link;
      const group = linksByFolder.get(row.folder_id) ?? [];
      group.push(row);
      linksByFolder.set(row.folder_id, group);
    }

    // Reconstruct childFolderIds from parent_id relationships
    const dbFolderRows = (foldersRes.data ?? []) as DbFolder[];
    const childrenByParent = new Map<string, string[]>();
    for (const row of dbFolderRows) {
      if (row.parent_id) {
        const arr = childrenByParent.get(row.parent_id) ?? [];
        arr.push(row.id);
        childrenByParent.set(row.parent_id, arr);
      }
    }

    // Build folders with ordered linkIds
    const folders: Folder[] = dbFolderRows.map((row) => {
      const folderLinks = (linksByFolder.get(row.id) ?? []).sort(
        (a, b) => a.position - b.position,
      );
      return {
        id: row.id,
        name: row.name,
        accent: row.accent as AccentKey,
        linkIds: folderLinks.map((l) => l.id),
        childFolderIds: childrenByParent.get(row.id) ?? [],
        createdAt: new Date(row.created_at).getTime(),
        ...(row.parent_id ? { parentId: row.parent_id } : {}),
        ...(row.drive_folder_id
          ? { driveFolderId: row.drive_folder_id }
          : {}),
        ...(row.drive_folder_name
          ? { driveFolderName: row.drive_folder_name }
          : {}),
        ...(row.drive_last_synced_at
          ? {
              driveLastSyncedAt: new Date(
                row.drive_last_synced_at,
              ).getTime(),
            }
          : {}),
      };
    });

    // Recent
    const recent = ((recentRes.data ?? []) as DbRecent[]).map((r) => ({
      linkId: r.link_id,
      openedAt: new Date(r.opened_at).getTime(),
    }));

    // Settings
    const settingsRow = settingsRes.data as DbSettings | null;
    const settings: AtlasData["settings"] = {
      theme: (settingsRow?.theme === "light" ? "light" : "dark") as ThemeMode,
      dismissedPopupHint: settingsRow?.dismissed_popup_hint ?? false,
    };

    return { version: ATLAS_SCHEMA_VERSION, folders, links, recent, settings };
  }

  async save(data: AtlasData): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    // 1. Settings upsert
    await this.supabase.from("settings").upsert(
      {
        user_id: user.id,
        theme: data.settings.theme,
        dismissed_popup_hint: data.settings.dismissedPopupHint,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    // 2. Folders upsert
    const folderRows = data.folders.map((f, i) => ({
      id: f.id,
      user_id: user.id,
      name: f.name,
      accent: f.accent,
      position: i,
      parent_id: f.parentId ?? null,
      drive_folder_id: f.driveFolderId ?? null,
      drive_folder_name: f.driveFolderName ?? null,
      drive_last_synced_at: f.driveLastSyncedAt
        ? new Date(f.driveLastSyncedAt).toISOString()
        : null,
      created_at: new Date(f.createdAt).toISOString(),
    }));

    if (folderRows.length > 0) {
      await this.supabase
        .from("folders")
        .upsert(folderRows, { onConflict: "id" });
    }

    // 3. Links upsert
    const linkRows = data.folders.flatMap((f) =>
      f.linkIds
        .map((lid, pos) => {
          const link = data.links[lid];
          if (!link) return null;
          return {
            id: link.id,
            folder_id: f.id,
            user_id: user.id,
            title: link.title,
            url: link.url,
            position: pos,
            pinned: link.pinned,
            source: link.source,
            drive_file_id: link.driveFileId ?? null,
            created_at: new Date(link.createdAt).toISOString(),
          };
        })
        .filter(<T>(x: T | null): x is T => x !== null),
    );

    if (linkRows.length > 0) {
      await this.supabase
        .from("links")
        .upsert(linkRows, { onConflict: "id" });
    }

    // 4. Delete removed folders
    const folderIds = data.folders.map((f) => f.id);
    if (folderIds.length > 0) {
      await this.supabase
        .from("folders")
        .delete()
        .eq("user_id", user.id)
        .not("id", "in", `(${folderIds.map((id) => `"${id}"`).join(",")})`);
    } else {
      // All folders deleted
      await this.supabase.from("folders").delete().eq("user_id", user.id);
    }

    // 5. Delete removed links
    const linkIds = Object.keys(data.links);
    if (linkIds.length > 0) {
      await this.supabase
        .from("links")
        .delete()
        .eq("user_id", user.id)
        .not("id", "in", `(${linkIds.map((id) => `"${id}"`).join(",")})`);
    } else {
      await this.supabase.from("links").delete().eq("user_id", user.id);
    }

    // 6. Replace recent (delete all + reinsert — small table)
    await this.supabase.from("recent").delete().eq("user_id", user.id);
    if (data.recent.length > 0) {
      // Filter to only recent entries whose links still exist in the DB
      const recentRows = data.recent
        .filter((r) => r.linkId in data.links)
        .map((r) => ({
          user_id: user.id,
          link_id: r.linkId,
          opened_at: new Date(r.openedAt).toISOString(),
        }));
      if (recentRows.length > 0) {
        await this.supabase.from("recent").insert(recentRows);
      }
    }
  }
}
