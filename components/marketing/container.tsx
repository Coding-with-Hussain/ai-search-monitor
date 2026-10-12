import type * as React from "react";

import { cn } from "@/lib/utils";

/** Centered page column with the standard marketing gutters (16px on mobile). */
export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

/** Vertical rhythm for landing/feature sections. `tone="muted"` adds a surface band. */
export function Section({
  className,
  tone = "default",
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { tone?: "default" | "muted" }) {
  return (
    <section
      className={cn("py-20 sm:py-28", tone === "muted" && "border-y border-border bg-surface", className)}
      {...props}
    >
      {children}
    </section>
  );
}

/** Small uppercase-free label above section titles. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-2 text-[13px] font-medium text-primary", className)}>
      <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  id,
  className,
  as: Heading = "h2",
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  id?: string;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Heading
        id={id}
        className={cn(
          "font-semibold tracking-[-0.025em] text-balance text-foreground",
          eyebrow && "mt-3",
          Heading === "h1" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
        )}
      >
        {title}
      </Heading>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground sm:text-[17px]">{description}</p>
      )}
    </div>
  );
}
