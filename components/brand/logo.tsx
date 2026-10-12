import { cn } from "@/lib/utils";

/** Radar mark with a "blip": your business, visible inside AI answers. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7 shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#fff" strokeOpacity="0.38" strokeWidth="2" />
      <circle cx="16" cy="16" r="4.5" fill="none" stroke="#fff" strokeOpacity="0.65" strokeWidth="2" />
      <path d="M16 16 22.2 9.8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22.4" cy="9.6" r="2.4" fill="#fff" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">AI Visibility</span>
          <span className="mt-0.5 text-[10.5px] font-medium tracking-wide text-subtle-foreground">Search Visibility Monitor</span>
        </span>
      )}
    </span>
  );
}
