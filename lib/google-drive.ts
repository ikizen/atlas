/**
 * Google Drive helpers — uses the server-side /api/drive/token route to get
 * an access token, then calls the Drive REST API directly via fetch.
 * No gapi.client or Google Identity Services needed here.
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  files: DriveFile[];
  folders: DriveFolder[];
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("/api/drive/token");
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to get Drive access token. Have you signed in with Google?");
  }
  const { accessToken } = (await res.json()) as { accessToken: string };
  return accessToken;
}

async function driveGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Drive API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Extract the Drive folder ID from any Drive URL format. */
export function extractFolderId(link: string): string | null {
  // Handles:
  //   https://drive.google.com/drive/folders/FOLDER_ID
  //   https://drive.google.com/drive/u/0/folders/FOLDER_ID
  //   https://drive.google.com/open?id=FOLDER_ID
  //   Bare IDs (letters, digits, hyphens, underscores, 20+ chars)
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
    /^([a-zA-Z0-9_-]{20,})$/,
  ];
  for (const re of patterns) {
    const m = link.trim().match(re);
    if (m) return m[1];
  }
  return null;
}

interface DriveFileList {
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
  }>;
  nextPageToken?: string;
}

interface DriveFolderMeta {
  id: string;
  name: string;
}

/**
 * Recursively fetches all files and subfolders in a Drive folder.
 * All files that have a webViewLink are included (not just Sheets).
 * Fetches a single access token up-front and reuses it for all requests.
 */
export async function fetchDriveFolder(folderId: string): Promise<DriveFolder> {
  const accessToken = await getAccessToken();
  return fetchFolderWithToken(folderId, accessToken);
}

async function fetchFolderWithToken(
  folderId: string,
  accessToken: string,
): Promise<DriveFolder> {
  // Get folder metadata (name)
  const meta = await driveGet<DriveFolderMeta>(
    `files/${folderId}?fields=id%2Cname`,
    accessToken,
  );

  // List all children (paginated)
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const fields = encodeURIComponent("nextPageToken,files(id,name,mimeType,webViewLink)");

  let allChildren: DriveFileList["files"] = [];
  let pageToken: string | undefined;

  do {
    const url =
      `files?q=${q}&fields=${fields}&pageSize=1000` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

    const page = await driveGet<DriveFileList>(url, accessToken);
    allChildren = allChildren.concat(page.files ?? []);
    pageToken = page.nextPageToken;
  } while (pageToken);

  const result: DriveFolder = {
    id: meta.id,
    name: meta.name,
    files: [],
    folders: [],
  };

  const subfolderPromises: Promise<DriveFolder>[] = [];

  for (const child of allChildren) {
    if (child.mimeType === "application/vnd.google-apps.folder") {
      // Recurse into subfolder
      subfolderPromises.push(fetchFolderWithToken(child.id, accessToken));
    } else if (child.webViewLink) {
      // Any file with a link (Sheets, Docs, PDFs, etc.)
      result.files.push({
        id: child.id,
        name: child.name,
        mimeType: child.mimeType,
        webViewLink: child.webViewLink,
      });
    }
  }

  if (subfolderPromises.length > 0) {
    result.folders = await Promise.all(subfolderPromises);
  }

  return result;
}
