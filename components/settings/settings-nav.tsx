"use client";

import { Bell, CreditCard, Gauge, KeyRound, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export const SETTINGS_SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "account", label: "Account", icon: KeyRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "monitoring", label: "Monitoring defaults", icon: Gauge },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "privacy", label: "Data & privacy", icon: ShieldCheck },
  { id: "danger", label: "Danger zone", icon: TriangleAlert },
] as const;

/**
 * In-page navigation for the settings sections: a sticky list on desktop and
 * a scrollable row of links on small screens. Highlights the section in view.
 */
export function SettingsNav() {
  const [active, setActive] = useState<string>(SETTINGS_SECTIONS[0].id);

  useEffect(() => {
    const elements = SETTINGS_SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => el !== null);
    const inView = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inView.add(entry.target.id);
          else inView.delete(entry.target.id);
        }
        const first = SETTINGS_SECTIONS.find((s) => inView.has(s.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-72px 0px -60% 0px", threshold: 0 },
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Settings sections" className="lg:sticky lg:top-20">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => {
          const current = active === id;
          return (
            <li key={id} className="shrink-0">
              <a
                href={`#${id}`}
                onClick={() => setActive(id)}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors lg:py-2",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  current
                    ? "bg-surface-muted text-foreground"
                    : "text-muted-foreground hover:bg-surface-muted/70 hover:text-foreground",
                  id === "danger" && !current && "text-danger-text/80 hover:text-danger-text",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
