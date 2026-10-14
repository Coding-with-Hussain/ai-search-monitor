"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useOptimistic, useTransition } from "react";

import { CompactSelect } from "../compact-select";

export interface ScanOption {
  id: string;
  label: string;
}

/** Switch which scan's answers are shown (?scan=<id>). Hidden when only one scan checked this question. */
export function ScanSelect({ basePath, options, value }: { basePath: string; options: ScanOption[]; value: string }) {
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Show the chosen scan immediately while its answers load.
  const [selected, setSelected] = useOptimistic(value);
  if (options.length <= 1) return null;
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <label htmlFor={id} className="text-xs whitespace-nowrap text-muted-foreground">
        Scan
      </label>
      <CompactSelect
        id={id}
        value={selected}
        aria-busy={pending || undefined}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => {
            setSelected(next);
            router.push(`${basePath}?scan=${encodeURIComponent(next)}`, { scroll: false });
          });
        }}
        className="min-w-0 flex-1 sm:w-64 sm:flex-none"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </CompactSelect>
      <span className="flex size-4 shrink-0 items-center" role="status">
        {pending && <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
        <span className="sr-only">{pending ? "Loading the selected scan…" : ""}</span>
      </span>
    </div>
  );
}
