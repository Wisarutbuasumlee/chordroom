"use client";

import { loadOwnerKey, saveOwnerKey } from "./profile";
import type { Room } from "./types";

export type AdminResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** เรียก API จัดการห้องด้วยรหัสเจ้าของในเครื่อง (server ตรวจซ้ำทุกครั้ง) */
async function call<T>(code: string, path: string, method: string, body?: unknown): Promise<AdminResult<T>> {
  const key = loadOwnerKey(code);
  if (!key) return { ok: false, error: "เฉพาะเจ้าของห้องเท่านั้น" };
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-owner-key": key },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? "ทำรายการไม่สำเร็จ" };
    return { ok: true, ...(data as T) };
  } catch {
    return { ok: false, error: "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง" };
  }
}

export const renameRoom = (code: string, name: string) => call<{ room: Room }>(code, "", "PATCH", { name });
export const deleteRoom = (code: string) => call(code, "", "DELETE");
export const kickMember = (code: string, clientId: string) => call(code, "/kick", "POST", { clientId });

/** ห้องที่ยังไม่มีเจ้าของ: ตั้งเครื่องนี้เป็นเจ้าของ */
export async function claimRoom(code: string): Promise<AdminResult> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/claim`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.ownerKey !== "string") return { ok: false, error: data.error ?? "ทำรายการไม่สำเร็จ" };
    saveOwnerKey(code, data.ownerKey);
    return { ok: true };
  } catch {
    return { ok: false, error: "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง" };
  }
}

/** ลิงก์เจ้าของร่วม: เปิดแล้วเครื่องนั้นได้รหัสเจ้าของด้วย (อยู่หลัง # จึงไม่ถูกส่งไป server หรือเก็บใน log) */
export function ownerLink(code: string): string | null {
  const key = loadOwnerKey(code);
  return key ? `${window.location.origin}/r/${code}#owner=${key}` : null;
}

/** อ่านรหัสเจ้าของจากลิงก์เจ้าของร่วม แล้วลบออกจากแถบที่อยู่ */
export function takeOwnerKeyFromHash(code: string) {
  const m = window.location.hash.match(/owner=([A-Za-z0-9_-]{16,})/);
  if (!m) return;
  saveOwnerKey(code, m[1]);
  history.replaceState(null, "", window.location.pathname + window.location.search);
}
