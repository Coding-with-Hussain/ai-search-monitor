"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { CompactSelect } from "../compact-select";

export interface ScanOption {
  id: string;
  label: string;
}

/** Switch which scan's answers are shown (?scan=<id>). */
export function ScanSelect({ basePath, options, value }: { basePath: string; options: ScanOption[]; value: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (options.length <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="query-scan-select" className="text-xs whitespace-nowrap text-muted-foreground">
        Scan
      </label>
      <CompactSelect
        id="query-scan-select"
        value={value}
        onChange={(e) => {
          const id = e.target.value;
          startTransition(() => router.push(`${basePath}?scan=${encodeURIComponent(id)}`, { scroll: false }));
        }}
        className="w-56 max-w-full"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </CompactSelect>
      {pending && <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-label="Loading scan" />}
    </div>
  );
}
