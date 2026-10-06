"use client";

import { saveOwnerKey, saveRoom } from "./profile";
import type { Room } from "./types";

/** สร้างห้อง · เครื่องที่สร้างได้เป็นเจ้าของห้อง (จำรหัสเจ้าของไว้ในเครื่อง) */
export async function createRoom(name: string): Promise<{ room: Room } | { error: string }> {
  try {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await res.json();
    if (!res.ok) return { error: body.error ?? "สร้างห้องไม่สำเร็จ" };
    const room = body.room as Room;
    if (typeof body.ownerKey === "string") saveOwnerKey(room.code, body.ownerKey);
    saveRoom({ code: room.code, name: room.name });
    return { room };
  } catch {
    return { error: "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง" };
  }
}
