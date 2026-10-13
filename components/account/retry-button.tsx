"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

/** Re-render the current server page (re-runs its data loaders). */
export function RetryButton({ label = "Try again" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="outline" size="sm" loading={pending} onClick={() => startTransition(() => router.refresh())}>
      {!pending && <RotateCw aria-hidden="true" />}
      {label}
    </Button>
  );
}
