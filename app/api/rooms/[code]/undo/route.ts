import { jsonError, roomCodeParam } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

/** ปุ่ม "เพลงก่อน": ย้อนเพลงล่าสุด ใครในห้องก็กดได้ */
export async function POST(_req: Request, ctx: RouteContext<"/api/rooms/[code]/undo">) {
  const code = await roomCodeParam(ctx.params);
  if (!code) return jsonError("รหัสห้องไม่ถูกต้อง", 400);
  const snapshot = await getStore().undo(code);
  if (!snapshot) return jsonError("ไม่พบห้องนี้", 404);
  return Response.json(snapshot);
}
