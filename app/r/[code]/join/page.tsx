import { notFound } from "next/navigation";
import JoinRoom from "@/components/JoinRoom";
import { normalizeRoomCode } from "@/lib/roomCode";

export default async function JoinPage({ params }: PageProps<"/r/[code]/join">) {
  const { code: raw } = await params;
  const code = normalizeRoomCode(decodeURIComponent(raw));
  if (!code) notFound();
  return <JoinRoom code={code} />;
}
