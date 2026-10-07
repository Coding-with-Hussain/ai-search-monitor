/**
 * URL / domain helpers shared by onboarding, the analyzer and source analysis.
 */

export function normalizeWebsite(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) return null;
    return `${url.protocol}//${url.hostname}${url.pathname === "/" ? "" : url.pathname}`.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Extract a bare registrable-ish domain: "https://www.abc.com/x" -> "abc.com". */
export function extractDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const host = new URL(withProtocol).hostname.toLowerCase();
    if (!host.includes(".")) return null;
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** True when `candidate` is the same site as `domain` (including subdomains). */
export function domainMatches(candidate: string | null | undefined, domain: string | null | undefined) {
  if (!candidate || !domain) return false;
  const c = candidate.toLowerCase().replace(/^www\./, "");
  const d = domain.toLowerCase().replace(/^www\./, "");
  return c === d || c.endsWith(`.${d}`);
}
