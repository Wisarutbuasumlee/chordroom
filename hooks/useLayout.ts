"use client";

import { useSyncExternalStore } from "react";

/**
 * phone  = มือถือ: เมนูล่าง 3 แท็บ
 * panel  = หน้าต่างแคบบนจอใหญ่: iPad Split View / Slide Over หรือหน้าต่างห้องแคบๆ บนคอม
 * desk   = จอกว้าง (ไอแพดเต็มจอ, คอม): แถบข้าง + พื้นที่หลัก
 */
export type Layout = "phone" | "panel" | "desk";

export interface LayoutInfo {
  layout: Layout;
  /** จอสัมผัส (ไอแพด/มือถือ) ไม่มีหน้าต่างลอย/คีย์ลัด */
  touch: boolean;
  isMac: boolean;
}

let cached: LayoutInfo | null = null;

function compute(): LayoutInfo {
  const w = window.innerWidth;
  const shortSide = Math.min(screen.width, screen.height);
  const touch = matchMedia("(pointer: coarse)").matches;
  const layout: Layout = w >= 768 ? "desk" : shortSide >= 700 ? "panel" : "phone";
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform) || /Mac OS X/.test(navigator.userAgent);
  const next = { layout, touch, isMac };
  if (!cached || cached.layout !== next.layout || cached.touch !== next.touch || cached.isMac !== next.isMac) {
    cached = next;
  }
  return cached;
}

function subscribe(cb: () => void) {
  window.addEventListener("resize", cb);
  window.addEventListener("orientationchange", cb);
  return () => {
    window.removeEventListener("resize", cb);
    window.removeEventListener("orientationchange", cb);
  };
}

export function useLayout(): LayoutInfo | null {
  return useSyncExternalStore(subscribe, compute, () => null);
}
