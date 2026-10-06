import { generateRoomCode } from "@/lib/roomCode";
import { hasLink } from "@/lib/linkText";
import { cleanText, jsonError, readJson } from "@/lib/server/http";
import { newOwnerKey } from "@/lib/server/owner";
import { getStore } from "@/lib/server/store";

/** สร้างห้อง · ส่งรหัสเจ้าของกลับไปให้เครื่องคนสร้างครั้งเดียว (server เก็บแค่ hash) */
export async function POST(req: Request) {
  const body = await readJson<{ name: string }>(req);
  const name = cleanText(body.name, 40) ?? "ห้องซ้อม";
  if (hasLink(name)) return jsonError("ชื่อห้องห้ามมีลิงก์หรือชื่อเว็บ", 400);
  const store = getStore();
  const owner = newOwnerKey();
  for (let i = 0; i < 5; i++) {
    const room = await store.createRoom(generateRoomCode(), name, owner.hash);
    if (room) return Response.json({ room, ownerKey: owner.key }, { status: 201 });
  }
  return jsonError("สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง", 503);
}
