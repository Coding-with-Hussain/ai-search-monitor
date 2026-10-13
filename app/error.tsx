"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { StatusPage } from "@/components/marketing/status-page";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

/**
 * Root error boundary. Shows a friendly message only: error details are never
 * rendered (server errors arrive redacted anyway); the digest lets support
 * match the server log entry.
 */
export default function ErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[app] unhandled error", error.digest ?? error.name);
  }, [error]);

  return (
    <StatusPage
      code="Error"
      title="Something went wrong."
      description={
        <p>
          We couldn’t load this page. This is usually temporary, so please try again. If it keeps happening, contact{" "}
          <a href={`mailto:${siteConfig.supportEmail}`} className="font-medium text-primary underline-offset-4 hover:underline">
            {siteConfig.supportEmail}
          </a>
          {error.digest ? " and mention the reference below." : "."}
        </p>
      }
      actions={
        <>
          <Button size="lg" onClick={() => retry()}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Go to homepage</Link>
          </Button>
        </>
      }
      footer={
        error.digest ? (
          <p className="text-xs text-subtle-foreground">
            Reference: <code className="font-mono">{error.digest}</code>
          </p>
        ) : undefined
      }
    />
  );
}
