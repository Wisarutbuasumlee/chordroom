"use client";

import { timeAgo, useNow } from "@/hooks/useNow";
import type { Member } from "@/lib/types";
import { ChevronRightIcon } from "../Icons";
import { Avatar, SectionLabel } from "../ui";
import { useRoomCtx } from "./RoomContext";

/** คนในห้อง: ตัวเราขึ้นก่อน ตามด้วยคนอื่น */
export function useSortedMembers(): Member[] {
  const { members, me } = useRoomCtx();
  const others = members.filter((m) => m.clientId !== me.clientId);
  return [me, ...others];
}

/** "ต้น, มิว และคุณ กำลังดูเพลงเดียวกัน" */
export function WatchingTogether() {
  const list = useSortedMembers();
  const { following } = useRoomCtx();
  const others = list
    .slice(1)
    .filter((m) => m.following)
    .map((m) => m.name);
  const text = !following
    ? "คุณกำลังดูคนเดียว"
    : others.length
      ? `${others.join(", ")} และคุณ กำลังดูเพลงเดียวกัน`
      : "มีแค่คุณในห้อง";
  return <div className="min-w-0 flex-1 truncate text-[13px] text-muted">{text}</div>;
}

export function MemberList({ title = true }: { title?: boolean }) {
  const { me, isOwner, admin } = useRoomCtx();
  const list = useSortedMembers();
  return (
    <div className="flex flex-col gap-2.5">
      {title && <SectionLabel>คนในห้อง · {list.length}</SectionLabel>}
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {list.map((m) => (
          <li key={m.clientId} className="flex items-center gap-2.5">
            <Avatar name={m.name} color={m.color} />
            <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">
              {m.name}
              {m.clientId === me.clientId && <span className="font-normal text-muted"> (คุณ)</span>}
              {!m.following && <span className="text-xs font-normal text-muted"> · ดูเพลงอื่นอยู่</span>}
            </div>
            {isOwner && m.clientId !== me.clientId && (
              <button
                type="button"
                onClick={() => void admin.kick(m)}
                aria-label={`เตะ ${m.name} ออกจากห้อง`}
                className="h-9 shrink-0 rounded-full border-2 border-line px-3 text-[13px] font-bold text-ink"
              >
                เตะออก
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "เปิดไปแล้วในห้องนี้" · แตะเพื่อเปิดซ้ำให้ทั้งห้อง
 * withCurrent = แสดงเพลงที่ห้องเปิดอยู่เป็นแถวแรก (ไฮไลต์ "ตอนนี้") แบบบอร์ด S-Desk
 */
export function HistoryList({
  limit = 8,
  onPicked,
  withCurrent = false,
  title = true,
}: {
  limit?: number;
  onPicked?(): void;
  withCurrent?: boolean;
  title?: boolean;
}) {
  const { history, current, pick } = useRoomCtx();
  const now = useNow(30_000);
  const rows = (withCurrent ? history : history.filter((h) => h.id !== current?.id)).slice(0, limit);
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {title && <SectionLabel>เปิดไปแล้วในห้องนี้</SectionLabel>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((h) => {
          const isNow = h.id === current?.id;
          return (
            <li key={h.id}>
              <button
                type="button"
                disabled={isNow}
                onClick={() => {
                  onPicked?.();
                  void pick(
                    h.songId ? { songId: h.songId } : { url: h.url, title: h.title, artist: h.artist ?? undefined },
                  );
                }}
                className={`flex min-h-[50px] w-full items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left text-ink ${
                  isNow ? "border-primary bg-soft" : "border-line bg-surface"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{h.title}</div>
                  <div className="truncate text-xs text-muted">
                    {h.source} · {h.openedBy} · {isNow ? "ตอนนี้" : timeAgo(h.openedAt, now)}
                  </div>
                </div>
                {!isNow && <ChevronRightIcon size={18} />}
                {!isNow && <span className="sr-only">เปิดเพลงนี้ให้ทั้งห้องอีกครั้ง</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
