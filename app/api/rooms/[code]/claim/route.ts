import { jsonError, roomCodeParam } from "@/lib/server/http";
import { newOwnerKey } from "@/lib/server/owner";
import { getStore } from "@/lib/server/store";

/** ห้องที่สร้างก่อนมีระบบเจ้าของ: คนแรกที่กดได้เป็นเจ้าของ */
export async function POST(_req: Request, ctx: RouteContext<"/api/rooms/[code]/claim">) {
  const code = await roomCodeParam(ctx.params);
  if (!code) return jsonError("รหัสห้องไม่ถูกต้อง", 400);
  const store = getStore();
  if ((await store.getOwnerHash(code)) === undefined) return jsonError("ไม่พบห้องนี้", 404);
  const owner = newOwnerKey();
  if (!(await store.claimRoom(code, owner.hash))) return jsonError("ห้องนี้มีเจ้าของแล้ว", 409);
  return Response.json({ ownerKey: owner.key });
}
