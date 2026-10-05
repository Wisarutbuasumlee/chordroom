"use client";

import { useEffect, useState } from "react";

/** เวลาปัจจุบันที่อัปเดตทุก n มิลลิวินาที (ไว้แสดง "เมื่อสักครู่", "6 นาทีที่แล้ว") */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function timeAgo(iso: string, now: number): string {
  const sec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "เมื่อสักครู่";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  return `${Math.round(hr / 24)} วันที่แล้ว`;
}

/** ใช้ต่อท้ายกริยา: "มิว เปลี่ยนเมื่อสักครู่" / "มิว เปลี่ยนเมื่อ 6 นาทีที่แล้ว" */
export function sinceText(iso: string, now: number): string {
  const t = timeAgo(iso, now);
  return t.startsWith("เมื่อ") ? t : `เมื่อ ${t}`;
}
