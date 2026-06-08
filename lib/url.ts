/** Add a scheme if the user typed a bare host like "vercel.com". */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const hostCache = new Map<string, string>();

export function hostnameOf(url: string): string {
  if (hostCache.has(url)) return hostCache.get(url)!;
  try {
    const result = new URL(normalizeUrl(url)).hostname;
    hostCache.set(url, result);
    return result;
  } catch {
    hostCache.set(url, url);
    return url;
  }
}

/** Friendly fallback title derived from a URL. */
export function titleFromUrl(url: string): string {
  const host = hostnameOf(url).replace(/^www\./, "");
  return host || url;
}
