import { jsonError, roomCodeParam } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  const code = await roomCodeParam(ctx.params);
  if (!code) return jsonError("รหัสห้องไม่ถูกต้อง", 400);
  const snapshot = await getStore().getSnapshot(code);
  if (!snapshot) return jsonError("ไม่พบห้องนี้", 404);
  return Response.json(snapshot, { headers: { "cache-control": "no-store" } });
}
