"use client";

import { CircleCheck, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

/** Confirmation shown on the landing page after account deletion (?account_deleted=1). */
export function AccountDeletedNotice() {
  const params = useSearchParams();
  const router = useRouter();
  if (params.get("account_deleted") !== "1") return null;
  return (
    <div className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-6" role="status">
      <div className="flex items-center gap-3 rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success-text">
        <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
        <p className="flex-1">Your account has been deleted, along with your projects and monitoring data.</p>
        <button
          type="button"
          onClick={() => router.replace("/")}
          className="rounded p-1 hover:bg-success/10"
          aria-label="Dismiss"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
