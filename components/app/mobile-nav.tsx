"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import type * as React from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { AppNav, type NavProject } from "./app-nav";

export function MobileNav({ projects, showDevTools, footer }: { projects: NavProject[]; showDevTools: boolean; footer?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="gap-6 p-4">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Main navigation and projects</SheetDescription>
        <Logo />
        <div className="flex-1 overflow-y-auto">
          <AppNav projects={projects} showDevTools={showDevTools} onNavigate={() => setOpen(false)} />
        </div>
        {footer}
      </SheetContent>
    </Sheet>
  );
}
