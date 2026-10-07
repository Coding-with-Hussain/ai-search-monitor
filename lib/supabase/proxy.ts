import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

/** Routes that require a signed-in user. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/settings",
  "/billing",
  "/onboarding",
  "/admin",
];

/** Auth pages a signed-in user should skip. */
const AUTH_PAGES = ["/login", "/signup"];

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session cookie on every request and performs an
 * optimistic redirect for protected routes. This is a UX convenience only —
 * every page, action and route handler re-verifies the user on the server.
 */
export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isSupabaseConfigured) {
    if (isProtectedPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return withPrivateHeaders(NextResponse.redirect(url), pathname);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Do not run code between createServerClient and getUser(): it refreshes the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return withPrivateHeaders(copyCookies(response, NextResponse.redirect(url)), pathname);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return copyCookies(response, NextResponse.redirect(url));
  }

  return withPrivateHeaders(response, pathname);
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
  return to;
}

function withPrivateHeaders(response: NextResponse, pathname: string) {
  if (isProtectedPath(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}
