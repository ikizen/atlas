export const GOOGLE_CONFIG = {
  CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
  SCOPES: "https://www.googleapis.com/auth/drive.readonly",
  DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
};

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

let gapiInited = false;
let gisInited = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tokenClient: any = null;

export async function initGoogleApi() {
  if (gapiInited && gisInited) return;

  return new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      window.gapi.load("client", async () => {
        await window.gapi.client.init({
          apiKey: GOOGLE_CONFIG.API_KEY,
          discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
        });
        gapiInited = true;
        if (gisInited) resolve();
      });
    };
    document.body.appendChild(script);

    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: GOOGLE_CONFIG.SCOPES,
        callback: "", // defined at usage
      });
      gisInited = true;
      if (gapiInited) resolve();
    };
    document.body.appendChild(gisScript);
  });
}

export async function authenticate() {
  return new Promise<string>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        reject(resp);
      }
      resolve(resp.access_token);
    };

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: "consent" });
    } else {
      tokenClient.requestAccessToken({ prompt: "" });
    }
  });
}

export async function fetchDriveFolder(folderId: string): Promise<DriveFolder> {
  const response = await window.gapi.client.drive.files.get({
    fileId: folderId,
    fields: "id, name",
  });

  const folder: DriveFolder = {
    id: response.result.id!,
    name: response.result.name!,
    files: [],
    folders: [],
  };

  const childrenResponse = await window.gapi.client.drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink)",
  });

  const children = childrenResponse.result.files || [];

  const subfolders: Promise<DriveFolder>[] = [];
  for (const child of children) {
    if (child.mimeType === "application/vnd.google-apps.folder") {
      subfolders.push(fetchDriveFolder(child.id!));
    } else {
      folder.files.push({
        id: child.id!,
        name: child.name!,
        mimeType: child.mimeType!,
        webViewLink: child.webViewLink!,
      });
    }
  }

  if (subfolders.length > 0) {
    folder.folders = await Promise.all(subfolders);
  }

  return folder;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gapi: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}
