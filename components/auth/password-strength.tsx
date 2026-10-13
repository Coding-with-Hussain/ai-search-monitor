import { Check, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { passwordRequirements, passwordStrength } from "@/schemas/auth";

const SEGMENT_COLOR = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"] as const;

/**
 * Live strength hint for a new password. Guidance only — the server enforces
 * the actual rules (minimum length) in schemas/auth.ts.
 */
export function PasswordStrength({ password, id }: { password: string; id?: string }) {
  const strength = passwordStrength(password);
  const requirements = passwordRequirements(password);
  const empty = password.length === 0;

  return (
    <div id={id} className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={cn(
                "h-1 flex-1 rounded-full bg-surface-sunken transition-colors",
                !empty && strength.score >= segment && SEGMENT_COLOR[strength.score],
              )}
            />
          ))}
        </div>
        <p className="w-28 text-right text-xs text-muted-foreground tabular" aria-live="polite">
          {empty ? (
            "Password strength"
          ) : (
            <>
              <span className="sr-only">Password strength: </span>
              <span className="font-medium text-foreground">{strength.label}</span>
            </>
          )}
        </p>
      </div>
      <ul className="grid gap-1 text-xs text-muted-foreground">
        {requirements.map((req) => (
          <li key={req.id} className={cn("flex items-center gap-1.5", req.met && "text-success-text")}>
            {req.met ? (
              <Check className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="size-3 shrink-0 text-subtle-foreground" aria-hidden="true" />
            )}
            <span>
              {req.label}
              {!req.required && <span className="text-subtle-foreground"> (recommended)</span>}
              <span className="sr-only">{req.met ? " — met" : " — not met yet"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
