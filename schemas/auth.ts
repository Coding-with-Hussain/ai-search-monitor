import { z } from "zod";

import { type BillingInterval, getPlan, isPlanId, type Plan } from "@/lib/billing/plans";

/**
 * Auth contract shared by the auth forms (React Hook Form) and the auth
 * server actions / route handlers. The server always re-validates — client
 * validation is for UX only. Everything here is isomorphic (no server-only
 * imports) so client components can use it.
 */

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt (used by Supabase Auth) ignores bytes beyond 72. */
export const PASSWORD_MAX_LENGTH = 72;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address")
  .max(254, "That email address is too long")
  .pipe(z.email("Enter a valid email address"));

/** Password chosen by the user (signup / reset). */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`)
  .refine((v) => v.trim().length > 0, "Your password can't be only spaces");

/** Next-path field forwarded from `?next=` (sanitised again on the server). */
const nextField = z.string().max(512).optional();

export const loginSchema = z.object({
  email: emailSchema,
  // Never trim or length-check an existing password beyond sane bounds.
  password: z.string().min(1, "Enter your password").max(256, "That password is too long"),
  next: nextField,
});

export const magicLinkSchema = z.object({
  email: emailSchema,
  next: nextField,
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter your full name")
    .max(100, "Use at most 100 characters"),
  email: emailSchema,
  password: newPasswordSchema,
  acceptTerms: z.boolean().refine((v) => v, "Please accept the Terms of Service and Privacy Policy"),
  plan: z.string().max(32).optional(),
  interval: z.string().max(16).optional(),
});

export const emailOnlySchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.input<typeof loginSchema>;
export type MagicLinkInput = z.input<typeof magicLinkSchema>;
export type SignupInput = z.input<typeof signupSchema>;
export type EmailOnlyInput = z.input<typeof emailOnlySchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

// ---------------------------------------------------------------------------
// Password strength (UX hint only — the server enforces newPasswordSchema)
// ---------------------------------------------------------------------------

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
  /** Required rules block submission; the others only improve strength. */
  required: boolean;
}

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "iloveyou",
  "11111111",
  "abc12345",
  "letmein1",
  "welcome1",
]);

export function passwordRequirements(password: string): PasswordRequirement[] {
  return [
    { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH, required: true },
    { id: "case", label: "Upper and lower case letters", met: /[a-z]/.test(password) && /[A-Z]/.test(password), required: false },
    { id: "number", label: "A number or symbol", met: /[\d\W_]/.test(password), required: false },
  ];
}

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: "Too short" | "Weak" | "Fair" | "Good" | "Strong" };

export function passwordStrength(password: string): PasswordStrength {
  if (password.length < PASSWORD_MIN_LENGTH) return { score: 0, label: "Too short" };
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return { score: 1, label: "Weak" };
  let points = 0;
  if (password.length >= 12) points++;
  if (password.length >= 16) points++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points++;
  if (/\d/.test(password)) points++;
  if (/[^A-Za-z0-9]/.test(password)) points++;
  if (/^(.)\1+$/.test(password)) points = 0;
  if (points <= 1) return { score: 1, label: "Weak" };
  if (points === 2) return { score: 2, label: "Fair" };
  if (points === 3) return { score: 3, label: "Good" };
  return { score: 4, label: "Strong" };
}

// ---------------------------------------------------------------------------
// Redirect safety
// ---------------------------------------------------------------------------

export const DEFAULT_AFTER_LOGIN = "/dashboard";

function hasControlCharacters(value: string) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** Paths that make no sense as a post-login destination (would loop). */
const NON_DESTINATIONS = ["/login", "/signup", "/forgot-password", "/auth/"];

/**
 * Return `value` when it is a safe same-origin relative path, else `fallback`.
 * Rejects absolute URLs, protocol-relative (`//host`), backslash tricks
 * (`/\host`), control characters (browsers strip tabs/newlines, turning
 * `/\t/host` into `//host`) and auth pages that would cause a loop.
 */
export function safeNextPath(value: unknown, fallback: string = DEFAULT_AFTER_LOGIN): string {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (raw.length === 0 || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw.includes("\\") || hasControlCharacters(raw)) return fallback;
  try {
    const base = "http://local.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    if (NON_DESTINATIONS.some((p) => (p.endsWith("/") ? url.pathname.startsWith(p) : url.pathname === p))) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// ?error= codes (set by /auth/callback and /auth/confirm, shown by auth pages)
// ---------------------------------------------------------------------------

export const AUTH_ERROR_CODES = [
  "link_expired",
  "link_invalid",
  "different_browser",
  "auth_failed",
  "access_denied",
  "session_expired",
  "not_configured",
] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  link_expired: "That link has expired or was already used. Request a new one and use the latest email we send.",
  link_invalid: "That sign-in link isn't valid. Make sure you open the full link from the most recent email.",
  different_browser:
    "Please open the link in the same browser you used to request it, or request a new link from this browser.",
  auth_failed: "We couldn't sign you in. Please try again.",
  access_denied: "Sign-in was cancelled or not allowed. Please try again.",
  session_expired: "Your session has expired. Please sign in again.",
  not_configured: "Authentication isn't configured yet, so sign-in is unavailable.",
};

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === "string" && (AUTH_ERROR_CODES as readonly string[]).includes(value);
}

/** Friendly message for an `?error=` code (unknown codes get a generic message). */
export function authErrorMessage(code: unknown): string | null {
  if (typeof code !== "string" || code.length === 0) return null;
  return isAuthErrorCode(code) ? AUTH_ERROR_MESSAGES[code] : AUTH_ERROR_MESSAGES.auth_failed;
}

// ---------------------------------------------------------------------------
// Plan intent (from /signup?plan=&interval=) — a hint only, never billing state
// ---------------------------------------------------------------------------

export interface PlanIntent {
  plan: Plan;
  interval: BillingInterval;
}

export function parsePlanIntent(plan: unknown, interval: unknown): PlanIntent | null {
  if (!isPlanId(plan)) return null;
  return { plan: getPlan(plan), interval: interval === "year" || interval === "annual" || interval === "yearly" ? "year" : "month" };
}

/** Read a single string from a Next.js `searchParams` value. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
