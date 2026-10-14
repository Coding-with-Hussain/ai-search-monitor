"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { trackClient } from "@/lib/analytics/client";

/** Link to the plans section of billing, tracked as an upgrade click. */
export function UpgradeLink({ source, label = "Upgrade plan" }: { source: string; label?: string }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href="/billing#plans" onClick={() => trackClient("upgrade_clicked", { source })}>
        <Sparkles aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}
