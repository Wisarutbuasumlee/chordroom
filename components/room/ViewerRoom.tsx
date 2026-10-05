"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sinceText, useNow } from "@/hooks/useNow";
import { SOURCE_BY_ID } from "@/lib/sources";
import { CloseIcon, ExternalIcon, LinkIcon, SearchIcon, UndoIcon } from "../Icons";
import ThemeToggle from "../ThemeToggle";
import { useRoomCtx } from "./RoomContext";
import SearchPanel from "./SearchPanel";

/**
 * หน้าดูคอร์ด (/r/{code}/view): ฝังหน้าเว็บคอร์ดของเพลงปัจจุบันไว้เต็มจอ
 * ใครในห้องเปลี่ยนเพลง หน้านี้โหลดเพลงใหม่ให้เอง · มีปุ่มค้นหา/เพลงก่อนในแถบบน ใช้แท็บเดียวจบได้
 */
export default function ViewerRoom({ searchOpen, setSearchOpen }: { searchOpen: boolean; setSearchOpen(v: boolean): void }) {
  const { room, code, current, history, undo, openSearch, openInvite } = useRoomCtx();
  const now = useNow();
  const frameKey = current ? String(current.id) : "none";
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const meta = current
    ? [current.artist, SOURCE_BY_ID[current.source].host, `${current.openedBy} เปิด${sinceText(current.openedAt, now)}`]
        .filter(Boolean)
        .join(" · ")
    : `${room.name} · ${code}`;

  const iconBtn =
    "flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border-2 border-edge bg-surface px-3 text-sm font-bold text-ink disabled:opacity-40";

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex items-center gap-1.5 border-b-2 border-edge bg-surface px-2 py-2 sm:gap-2 sm:px-3">
        <Link
          href={`/r/${code}`}
          aria-label="กลับไปหน้าห้อง"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-hl font-display text-sm font-bold text-on-hl no-underline"
        >
          ห้อง
        </Link>
        <div className="min-w-0 flex-1 px-1">
          <div className="truncate font-display text-base leading-tight font-bold sm:text-lg">
            {current?.title ?? "ยังไม่มีเพลงในห้อง"}
          </div>
          <div className="truncate text-xs text-muted">{meta}</div>
        </div>
        <button type="button" onClick={openSearch} className={iconBtn} aria-label="ค้นหาเพลง">
          <SearchIcon size={18} />
          <span className="hidden sm:inline">ค้นหา</span>
        </button>
        <button type="button" onClick={() => void undo()} disabled={history.length < 2} className={iconBtn} aria-label="กลับไปเพลงก่อน">
          <UndoIcon size={18} />
          <span className="hidden sm:inline">เพลงก่อน</span>
        </button>
        <button type="button" onClick={openInvite} className={`${iconBtn} hidden md:flex`} aria-label="ชวนเพื่อน">
          <LinkIcon size={18} />
        </button>
        {current && (
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${iconBtn} no-underline`}
            aria-label="เปิดหน้าเว็บต้นฉบับในแท็บใหม่"
            title="เปิดหน้าเว็บต้นฉบับ"
          >
            <ExternalIcon size={18} />
          </a>
        )}
        <ThemeToggle className="hidden sm:flex" />
      </header>

      <div className="relative min-h-0 flex-1 bg-white">
        {current ? (
          <>
            <iframe
              key={frameKey}
              src={current.url}
              title={`คอร์ด ${current.title}`}
              onLoad={() => setLoadedKey(frameKey)}
              // หน้าเว็บคอร์ดพาหน้าเราไปที่อื่นไม่ได้ (ไม่มี allow-top-navigation) แต่ลิงก์/โฆษณาเปิดแท็บใหม่ได้
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              allow="fullscreen; clipboard-write"
              className="absolute inset-0 size-full border-0"
            />
            {loadedKey !== frameKey && (
              <div
                role="status"
                className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4"
              >
                <span className="pop-in rounded-full border-2 border-edge bg-hl px-4 py-2 text-sm font-bold text-on-hl shadow-hard-sm">
                  กำลังโหลด {current.title}…
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg p-6 text-center text-ink">
            <p className="m-0 text-muted">ค้นหาเพลงแล้วแตะชื่อเว็บ ทุกคนในห้องจะเห็นเพลงนั้นทันที</p>
            <button
              type="button"
              onClick={openSearch}
              className="flex h-12 items-center gap-2 rounded-full border-2 border-edge bg-primary px-5 font-display font-semibold text-on-primary"
            >
              <SearchIcon size={18} /> ค้นหาเพลง
            </button>
          </div>
        )}
      </div>

      {searchOpen && <SearchSheet onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

/** ค้นหาในหน้าดูคอร์ด (มือถือ/แผงแคบ) · บนคอมใช้ Ctrl+K */
function SearchSheet({ onClose }: { onClose(): void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-center sm:p-4 sm:pt-[8vh]">
      <button
        type="button"
        aria-label="ปิดการค้นหา"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-dim/80"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="ค้นหาเพลง"
        className="sheet-in relative flex max-h-[88dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-[28px] border-t-2 border-edge bg-surface p-4 pb-8 sm:max-w-[560px] sm:rounded-[24px] sm:border-2 sm:shadow-hard-xl"
      >
        <div className="flex items-center gap-2">
          <h2 className="m-0 flex-1 font-display text-xl font-bold">ค้นหาเพลง</h2>
          <button
            ref={closeRef}
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
