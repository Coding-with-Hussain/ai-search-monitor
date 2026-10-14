import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { domainMatches, extractDomain } from "@/lib/domain";
import type { Citation } from "@/types/domain";

/** Only http(s) links from provider output are rendered as links (it is untrusted). */
function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Sources an AI answer cited, with your site and competitors' sites labelled. */
export function AnswerSources({
  citations,
  ownDomain,
  competitorDomains,
}: {
  citations: Citation[];
  ownDomain: string | null;
  competitorDomains: Array<{ domain: string; name: string }>;
}) {
  if (citations.length === 0) {
    return <p className="text-[13px] text-subtle-foreground">No sources were cited in this answer.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {citations.slice(0, 20).map((c, i) => {
        const href = safeHref(c.url);
        const domain = c.domain || extractDomain(c.url) || c.url;
        const isOwn = domainMatches(domain, ownDomain);
        const competitor = competitorDomains.find((d) => domainMatches(domain, d.domain));
        const title = c.title?.trim() || domain;
        return (
          <li key={`${c.url}-${i}`} className="flex min-w-0 items-start gap-2 text-[13px]">
            <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="line-clamp-2 break-words text-foreground underline-offset-2 hover:underline"
                >
                  {title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span className="line-clamp-2 break-words">{title}</span>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="truncate text-xs text-muted-foreground">{domain}</span>
                {isOwn && <Badge variant="success">Your website</Badge>}
                {!isOwn && competitor && <Badge variant="secondary">{competitor.name}</Badge>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
