"use client";

import { CreditCard, FolderKanban, LayoutDashboard, Plus, Settings, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface NavProject {
  id: string;
  name: string;
  isDemo: boolean;
  score: number | null;
}

const MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban, exact: true },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Navigation used by both the desktop sidebar and the mobile sheet. */
export function AppNav({ projects, showDevTools, onNavigate }: { projects: NavProject[]; showDevTools: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      <ul className="flex flex-col gap-0.5">
        {MAIN.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive(item.href, item.exact) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground",
                isActive(item.href, item.exact) && "bg-surface-muted font-medium text-foreground",
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        ))}
        {showDevTools && (
          <li>
            <Link
              href="/admin"
              onClick={onNavigate}
              aria-current={isActive("/admin") ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground",
                isActive("/admin") && "bg-surface-muted font-medium text-foreground",
              )}
            >
              <Wrench className="size-4" aria-hidden="true" />
              Dev tools
            </Link>
          </li>
        )}
      </ul>

      <div>
        <div className="mb-1.5 flex items-center justify-between px-2.5">
          <span className="text-[11px] font-medium tracking-wide text-subtle-foreground uppercase">Projects</span>
          <Link href="/onboarding" onClick={onNavigate} className="rounded p-0.5 text-subtle-foreground hover:bg-surface-muted hover:text-foreground" aria-label="Create project">
            <Plus className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="px-2.5 text-xs text-subtle-foreground">No projects yet.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {projects.map((p) => {
              const active = pathname.startsWith(`/projects/${p.id}`);
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground",
                      active && "bg-primary-soft font-medium text-primary-soft-foreground hover:bg-primary-soft",
                    )}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-surface-muted text-[10px] font-semibold text-muted-foreground uppercase">
                      {p.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    {p.score !== null && <span className="tabular text-[11px] text-subtle-foreground">{Math.round(p.score)}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
