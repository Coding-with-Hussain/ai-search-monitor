import Link from "next/link";

import { ThemeToggle } from "@/components/app/theme-toggle";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

import { Container } from "./container";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";

/**
 * Sticky public header. Static on purpose: it never reads the session, so
 * marketing pages stay prerenderable. Signed-in users reach the app through
 * "Log in", which forwards them to the dashboard.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <Container className="flex h-16 items-center gap-4">
        <Link href="/" className="shrink-0 rounded-md" aria-label="AI Visibility home">
          <Logo />
        </Link>

        <NavLinks className="ml-6 hidden md:block" />

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/signup">Start Monitoring</Link>
          </Button>
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
