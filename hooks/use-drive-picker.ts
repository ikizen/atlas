"use client";

import { useCallback, useRef, useState } from "react";

// Google Picker type stubs — gapi/google are loaded at runtime, use any
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gapi: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}


async function loadPickerScript(): Promise<void> {
  if (typeof window.gapi !== "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google API script"));
    document.head.appendChild(script);
  });
}

async function loadGapiPicker(): Promise<void> {
  await loadPickerScript();
  await new Promise<void>((resolve) => window.gapi.load("picker", resolve));
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

/**
 * Hook that provides an `openPicker` function for the Google Drive Folder Picker.
 * Calls `onPicked(driveId, driveName)` when the user selects a folder.
 */
export function useDrivePicker(
  onPicked: (driveId: string, driveName: string) => void,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pickerRef = useRef<any>(null);

  const openPicker = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [accessToken] = await Promise.all([
        getAccessToken(),
        loadGapiPicker(),
      ]);

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      if (!apiKey) throw new Error("Missing NEXT_PUBLIC_GOOGLE_API_KEY");

      const view = new window.google.picker.DocsView()
        .setSelectFolderEnabled(true)
        .setMimeTypes("application/vnd.google-apps.folder");

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs?.[0];
            if (doc) onPicked(doc.id, doc.name);
          }
          pickerRef.current?.setVisible(false);
          setLoading(false);
        })
        .build();

      pickerRef.current = picker;
      picker.setVisible(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open picker");
      setLoading(false);
    }
  }, [onPicked]);

  return { openPicker, loading, error };
}
