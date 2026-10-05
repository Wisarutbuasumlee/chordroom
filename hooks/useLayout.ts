"use client";

import { useSyncExternalStore } from "react";

/**
 * หน้าห้องแบบหน้าเดียว (บอร์ด S-* ในไฟล์ handoff)
 * phone    = S-Song: มือถือ/หน้าต่างแคบ แถบบน + กรอบคอร์ด + เมนูล่าง 3 แท็บ
 * portrait = S-TPortrait: ไอแพดแนวตั้ง/จอกลาง แถบบน + กรอบคอร์ดเต็มจอ
 * tablet   = S-Tablet: ไอแพดแนวนอน แถบข้างมีแท็บ ค้นหา/คนในห้อง/ประวัติ
 * desk     = S-Desk: คอมจอกว้าง แถบข้างมีคนในห้อง+ประวัติ ค้นหาด้วย Ctrl+K
 */
export type Layout = "phone" | "portrait" | "tablet" | "desk";

export interface LayoutInfo {
  layout: Layout;
  /** จอสัมผัส (ไอแพด/มือถือ) ไม่มีคีย์ลัด */
  touch: boolean;
  isMac: boolean;
}

let cached: LayoutInfo | null = null;

function compute(): LayoutInfo {
  const w = window.innerWidth;
  const touch = matchMedia("(pointer: coarse)").matches;
  const layout: Layout = w < 700 ? "phone" : w < 1000 ? "portrait" : w >= 1200 && !touch ? "desk" : "tablet";
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
