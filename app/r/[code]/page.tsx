import { notFound, redirect } from "next/navigation";
import RoomApp from "@/components/room/RoomApp";
import { normalizeRoomCode } from "@/lib/roomCode";

export default async function RoomPage({ params, searchParams }: PageProps<"/r/[code]">) {
  const { code: raw } = await params;
  const code = normalizeRoomCode(decodeURIComponent(raw));
  if (!code) notFound();
  const { invite } = await searchParams;
  if (code !== raw) redirect(`/r/${code}${invite ? "?invite=1" : ""}`);
  return <RoomApp code={code} openInvite={invite === "1"} />;
}
