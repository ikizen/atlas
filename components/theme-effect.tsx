"use client";

import { useEffect } from "react";
import { useAtlasStore } from "@/lib/store";

/**
 * Keeps the <html> `.dark` class in sync with the persisted theme setting.
 * Initial paint is handled by the inline no-flash script in the root layout;
 * this only reacts to in-app theme toggles.
 */
export function ThemeEffect() {
  const theme = useAtlasStore((s) => s.settings.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return null;
}
