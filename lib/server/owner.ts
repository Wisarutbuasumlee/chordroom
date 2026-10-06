import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { jsonError } from "./http";
import type { Store } from "./store";

/** รหัสเจ้าของห้อง: ส่งให้เครื่องคนสร้างห้องครั้งเดียว ฝั่ง server เก็บแค่ hash */
export function newOwnerKey(): { key: string; hash: string } {
  const key = randomBytes(24).toString("base64url");
  return { key, hash: hashOwnerKey(key) };
}

export function hashOwnerKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * ตรวจว่าคำขอนี้มาจากเจ้าของห้อง (header x-owner-key) · คืน Response ถ้าไม่ผ่าน
 * ห้องที่ยังไม่มีเจ้าของ (สร้างก่อนมีระบบนี้) ต้องกด "ตั้งตัวเองเป็นเจ้าของ" ก่อน
 */
export async function requireOwner(req: Request, store: Store, code: string): Promise<Response | null> {
  const stored = await store.getOwnerHash(code);
  if (stored === undefined) return jsonError("ไม่พบห้องนี้", 404);
  const key = req.headers.get("x-owner-key");
  if (!stored || !key) return jsonError("เฉพาะเจ้าของห้องเท่านั้น", 403);
  const a = Buffer.from(hashOwnerKey(key), "hex");
  const b = Buffer.from(stored, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return jsonError("เฉพาะเจ้าของห้องเท่านั้น", 403);
  return null;
}
