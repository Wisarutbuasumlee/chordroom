import { jsonError, readJson, roomCodeParam } from "@/lib/server/http";
import { requireOwner } from "@/lib/server/owner";
import { getStore } from "@/lib/server/store";

const CLIENT_ID = /^[0-9a-f-]{36}$/i;

/** เชิญแท็บหนึ่งออกจากห้อง (เฉพาะเจ้าของ) · แท็บนั้นเห็น id ตัวเองใน snapshot แล้วออกเอง */
export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/kick">) {
  const code = await roomCodeParam(ctx.params);
  if (!code) return jsonError("รหัสห้องไม่ถูกต้อง", 400);
  const body = await readJson<{ clientId: string }>(req);
  if (typeof body.clientId !== "string" || !CLIENT_ID.test(body.clientId)) return jsonError("ไม่พบคนนี้ในห้อง", 400);
  const store = getStore();
  const denied = await requireOwner(req, store, code);
  if (denied) return denied;
  if (!(await store.kick(code, body.clientId.toLowerCase()))) return jsonError("ไม่พบห้องนี้", 404);
  return Response.json({ ok: true });
}
