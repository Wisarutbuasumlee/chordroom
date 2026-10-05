"use client";

import { sinceText, useNow } from "@/hooks/useNow";
import { SOURCE_BY_ID } from "@/lib/sources";
import { MusicIcon, SearchIcon, UndoIcon } from "../Icons";
import { useRoomCtx } from "./RoomContext";

const NEW_FOR_MS = 2 * 60_000;

export default function NowPlayingCard({ variant }: { variant: "phone" | "desk" | "panel" }) {
  const { current, history, openCurrent, undo, openSearch, following, chordOpened } = useRoomCtx();
  const now = useNow();

  if (!current) {
    return (
      <section
        aria-label="เพลงที่ห้องกำลังเปิด"
        className="flex flex-col items-start gap-3 rounded-[26px] border-2 border-dashed border-edge bg-surface p-6"
      >
        <h1 className="font-display text-2xl font-bold">ยังไม่มีเพลงในห้อง</h1>
        <p className="text-[15px] text-muted">ค้นหาเพลงแล้วแตะชื่อเว็บ ทุกคนในห้องจะเห็นเพลงนั้นทันที</p>
        <button
          type="button"
          onClick={openSearch}
          className="flex h-12 items-center gap-2 rounded-full border-2 border-edge bg-primary px-5 font-display font-semibold text-on-primary"
        >
          <SearchIcon size={18} /> ค้นหาเพลง
        </button>
      </section>
    );
  }

  const isNew = now - new Date(current.openedAt).getTime() < NEW_FOR_MS;
  const host = SOURCE_BY_ID[current.source].host;
  const canUndo = history.length > 1;
  const meta = [current.artist, host].filter(Boolean).join(" · ");

  const undoBtn = (label: string, cls: string) => (
    <button
      type="button"
      onClick={() => void undo()}
      disabled={!canUndo}
      className={`flex items-center justify-center gap-1.5 rounded-full border-2 border-edge bg-surface font-bold text-ink disabled:opacity-40 ${cls}`}
    >
      <UndoIcon size={16} />
      {label}
    </button>
  );

  if (variant === "desk") {
    return (
      <section
        aria-label="เพลงที่ห้องกำลังเปิด"
        className="flex flex-wrap items-center gap-6 rounded-[28px] border-2 border-edge bg-surface p-7 shadow-hard-lg"
      >
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-2.5">
          <span className="self-start rounded-full border-2 border-edge bg-hl px-2.5 py-1 text-xs font-bold text-on-hl">
            {isNew ? "เพลงใหม่ · " : "ห้องกำลังเปิด · "}
            {current.openedBy} เปิด{sinceText(current.openedAt, now)}
          </span>
          <h1 className="m-0 font-display text-[40px] leading-[1.15] font-bold break-words">{current.title}</h1>
          <div className="text-[15px] text-muted">{meta}</div>
          <FollowStatus following={following} opened={chordOpened} />
        </div>
        <div className="flex flex-[0_1_260px] flex-col gap-3">
          <button
            type="button"
            onClick={() => openCurrent()}
            className="flex h-14 items-center justify-center gap-2.5 rounded-full border-2 border-edge bg-primary px-6 font-display text-lg font-semibold text-on-primary"
          >
            <MusicIcon size={20} />
            {following ? "ไปที่แท็บคอร์ด" : "เปิดหน้าดูคอร์ด"}
          </button>
          {undoBtn("กลับไปเพลงก่อน", "h-12 px-5 text-[15px]")}
        </div>
      </section>
    );
  }

  if (variant === "panel") {
    return (
      <section
        aria-label="เพลงที่ห้องกำลังเปิด"
        className="flex flex-col gap-3 rounded-[22px] border-2 border-edge bg-surface p-4 shadow-hard"
      >
        <span className="self-start rounded-full border-2 border-edge bg-hl px-2.5 py-0.5 text-xs font-bold text-on-hl">
          {following ? "หน้าคอร์ดเปลี่ยนตามห้องอัตโนมัติ" : isNew ? "เพลงใหม่" : "ห้องกำลังเปิด"}
        </span>
        <div>
          <div className="font-display text-[22px] leading-tight font-bold break-words">{current.title}</div>
          <div className="pt-1 text-[13px] text-muted">
            {[current.artist, current.source].filter(Boolean).join(" · ")} · {current.openedBy} เปิด
            {sinceText(current.openedAt, now)}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openCurrent()}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-edge bg-primary font-display font-semibold text-on-primary"
          >
            <MusicIcon size={18} />
            {following ? "ไปที่แท็บคอร์ด" : "เปิดคอร์ด"}
          </button>
          {undoBtn("เพลงก่อน", "h-12 px-4 text-sm")}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="เพลงที่ห้องกำลังเปิด"
      className="flex flex-col gap-4 rounded-[26px] border-2 border-edge bg-surface p-5 shadow-hard-lg"
    >
      <div className="flex flex-wrap items-center gap-2">
        {isNew && (
          <span className="rounded-full border-2 border-edge bg-hl px-2.5 py-1 text-xs font-bold text-on-hl">
            เพลงใหม่
          </span>
        )}
        <span className="text-[13px] text-muted">
          {current.openedBy} เปลี่ยน{sinceText(current.openedAt, now)}
        </span>
      </div>
      <div>
        <h1 className="m-0 font-display text-[30px] leading-[1.2] font-bold break-words">{current.title}</h1>
        <div className="pt-1 text-[15px] text-muted">{meta}</div>
      </div>
      <button
        type="button"
        onClick={() => openCurrent()}
        className="flex h-[62px] items-center justify-center gap-2.5 rounded-full border-2 border-edge bg-primary font-display text-[19px] font-semibold text-on-primary"
      >
        <MusicIcon size={22} />
        เปิดคอร์ดเพลงนี้
      </button>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-muted">หน้าคอร์ดเปลี่ยนตามห้องเอง</span>
        {undoBtn("เพลงก่อน", "h-10 shrink-0 px-3 text-[13px]")}
      </div>
    </section>
  );
}

function FollowStatus({ following, opened }: { following: boolean; opened: boolean }) {
  if (!opened) return null;
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold">
      <span className={`size-2.5 rounded-full border-2 border-edge ${following ? "bg-[#7FD6B0]" : "bg-hl"}`} />
      {following ? "แท็บคอร์ดเปิดอยู่ เปลี่ยนเพลงตามห้องเอง" : "แท็บคอร์ดถูกปิดไปแล้ว กดเปิดหน้าดูคอร์ดอีกครั้ง"}
    </div>
  );
}
