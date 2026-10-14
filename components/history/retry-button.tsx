"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

/** Re-run the current server page's data loading. */
export function RetryButton({ label = "Try again" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="outline" size="sm" loading={pending} onClick={() => startTransition(() => router.refresh())}>
      {!pending && <RotateCcw aria-hidden="true" />}
      {label}
    </Button>
  );
}
