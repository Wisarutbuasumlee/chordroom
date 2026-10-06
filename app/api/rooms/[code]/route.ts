import { hasLink } from "@/lib/linkText";
import { cleanText, jsonError, readJson, roomCodeParam } from "@/lib/server/http";
import { requireOwner } from "@/lib/server/owner";
import { getStore } from "@/lib/server/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  const code = await roomCodeParam(ctx.params);
  if (!code) return jsonError("รหัสห้องไม่ถูกต้อง", 400);
  const snapshot = await getStore().getSnapshot(code);
  if (!snapshot) return jsonError("ไม่พบห้องนี้", 404);
  return Response.json(snapshot, { headers: { "cache-control": "no-store" } });
}

/** เปลี่ยนชื่อห้อง (เฉพาะเจ้าของ) */
export async function PATCH(req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  const code = await roomCodeParam(ctx.params);
  if (!code) return jsonError("รหัสห้องไม่ถูกต้อง", 400);
  const body = await readJson<{ name: string }>(req);
  const name = cleanText(body.name, 40);
  if (!name) return jsonError("ใส่ชื่อห้องก่อน", 400);
  if (hasLink(name)) return jsonError("ชื่อห้องห้ามมีลิงก์หรือชื่อเว็บ", 400);
  const store = getStore();
  const denied = await requireOwner(req, store, code);
  if (denied) return denied;
  const room = await store.renameRoom(code, name);
  if (!room) return jsonError("ไม่พบห้องนี้", 404);
  return Response.json({ room });
}

/** ลบห้องและประวัติเพลงทั้งหมด (เฉพาะเจ้าของ) */
export async function DELETE(req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  const code = await roomCodeParam(ctx.params);
  if (!code) return jsonError("รหัสห้องไม่ถูกต้อง", 400);
  const store = getStore();
  const denied = await requireOwner(req, store, code);
  if (denied) return denied;
  if (!(await store.deleteRoom(code))) return jsonError("ไม่พบห้องนี้", 404);
  return Response.json({ ok: true });
}
