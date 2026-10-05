"use client";

import { useAlternates } from "@/hooks/useAlternates";
import { sinceText, useNow } from "@/hooks/useNow";
import { SOURCE_BY_ID } from "@/lib/sources";
import { ExternalIcon, UndoIcon } from "../Icons";
import { Avatar } from "../ui";
import { useRoomCtx } from "./RoomContext";

/** สีวงกลมของคนที่เปิดเพลง (หาจากคนในห้อง ไม่เจอใช้สีฟ้า) */
function useColorOf() {
  const { members } = useRoomCtx();
  return (name: string) => members.find((m) => m.name === name)?.color ?? "#6CB4FF";
}

/** ชื่อเพลง + ศิลปิน · เว็บ · ใครเปิด */
export function SongHeading({ size }: { size: "sm" | "md" | "lg" }) {
  const { viewSong, room, code } = useRoomCtx();
  const now = useNow();
  const title = size === "lg" ? "text-[30px]" : size === "md" ? "text-2xl" : "text-xl";
  if (!viewSong) {
    return (
      <div className="min-w-0 flex-1">
        <div className={`truncate font-display font-bold ${title}`}>{room.name}</div>
        <div className="text-[13px] text-muted">รหัส {code} · ยังไม่มีเพลงในห้อง</div>
      </div>
    );
  }
  const meta = [viewSong.artist, SOURCE_BY_ID[viewSong.source].host];
  if (size !== "sm") meta.push(`${viewSong.openedBy} เปิด${size === "lg" ? "ให้ทุกคน" : ""}${sinceText(viewSong.openedAt, now)}`);
  return (
    <div className="min-w-0 flex-1">
      <h1 className={`m-0 truncate font-display leading-tight font-bold ${title}`}>{viewSong.title}</h1>
      <div className="truncate text-[13px] text-muted">{meta.filter(Boolean).join(" · ")}</div>
    </div>
  );
}

/** สวิตช์ "ติดตามห้อง": ปิดแล้วหน้าคอร์ดจะค้างเพลงนี้ไว้ ห้องเปลี่ยนเพลงก็ไม่เปลี่ยนตาม */
export function FollowToggle() {
  const { following, setFollowing } = useRoomCtx();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={following}
      onClick={() => setFollowing(!following)}
      title={following ? "หน้าคอร์ดเปลี่ยนตามเพลงของห้อง" : "ค้างเพลงนี้ไว้ ไม่เปลี่ยนตามห้อง"}
      className={`flex h-11 shrink-0 items-center gap-2 rounded-full border-2 border-edge px-3.5 text-sm font-bold ${
        following ? "bg-hl text-on-hl" : "bg-surface text-ink"
      }`}
    >
      <span
        aria-hidden="true"
        className={`box-border flex h-5 w-[34px] items-center rounded-[10px] p-0.5 ${
          following ? "justify-end bg-[#0F1A2B]" : "justify-start border-2 border-edge bg-line"
        }`}
      >
        <span className={`rounded-full ${following ? "size-4 bg-white" : "size-3 bg-muted"}`} />
      </span>
      ติดตามห้อง
    </button>
  );
}

/** เว็บอื่นที่มีเพลงนี้: กดแล้วเปลี่ยนเพลงของห้องเป็นเวอร์ชันจากเว็บนั้น */
export function SourceSwitcher() {
  const { viewSong, pick } = useRoomCtx();
  const sources = useAlternates(viewSong);
  if (!viewSong || sources.length < 2) return null;
  return (
    <div role="group" aria-label="เว็บอื่นที่มีเพลงนี้" className="flex rounded-full border-2 border-edge bg-surface p-[3px]">
      {sources.map((s) => {
        const on = s.url === viewSong.url;
        return (
          <button
            key={s.source}
            type="button"
            aria-pressed={on}
            onClick={() => !on && void pick({ songId: s.songId })}
            className={`h-9 rounded-full px-3.5 text-[13px] ${on ? "bg-primary font-bold text-on-primary" : "text-ink"}`}
          >
            {SOURCE_BY_ID[s.source].label}
          </button>
        );
      })}
    </div>
  );
}

export function OpenInWeb({ label }: { label: boolean }) {
  const { viewSong } = useRoomCtx();
  if (!viewSong) return null;
  return (
    <a
      href={viewSong.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="เปิดในเว็บต้นทาง"
      title="เปิดในเว็บต้นทาง"
      className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border-2 border-edge bg-surface text-sm font-bold text-ink no-underline ${
        label ? "px-3.5" : "w-11"
      }`}
    >
      <ExternalIcon size={18} />
      {label && "เปิดในเว็บ"}
    </a>
  );
}

export function UndoButton({ label = "เพลงก่อน", className = "" }: { label?: string; className?: string }) {
  const { history, undo } = useRoomCtx();
  return (
    <button
      type="button"
      onClick={() => void undo()}
      disabled={history.length < 2}
      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-edge bg-surface px-3.5 text-sm font-bold text-ink disabled:opacity-40 ${className}`}
    >
      <UndoIcon size={16} />
      {label}
    </button>
  );
}

/** มือถือ: แถบเหลือง "ต้น เปิดเพลงนี้ให้ทุกคน · เมื่อสักครู่ [เพลงก่อน]" */
export function OpenedByStrip() {
  const { current, following, history, undo } = useRoomCtx();
  const colorOf = useColorOf();
  const now = useNow();
  if (!current || !following) return null;
  return (
    <div className="mx-3 mb-2.5 flex items-center gap-2.5 rounded-2xl border-2 border-edge bg-hl py-2 pr-2 pl-2.5 text-on-hl">
      <Avatar name={current.openedBy} color={colorOf(current.openedBy)} size={28} className="border-[#0F1A2B]" />
      <div className="min-w-0 flex-1 text-[13px] leading-snug font-semibold">
        {current.openedBy} เปิดเพลงนี้ให้ทุกคน · {sinceText(current.openedAt, now)}
      </div>
      <button
        type="button"
        onClick={() => void undo()}
        disabled={history.length < 2}
        className="h-9 shrink-0 rounded-full border-2 border-[#0F1A2B] bg-white px-3 text-[13px] font-bold text-[#0F1A2B] disabled:opacity-50"
      >
        เพลงก่อน
      </button>
    </div>
  );
}

/** คอม: การ์ดลอยมุมขวาล่างหลังมีคนเปิดเพลง "ต้น เปิด X ให้ทุกคน [ย้อนกลับ]" (แสดง 15 วินาที) */
export function ChangeCard() {
  const { current, following, lastEvent, history, undo } = useRoomCtx();
  const colorOf = useColorOf();
  const now = useNow(1000);
  if (!current || !following || !lastEvent || lastEvent.kind !== "set" || now - lastEvent.at > 15_000) return null;
  return (
    <div
      role="status"
      className="pop-in fixed right-7 bottom-7 z-40 flex max-w-[calc(100vw-56px)] items-center gap-3 rounded-[18px] border-2 border-edge bg-surface py-2.5 pr-2.5 pl-3.5 text-ink shadow-hard"
    >
      <Avatar name={current.openedBy} color={colorOf(current.openedBy)} size={32} />
      <div className="min-w-0 truncate text-sm">
        {current.openedBy} เปิด <b>{current.title}</b> ให้ทุกคน
      </div>
      <button
        type="button"
        onClick={() => void undo()}
        disabled={history.length < 2}
        className="h-10 shrink-0 rounded-full border-2 border-edge bg-hl px-3.5 font-bold text-on-hl disabled:opacity-50"
      >
        ย้อนกลับ
      </button>
    </div>
  );
}

/** ปิดติดตามห้องอยู่ แล้วห้องเปลี่ยนเพลง: "มิว เปลี่ยนเพลงของห้องเป็น … [ไปดูด้วย]" */
export function RoomMovedBanner({ className = "" }: { className?: string }) {
  const { current, viewSong, following, setFollowing } = useRoomCtx();
  const colorOf = useColorOf();
  if (following || !current || current.id === viewSong?.id) return null;
  return (
    <div
      role="status"
      className={`pop-in z-40 flex items-center gap-3 rounded-[20px] border-2 border-edge bg-hl py-3 pr-3 pl-4 text-on-hl shadow-hard-lg ${className}`}
    >
      <Avatar name={current.openedBy} color={colorOf(current.openedBy)} size={38} className="border-[#0F1A2B]" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{current.openedBy} เปลี่ยนเพลงของห้องเป็น</div>
        <div className="truncate font-display text-[17px] font-bold">
          {current.title} · {SOURCE_BY_ID[current.source].label}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setFollowing(true)}
        className="h-[46px] shrink-0 rounded-full border-2 border-[#0F1A2B] bg-[#0F1A2B] px-[18px] font-bold text-white"
      >
        ไปดูด้วย
      </button>
    </div>
  );
}
