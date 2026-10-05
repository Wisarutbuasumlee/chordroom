import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RoomApp from "@/components/room/RoomApp";
import { normalizeRoomCode } from "@/lib/roomCode";

export const metadata: Metadata = { title: "คอร์ด · ChordRoom" };

/** หน้าดูคอร์ด: ฝังหน้าเว็บคอร์ดของเพลงปัจจุบัน และเปลี่ยนตามห้องเอง */
export default async function ViewerPage({ params }: PageProps<"/r/[code]/view">) {
  const { code: raw } = await params;
  const code = normalizeRoomCode(decodeURIComponent(raw));
  if (!code) notFound();
  return <RoomApp code={code} mode="viewer" />;
}
