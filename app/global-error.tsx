"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors in the root layout. It replaces the whole
 * document, so it is self-contained: inline styles, light/dark via the OS.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[app] root layout error", error.digest ?? error.name);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Something went wrong · AI Visibility</title>
        <meta name="robots" content="noindex" />
        <style>{`
          :root { color-scheme: light dark; --bg:#f8f8f6; --fg:#141413; --muted:#5c5b56; --primary:#256abf; --border:#d2d1c9; }
          @media (prefers-color-scheme: dark) { :root { --bg:#0f0f0e; --fg:#f4f4f1; --muted:#b9b8ae; --primary:#3987e5; --border:#3a3a37; } }
          body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; box-sizing:border-box;
                 background:var(--bg); color:var(--fg); font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
          main { max-width:28rem; text-align:center; }
          h1 { font-size:1.75rem; letter-spacing:-0.02em; margin:0 0 12px; }
          p { color:var(--muted); line-height:1.6; margin:0 0 28px; }
          .row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
          button, a { font:inherit; font-size:15px; font-weight:500; border-radius:8px; padding:10px 18px; cursor:pointer; text-decoration:none; }
          button { background:var(--primary); color:#fff; border:0; }
          a { color:var(--fg); border:1px solid var(--border); }
          button:focus-visible, a:focus-visible { outline:2px solid var(--primary); outline-offset:2px; }
          small { display:block; margin-top:24px; color:var(--muted); font-size:12px; }
        `}</style>
      </head>
      <body>
        <main>
          <h1>Something went wrong.</h1>
          <p>AI Visibility couldn’t load. This is usually temporary, so please try again in a moment.</p>
          <div className="row">
            <button type="button" onClick={() => retry()}>
              Try again
            </button>
            {/* Plain anchor on purpose: a full reload recovers from a broken root layout. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">Go to homepage</a>
          </div>
          {error.digest && <small>Reference: {error.digest}</small>}
        </main>
      </body>
    </html>
  );
}
