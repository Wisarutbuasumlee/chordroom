import type { Metadata } from "next";
import NewRoom from "@/components/NewRoom";

export const metadata: Metadata = { title: "สร้างห้องใหม่ · ChordRoom" };

export default function NewRoomPage() {
  return <NewRoom />;
}
