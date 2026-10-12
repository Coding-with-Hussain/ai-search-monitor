import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { siteConfig } from "@/lib/site";

import { Container } from "./container";
import { FOOTER_COLUMNS } from "./nav";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex rounded-md" aria-label="AI Visibility home">
              <Logo />
            </Link>
            <p className="mt-4 text-sm font-medium text-foreground">{siteConfig.tagline}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Google tells you where you rank. AI Search Visibility Monitor tells you whether AI recommends you.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="text-[13px] font-semibold text-foreground">{column.title}</h2>
                <ul className="mt-3 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      {link.href.startsWith("mailto:") ? (
                        <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs leading-relaxed text-subtle-foreground sm:flex-row sm:items-start sm:justify-between">
          <p>
            © {year} {siteConfig.name}. All rights reserved.
          </p>
          <p className="max-w-xl sm:text-right">
            The AI Visibility Score is a proprietary monitoring metric, not a search-engine ranking. ChatGPT, Gemini and
            Perplexity are trademarks of their respective owners; we are not affiliated with or endorsed by them.
          </p>
        </div>
      </Container>
    </footer>
  );
}
