import { ImageResponse } from "next/og";

/**
 * Brand images rendered with next/og (Satori). CSS variables are not available
 * here, so colors mirror the light-theme tokens in app/globals.css.
 */
const COLORS = {
  background: "#f8f8f6",
  surface: "#ffffff",
  foreground: "#141413",
  muted: "#5c5b56",
  subtle: "#6b6a64",
  border: "#e4e3dc",
  borderStrong: "#d2d1c9",
  primary: "#256abf",
  chartMuted: "#cfcec6",
};

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

/** The radar logo mark (same geometry as components/brand/logo.tsx). */
export function BrandMark({ size, rounded = true }: { size: number; rounded?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx={rounded ? 8 : 0} fill={COLORS.primary} />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#ffffff" strokeOpacity="0.38" strokeWidth="2" />
      <circle cx="16" cy="16" r="4.5" fill="none" stroke="#ffffff" strokeOpacity="0.65" strokeWidth="2" />
      <path d="M16 16 22.2 9.8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22.4" cy="9.6" r="2.4" fill="#ffffff" />
    </svg>
  );
}

function Radar({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 600 600">
      <defs>
        <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0" />
          <stop offset="100%" stopColor={COLORS.primary} stopOpacity="0.16" />
        </linearGradient>
      </defs>
      {[60, 120, 180, 240, 300].map((r) => (
        <circle key={r} cx="300" cy="300" r={r} fill="none" stroke={COLORS.borderStrong} strokeWidth="1.5" />
      ))}
      <line x1="0" y1="300" x2="600" y2="300" stroke={COLORS.border} strokeWidth="1.5" />
      <line x1="300" y1="0" x2="300" y2="600" stroke={COLORS.border} strokeWidth="1.5" />
      <g transform="rotate(38 300 300)">
        <path d="M300 300 L107.2 70.2 A300 300 0 0 1 300 0 Z" fill="url(#sweep)" />
        <line x1="300" y1="300" x2="300" y2="0" stroke={COLORS.primary} strokeOpacity="0.35" strokeWidth="2" />
      </g>
      <circle cx="402" cy="168" r="16" fill={COLORS.primary} fillOpacity="0.16" />
      <circle cx="402" cy="168" r="8" fill={COLORS.primary} />
      <circle cx="176" cy="392" r="7" fill={COLORS.chartMuted} />
      <circle cx="468" cy="356" r="7" fill={COLORS.chartMuted} />
      <circle cx="300" cy="300" r="5" fill={COLORS.borderStrong} />
    </svg>
  );
}

/** 1200×630 Open Graph / Twitter card. */
export function renderSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: COLORS.background,
          color: COLORS.foreground,
        }}
      >
        <div style={{ position: "absolute", right: -230, top: -85, display: "flex" }}>
          <Radar size={800} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "68px 80px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <BrandMark size={60} />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 18 }}>
              <span style={{ fontSize: 32, letterSpacing: "-0.02em", color: COLORS.foreground }}>AI Visibility</span>
              <span style={{ fontSize: 19, color: COLORS.subtle, marginTop: 2 }}>Search Visibility Monitor</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            <span style={{ fontSize: 80, lineHeight: 1.03, letterSpacing: "-0.04em", color: COLORS.foreground }}>
              Does AI recommend your business?
            </span>
            <span style={{ marginTop: 28, fontSize: 30, lineHeight: 1.4, color: COLORS.muted, maxWidth: 680 }}>
              Track how ChatGPT, Gemini and Perplexity mention your business.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, background: COLORS.primary }} />
            <span style={{ marginLeft: 14, fontSize: 24, color: COLORS.muted }}>Visibility inside AI.</span>
          </div>
        </div>
      </div>
    ),
    SOCIAL_IMAGE_SIZE,
  );
}

/** Square app icon (e.g. apple-touch-icon). Full-bleed: the OS applies its own corner mask. */
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <BrandMark size={size} rounded={false} />
      </div>
    ),
    { width: size, height: size },
  );
}
