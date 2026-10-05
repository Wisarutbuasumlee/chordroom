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

export function MemberList({ title = true }: { title?: boolean }) {
  const { me } = useRoomCtx();
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
            </div>
            {m.following === false && m.clientId !== me.clientId && (
              <span className="text-xs text-muted" title="แท็บคอร์ดของคนนี้ยังไม่ตรงกับเพลงของห้อง">
                ดูเพลงอื่นอยู่
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "เปิดไปแล้วในห้องนี้" · แตะเพื่อเปิดซ้ำให้ทั้งห้อง */
export function HistoryList({ limit = 8 }: { limit?: number }) {
  const { history, current, pick } = useRoomCtx();
  const now = useNow(30_000);
  const past = history.filter((h) => h.id !== current?.id).slice(0, limit);
  if (!past.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>เปิดไปแล้วในห้องนี้</SectionLabel>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {past.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => void pick(h.songId ? { songId: h.songId } : { url: h.url, title: h.title, artist: h.artist ?? undefined })}
              className="flex min-h-[54px] w-full items-center gap-2.5 rounded-[14px] border-2 border-edge bg-surface px-3.5 py-2 text-left text-ink"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold">{h.title}</div>
                <div className="truncate text-xs text-muted">
                  {h.source} · {h.openedBy} · {timeAgo(h.openedAt, now)}
                </div>
              </div>
              <ChevronRightIcon size={18} />
              <span className="sr-only">เปิดเพลงนี้ให้ทั้งห้องอีกครั้ง</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
