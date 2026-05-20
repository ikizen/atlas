/** Add a scheme if the user typed a bare host like "vercel.com". */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname;
  } catch {
    return url;
  }
}

/** Friendly fallback title derived from a URL. */
export function titleFromUrl(url: string): string {
  const host = hostnameOf(url).replace(/^www\./, "");
  return host || url;
}
