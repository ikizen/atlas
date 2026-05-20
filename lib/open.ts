import { normalizeUrl } from "@/lib/url";

export function openInNewTab(url: string): void {
  window.open(normalizeUrl(url), "_blank", "noopener,noreferrer");
}

/**
 * Open every link in a folder. Must be called directly inside a user-gesture
 * handler (click) so the browser treats the first window.open as user-initiated.
 * Returns true if at least one popup was blocked, so the caller can show the
 * one-time "allow popups" hint.
 */
export function openAll(urls: string[]): boolean {
  let blocked = false;
  for (const url of urls) {
    const w = window.open(normalizeUrl(url), "_blank", "noopener,noreferrer");
    if (w === null) blocked = true;
  }
  return blocked;
}
