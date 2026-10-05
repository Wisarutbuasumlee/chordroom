"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sinceText, useNow } from "@/hooks/useNow";
import { loadSidebarOpen, saveSidebarOpen } from "@/lib/profile";
import { SOURCE_BY_ID } from "@/lib/sources";
import { ChevronRightIcon, CloseIcon, ExternalIcon, LinkIcon, SearchIcon, UndoIcon } from "../Icons";
import ThemeToggle from "../ThemeToggle";
import { AvatarStack, Kbd, Logo } from "../ui";
import ChordFrame from "./ChordFrame";
import { HistoryList, MemberList, useSortedMembers } from "./People";
import { useRoomCtx } from "./RoomContext";
import SearchPanel from "./SearchPanel";

const pillBtn =
  "flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border-2 border-edge bg-surface px-3 text-sm font-bold text-ink no-underline disabled:opacity-40";

/** ชื่อเพลง + รายละเอียดของเพลงที่ห้องกำลังเปิด (ใช้ในแถบบน) */
function SongTitle() {
  const { current, room, code } = useRoomCtx();
  const now = useNow();
  const meta = current
    ? [current.artist, SOURCE_BY_ID[current.source].host, `${current.openedBy} เปิด${sinceText(current.openedAt, now)}`]
        .filter(Boolean)
        .join(" · ")
    : `${room.name} · ${code}`;
  return (
    <div className="min-w-0 flex-1 px-1">
      <div className="truncate font-display text-base leading-tight font-bold sm:text-lg">
        {current?.title ?? "ยังไม่มีเพลงในห้อง"}
      </div>
      <div className="truncate text-xs text-muted">{meta}</div>
    </div>
  );
}

function SongActions({ labels }: { labels: boolean }) {
  const { current, history, undo } = useRoomCtx();
  return (
    <>
      <button type="button" onClick={() => void undo()} disabled={history.length < 2} className={pillBtn} aria-label="กลับไปเพลงก่อน">
        <UndoIcon size={18} />
        {labels && <span>เพลงก่อน</span>}
      </button>
      {current && (
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          className={pillBtn}
          aria-label="เปิดหน้าเว็บต้นฉบับในแท็บใหม่"
          title="เปิดหน้าเว็บต้นฉบับ"
        >
          <ExternalIcon size={18} />
        </a>
      )}
    </>
  );
}

// ---------- มือถือ / หน้าต่างแคบ: แถบบน + หน้าคอร์ดเต็มจอ ----------

export function CompactRoom({ searchOpen, setSearchOpen }: { searchOpen: boolean; setSearchOpen(v: boolean): void }) {
  const { openInvite, openSearch } = useRoomCtx();
  const members = useSortedMembers();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-1.5 border-b-2 border-edge bg-surface px-2 pt-[max(8px,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={openInvite}
          aria-label={`ห้อง: ชวนเพื่อน คนในห้อง ${members.length} คน และประวัติเพลง`}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-hl font-display text-sm font-bold text-on-hl"
        >
          ห้อง
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-edge bg-surface font-sans text-[11px] text-ink">
            {members.length}
          </span>
        </button>
        <SongTitle />
        <button type="button" onClick={openSearch} className={pillBtn} aria-label="ค้นหาเพลง">
          <SearchIcon size={18} />
        </button>
        <SongActions labels={false} />
      </header>
      <div className="min-h-0 flex-1">
        <ChordFrame />
      </div>
      {searchOpen && <SearchSheet onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

/** ค้นหาบนมือถือ: แผ่นเลื่อนขึ้นจากล่าง เลือกเพลงแล้วปิดเอง */
function SearchSheet({ onClose }: { onClose(): void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-center sm:p-4 sm:pt-[8vh]">
      <button type="button" aria-label="ปิดการค้นหา" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-dim/80" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="ค้นหาเพลง"
        className="sheet-in relative flex max-h-[88dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-[28px] border-t-2 border-edge bg-surface p-4 pb-8 sm:max-w-[560px] sm:rounded-[24px] sm:border-2 sm:shadow-hard-xl"
      >
        <div className="flex items-center gap-2">
          <h2 className="m-0 flex-1 font-display text-xl font-bold">ค้นหาเพลง</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex size-11 items-center justify-center rounded-full border-2 border-edge text-ink"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <SearchPanel autoFocus onPicked={onClose} />
      </section>
    </div>
  );
}

// ---------- คอม / ไอแพด: แถบข้างซ้าย (พับได้) + หน้าคอร์ดขวา ----------

export function DeskRoom() {
  const { room, code, info, openInvite, openSearch, connected } = useRoomCtx();
  const members = useSortedMembers();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่านค่าที่จำไว้ในเครื่องได้หลัง mount เท่านั้น
    setOpen(loadSidebarOpen());
  }, []);
  const toggle = (v: boolean) => {
    setOpen(v);
    saveSidebarOpen(v);
  };

  return (
    <div className="flex min-h-0 flex-1">
      {open && (
        <aside className="flex w-[340px] shrink-0 flex-col gap-5 overflow-y-auto border-r-2 border-edge bg-surface px-4 py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex-1 text-ink no-underline" aria-label="ChordRoom หน้าแรก">
              <Logo size={34} textClass="text-lg" />
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => toggle(false)}
              aria-label="พับแถบข้าง ให้หน้าคอร์ดเต็มจอ"
              title="พับแถบข้าง"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-surface text-ink"
            >
              <ChevronRightIcon size={18} className="rotate-180" />
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-[18px] border-2 border-edge bg-hl p-3.5 text-on-hl">
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-lg font-bold">{room.name}</div>
              <div className="text-[13px]">
                รหัส <span className="font-mono font-bold tracking-wider">{code}</span>
                {!connected && <span> · กำลังเชื่อมต่อ…</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={openInvite}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-[#0F1A2B] bg-white px-3.5 text-sm font-bold text-[#0F1A2B]"
            >
              <LinkIcon size={16} /> ชวน
            </button>
          </div>

          <SearchPanel compact />

          <div className="mt-auto flex flex-col gap-5 border-t-2 border-line pt-4">
            <MemberList />
            <HistoryList limit={6} />
          </div>
        </aside>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b-2 border-edge bg-surface px-3 py-2">
          {!open && (
            <button
              type="button"
              onClick={() => toggle(true)}
              aria-label="เปิดแถบข้าง (ห้อง ค้นหา คนในห้อง)"
              title="เปิดแถบข้าง"
              className={`${pillBtn} bg-hl text-on-hl`}
            >
              <ChevronRightIcon size={18} />
              <span>ห้อง</span>
            </button>
          )}
          <SongTitle />
          {!open && (
            <>
              <AvatarStack people={members.map((m) => ({ key: m.clientId, name: m.name, color: m.color }))} size={30} max={4} />
              <button type="button" onClick={openSearch} className={pillBtn} aria-label="ค้นหาเพลง">
                <SearchIcon size={18} />
                {!info.touch && <Kbd>{info.isMac ? "⌘ K" : "Ctrl K"}</Kbd>}
              </button>
            </>
          )}
          <SongActions labels />
        </div>
        <div className="min-h-0 flex-1">
          <ChordFrame />
        </div>
      </main>
    </div>
  );
}
