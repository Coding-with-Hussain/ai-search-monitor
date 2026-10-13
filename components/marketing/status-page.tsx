import Link from "next/link";
import type * as React from "react";

import { Logo } from "@/components/brand/logo";

import { RadarBackdrop } from "./radar-backdrop";

/**
 * Full-page shell for 404 and error screens. No hooks or server-only imports,
 * so both server (not-found) and client (error boundary) files can use it.
 */
export function StatusPage({
  code,
  title,
  description,
  actions,
  footer,
}: {
  code: string;
  title: string;
  description: React.ReactNode;
  actions: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="rounded-md" aria-label="AI Visibility home">
            <Logo />
          </Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-20 outline-none">
        <RadarBackdrop
          id="status-radar"
          blips={false}
          className="absolute top-1/2 left-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 opacity-70 [mask-image:radial-gradient(circle,black_25%,transparent_68%)]"
        />
        <div className="relative max-w-md text-center">
          <p className="text-sm font-semibold text-primary tabular">{code}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-foreground sm:text-4xl">{title}</h1>
          <div className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</div>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">{actions}</div>
          {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
