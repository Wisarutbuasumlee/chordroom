"use client";

import type { Room } from "./types";

export async function createRoom(name: string): Promise<{ room: Room } | { error: string }> {
  try {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await res.json();
    return res.ok ? { room: body.room } : { error: body.error ?? "สร้างห้องไม่สำเร็จ" };
  } catch {
    return { error: "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง" };
  }
}
