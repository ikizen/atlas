import { hostnameOf } from "@/lib/url";

/**
 * Google's S2 favicon service — no backend required, good coverage for the
 * Google Workspace / SaaS links a finance workflow lives in. The <img>
 * onError path falls back to a letter avatar in the UI.
 */
export function faviconUrl(url: string, size = 64): string {
  const host = hostnameOf(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    host,
  )}&sz=${size}`;
}
