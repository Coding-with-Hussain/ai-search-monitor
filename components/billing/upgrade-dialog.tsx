"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trackClient } from "@/lib/analytics/client";

interface UpgradePrompt {
  title?: string;
  message: string;
}

const UpgradeContext = createContext<((prompt: UpgradePrompt) => void) | null>(null);

/**
 * App-wide "you've hit a plan limit" dialog. Any client component can call
 * `useUpgradePrompt()(...)` — server actions return PLAN_LIMIT /
 * SUBSCRIPTION_INACTIVE codes and `useServerAction` opens this automatically.
 */
export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<UpgradePrompt | null>(null);
  const open = useCallback((p: UpgradePrompt) => setPrompt(p), []);
  const value = useMemo(() => open, [open]);
  return (
    <UpgradeContext value={value}>
      {children}
      <Dialog open={prompt !== null} onOpenChange={(o) => !o && setPrompt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <DialogTitle>{prompt?.title ?? "Upgrade to keep growing"}</DialogTitle>
            <DialogDescription>{prompt?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrompt(null)}>
              Not now
            </Button>
            <Button asChild onClick={() => trackClient("upgrade_clicked", { source: "limit_dialog" })}>
              <Link href="/billing#plans">Upgrade Plan</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UpgradeContext>
  );
}

export function useUpgradePrompt() {
  const ctx = useContext(UpgradeContext);
  return ctx ?? (() => {});
}
