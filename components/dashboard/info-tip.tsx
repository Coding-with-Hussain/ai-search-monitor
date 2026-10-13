"use client";

import { CircleHelp } from "lucide-react";
import { useState } from "react";
import type * as React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Small "?" help bubble. Opens on hover and keyboard focus like a tooltip, and
 * also on tap/click so the explanation is reachable on touch screens (tap
 * anywhere else, or press Esc, to close it).
 */
export function InfoTip({ children, label = "More information" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex rounded-full text-subtle-foreground hover:text-foreground"
          aria-label={label}
          onClick={(event) => {
            // Keep the bubble open on click/tap (the tooltip would otherwise close on click).
            event.preventDefault();
            setOpen(true);
          }}
        >
          <CircleHelp className="size-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  );
}
