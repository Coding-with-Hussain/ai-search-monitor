"use client";

import { useEffect } from "react";

/**
 * Reports always print in the light theme: while the browser prints (from the
 * Print button or the browser menu), the dark theme class is lifted from the
 * document and restored afterwards. The saved theme preference is untouched.
 */
export function PrintLightMode() {
  useEffect(() => {
    const root = document.documentElement;
    let restore: { dark: boolean; colorScheme: string } | null = null;

    const before = () => {
      if (restore) return;
      restore = { dark: root.classList.contains("dark"), colorScheme: root.style.colorScheme };
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    };
    const after = () => {
      if (!restore) return;
      if (restore.dark) root.classList.add("dark");
      root.style.colorScheme = restore.colorScheme;
      restore = null;
    };

    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      after();
    };
  }, []);

  return null;
}
