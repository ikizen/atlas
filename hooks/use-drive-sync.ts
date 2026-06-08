"use client";

import { useCallback, useState } from "react";
import { useAtlasStore } from "@/lib/store";

interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
}

interface DriveFilesResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("/api/drive/token");
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to get Drive access token");
  }
  const { accessToken } = (await res.json()) as { accessToken: string };
  return accessToken;
}

async function listSheetsInFolder(
  accessToken: string,
  driveFolderId: string,
): Promise<DriveFile[]> {
  const q = encodeURIComponent(
    `'${driveFolderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
  );
  const fields = encodeURIComponent("files(id,name,webViewLink)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Drive API error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as DriveFilesResponse;
  return data.files ?? [];
}

/**
 * Hook for syncing a Google Drive folder's Sheets into an Atlas folder.
 *
 * Usage:
 *   const { sync, syncing, error } = useDriveSync(folderId);
 *   <button onClick={sync}>Refresh</button>
 */
export function useDriveSync(folderId: string) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const folder = useAtlasStore((s) => s.folders.find((f) => f.id === folderId));
  const upsertDriveLinks = useAtlasStore((s) => s.upsertDriveLinks);
  const setFolderLastSynced = useAtlasStore((s) => s.setFolderLastSynced);

  const sync = useCallback(async () => {
    if (!folder?.driveFolderId) return;
    setSyncing(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const files = await listSheetsInFolder(accessToken, folder.driveFolderId);

      upsertDriveLinks(
        folderId,
        files.map((f) => ({
          driveFileId: f.id,
          title: f.name,
          url: f.webViewLink,
        })),
      );
      setFolderLastSynced(folderId, Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }, [folder?.driveFolderId, folderId, upsertDriveLinks, setFolderLastSynced]);

  return { sync, syncing, error };
}
