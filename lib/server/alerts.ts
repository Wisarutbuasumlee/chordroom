import { notifyDiscord } from "./notify";
import type { Store } from "./store";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * แจ้ง Discord แต่ไม่ซ้ำเรื่องเดิมภายใน cooldown (จำเวลาที่แจ้งล่าสุดไว้ใน app_state)
 * จำเฉพาะตอนส่งสำเร็จ ถ้ายังไม่ได้ตั้ง webhook รอบหน้าจะลองใหม่
 */
export async function alertOnce(store: Store, key: string, message: string, cooldownMs = DAY_MS): Promise<boolean> {
  const last = await store.getState<{ at: string }>(`alert:${key}`);
  if (last && Date.now() - new Date(last.at).getTime() < cooldownMs) return false;
  const sent = await notifyDiscord(message);
  if (sent) await store.setState(`alert:${key}`, { at: new Date().toISOString() });
  return sent;
}

/**
 * แจ้งเมื่อสถานะเปลี่ยน (เช่น ok → blocked และ blocked → ok) ไม่แจ้งซ้ำถ้าสถานะเดิม
 * สถานะ "unknown" (ตรวจไม่ได้) ไม่เปลี่ยนค่าที่จำไว้
 */
export async function alertOnChange(
  store: Store,
  key: string,
  status: string,
  messages: Record<string, string>,
): Promise<boolean> {
  if (status === "unknown") return false;
  const prev = await store.getState<{ status: string }>(`status:${key}`);
  if (prev?.status === status) return false;
  // ครั้งแรกที่ตรวจและทุกอย่างปกติ: จำไว้เฉยๆ ไม่ต้องแจ้ง
  const message = prev || status !== "ok" ? messages[status] : undefined;
  if (message && !(await notifyDiscord(message))) return false;
  await store.setState(`status:${key}`, { status, at: new Date().toISOString() });
  return Boolean(message);
}
