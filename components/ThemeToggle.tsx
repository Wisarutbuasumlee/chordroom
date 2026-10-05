"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, currentTheme, THEME_KEY, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./Icons";

function subscribe(cb: () => void) {
  // อีกแท็บสลับโหมด: ให้แท็บนี้เปลี่ยนตาม
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY || (e.newValue !== "light" && e.newValue !== "dark")) return;
    document.documentElement.classList.toggle("dark", e.newValue === "dark");
    cb();
  };
  window.addEventListener("chordroom:theme", cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("chordroom:theme", cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => "light");
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => applyTheme(dark ? "light" : "dark")}
      aria-label={dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-surface text-ink ${className}`}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
