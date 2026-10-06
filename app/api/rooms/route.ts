import { generateRoomCode } from "@/lib/roomCode";
import { hasLink } from "@/lib/linkText";
import { cleanText, jsonError, readJson } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export async function POST(req: Request) {
  const body = await readJson<{ name: string }>(req);
  const name = cleanText(body.name, 40) ?? "ห้องซ้อม";
  if (hasLink(name)) return jsonError("ชื่อห้องห้ามมีลิงก์หรือชื่อเว็บ", 400);
  const store = getStore();
  for (let i = 0; i < 5; i++) {
    const room = await store.createRoom(generateRoomCode(), name);
    if (room) return Response.json({ room }, { status: 201 });
  }
  return jsonError("สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง", 503);
}
