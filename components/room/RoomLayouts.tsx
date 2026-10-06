"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSidebarOpen, saveSidebarOpen } from "@/lib/profile";
import {
  ChevronRightIcon,
  CloseIcon,
  CopyIcon,
  LinkIcon,
  MusicIcon,
  PencilIcon,
  SearchIcon,
  UndoIcon,
  UsersIcon,
} from "../Icons";
import ThemeToggle from "../ThemeToggle";
import { AvatarStack, Kbd, Logo } from "../ui";
import ChordFrame from "./ChordFrame";
import { HistoryList, MemberList, useSortedMembers, WatchingTogether } from "./People";
import {
  ChangeCard,
  FollowToggle,
  OpenedByStrip,
  OpenInWeb,
  RoomMovedBanner,
  SongHeading,
  SourceSwitcher,
  UndoButton,
} from "./RoomBits";
import { useRoomCtx } from "./RoomContext";
import SearchPanel from "./SearchPanel";

const roundBtn =
  "flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-surface text-ink no-underline";

/** เปิดหน้าต่างแก้ไขห้อง (ชื่อห้อง ชื่อของเรา คนในห้อง) · compact = ปุ่มกลมไอคอนอย่างเดียว */
function EditRoomButton({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { openSettings } = useRoomCtx();
  return (
    <button
      type="button"
      onClick={openSettings}
      aria-label="แก้ไขห้องและชื่อของฉัน"
      title="แก้ไขห้องและชื่อของฉัน"
      className={
        compact
          ? roundBtn
          : `flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-edge bg-surface px-3.5 text-sm font-bold text-ink ${className}`
      }
    >
      <PencilIcon size={18} />
      {!compact && "แก้ไข"}
    </button>
  );
}

/** แบนเนอร์ "ไปดูด้วย" ลอยกลางล่างจอ (ตอนปิดติดตามห้อง) */
function FloatingMovedBanner() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 sm:bottom-10">
      <RoomMovedBanner className="pointer-events-auto w-full max-w-[580px]" />
    </div>
  );
}

// ---------- มือถือ (S-Song): แถบบน + กรอบคอร์ด + เมนูล่าง ----------

export function PhoneRoom({ tab, setTab }: { tab: "song" | "search"; setTab(t: "song" | "search"): void }) {
  const { room, current, openInvite } = useRoomCtx();
  const members = useSortedMembers();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 pt-[max(12px,env(safe-area-inset-top))] pr-3 pb-2.5 pl-4">
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-bold">{room.name}</div>
          <div className="text-xs text-muted">{members.length} คนอยู่ในห้อง</div>
        </div>
        <EditRoomButton />
        <ThemeToggle />
        <button type="button" onClick={openInvite} aria-label="ชวนเพื่อน" className={roundBtn}>
          <LinkIcon />
        </button>
      </header>

      {tab === "song" ? (
        <>
          <RoomMovedBanner className="mx-3 mb-2.5" />
          <OpenedByStrip />
          <div className="flex items-center gap-2 px-4 pb-2.5">
            <SongHeading size="sm" />
            <OpenInWeb label={false} />
          </div>
          <div className="mx-2 min-h-0 flex-1">
            <ChordFrame variant="sheet" />
          </div>
        </>
      ) : (
        <>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
            <SearchPanel autoFocus onPicked={() => setTab("song")} />
          </main>
          {current && (
            <button
              type="button"
              onClick={() => setTab("song")}
              className="mx-3 mt-2.5 flex items-center gap-2.5 rounded-2xl border-2 border-edge bg-hl px-3.5 py-2.5 text-left text-on-hl"
            >
              <span className="size-[9px] shrink-0 rounded-full bg-on-hl" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">ห้องกำลังเปิด · โดย {current.openedBy}</div>
                <div className="truncate text-[15px] font-bold">
                  {current.title} · {current.source}
                </div>
              </div>
              <ChevronRightIcon size={18} />
            </button>
          )}
        </>
      )}

      <nav
        aria-label="เมนูหลัก"
        className="flex border-t-2 border-edge bg-surface px-2 pt-1.5 pb-[max(12px,env(safe-area-inset-bottom))]"
      >
        <NavItem
          active={tab === "song"}
          onClick={() => setTab("song")}
          icon={<MusicIcon size={22} />}
          label="เพลงตอนนี้"
        />
        <NavItem
          active={tab === "search"}
          onClick={() => setTab("search")}
          icon={<SearchIcon size={22} />}
          label="ค้นหา"
        />
        <NavItem active={false} onClick={openInvite} icon={<UsersIcon size={22} />} label="คนในห้อง" />
      </nav>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick(): void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-[3px] text-xs ${
        active ? "font-bold text-primary" : "text-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------- ไอแพดแนวตั้ง / จอกลาง (S-TPortrait): แถบบน + กรอบคอร์ดเต็มจอ ----------

export function PortraitRoom({ searchOpen, setSearchOpen }: { searchOpen: boolean; setSearchOpen(v: boolean): void }) {
  const { room, following, openSearch, openInvite, history, undo } = useRoomCtx();
  const members = useSortedMembers();
  const together = members.filter((m) => m.following).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2.5 px-6 pt-[max(20px,env(safe-area-inset-top))] pb-4">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] text-muted">
            {room.name} · {following ? `${together} คนกำลังดูเพลงเดียวกัน` : "คุณกำลังดูคนเดียว"}
          </div>
          <SongTitleOnly />
        </div>
        <FollowToggle />
        <button
          type="button"
          onClick={() => void undo()}
          disabled={history.length < 2}
          aria-label="กลับไปเพลงก่อน"
          className={`${roundBtn} disabled:opacity-40`}
        >
          <UndoIcon size={18} />
        </button>
        <button type="button" onClick={openSearch} aria-label="ค้นหาเพลง" className={roundBtn}>
          <SearchIcon size={18} />
        </button>
        <button type="button" onClick={openInvite} aria-label="ชวนเพื่อน คนในห้อง และประวัติ" className={roundBtn}>
          <LinkIcon size={18} />
        </button>
        <EditRoomButton compact />
        <ThemeToggle />
      </header>
      <div className="mx-4 min-h-0 flex-1">
        <ChordFrame variant="sheet" />
      </div>
      <FloatingMovedBanner />
      <ChangeCard />
      {searchOpen && <SearchSheet onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

function SongTitleOnly() {
  const { viewSong } = useRoomCtx();
  return (
    <h1 className="m-0 truncate font-display text-[26px] leading-tight font-bold">
      {viewSong?.title ?? "ยังไม่มีเพลงในห้อง"}
    </h1>
  );
}

/** ค้นหาแบบแผ่น (จอแนวตั้ง) เลือกเพลงแล้วปิดเอง */
function SearchSheet({ onClose }: { onClose(): void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh]">
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
        className="pop-in relative flex max-h-[84dvh] w-full max-w-[560px] flex-col gap-3 overflow-y-auto rounded-[24px] border-2 border-edge bg-surface p-4 shadow-hard-xl"
      >
        <div className="flex items-center gap-2">
          <h2 className="m-0 flex-1 font-display text-xl font-bold">ค้นหาเพลง</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className={roundBtn}>
            <CloseIcon size={18} />
          </button>
        </div>
        <SearchPanel autoFocus onPicked={onClose} />
      </section>
    </div>
  );
}

// ---------- ไอแพดแนวนอน (S-Tablet): แถบข้างมีแท็บ + กรอบคอร์ด ----------

export type SideTab = "search" | "people" | "history";

export function TabletRoom({ sideTab, setSideTab }: { sideTab: SideTab; setSideTab(t: SideTab): void }) {
  const { room, code, openInvite } = useRoomCtx();
  const members = useSortedMembers();
  const tabs: { id: SideTab; label: string }[] = [
    { id: "search", label: "ค้นหา" },
    { id: "people", label: `คนในห้อง ${members.length}` },
    { id: "history", label: "ประวัติ" },
  ];
  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-[380px] shrink-0 flex-col border-r-2 border-edge bg-surface">
        <div className="flex items-center gap-2 px-4 pt-[22px] pb-3.5">
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[19px] font-bold">{room.name}</div>
            <div className="font-mono text-xs text-muted">{code}</div>
          </div>
          <EditRoomButton />
          <ThemeToggle />
          <button
            type="button"
            onClick={openInvite}
            className="flex h-11 items-center rounded-full border-2 border-edge bg-primary px-4 font-bold text-on-primary"
          >
            ชวน
          </button>
        </div>
        <div role="tablist" aria-label="แผงห้อง" className="mx-4 flex rounded-[14px] border-2 border-edge bg-bg p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={sideTab === t.id}
              onClick={() => setSideTab(t.id)}
              className={`h-10 flex-1 rounded-[10px] text-sm ${sideTab === t.id ? "bg-ink font-bold text-bg" : "text-muted"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
          {sideTab === "search" && <SearchPanel compact />}
          {sideTab === "people" && <MemberList title={false} />}
          {sideTab === "history" && <HistoryList withCurrent title={false} limit={20} />}
        </div>
        <div className="flex items-center gap-2.5 border-t-2 border-edge px-4 pt-3 pb-4">
          <AvatarStack
            people={members.filter((m) => m.following).map((m) => ({ key: m.clientId, name: m.name, color: m.color }))}
            size={30}
          />
          <WatchingTogether />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-6 pt-5 pb-3.5">
          <SongHeading size="md" />
          <FollowToggle />
          <UndoButton />
          <OpenInWeb label={false} />
        </header>
        <div className="mx-6 mb-6 min-h-0 flex-1">
          <ChordFrame variant="card" />
        </div>
      </main>
      <FloatingMovedBanner />
      <ChangeCard />
    </div>
  );
}

// ---------- คอมจอกว้าง (S-Desk): แถบข้าง คนในห้อง+ประวัติ · ค้นหาด้วย Ctrl+K ----------

export function DeskRoom() {
  const { room, code, info, openInvite, openSearch, connected, toast } = useRoomCtx();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่านค่าที่จำไว้ในเครื่องได้หลัง mount เท่านั้น
    setOpen(loadSidebarOpen());
  }, []);
  const toggle = (v: boolean) => {
    setOpen(v);
    saveSidebarOpen(v);
  };
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/r/${code}`);
      toast("คัดลอกลิงก์ชวนแล้ว ส่งให้เพื่อนได้เลย");
    } catch {
      openInvite();
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      {open && (
        <aside className="flex w-[320px] shrink-0 flex-col gap-[22px] overflow-y-auto border-r-2 border-edge bg-surface px-5 py-6">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex-1 text-ink no-underline" aria-label="ChordRoom หน้าแรก">
              <Logo size={36} textClass="text-lg" />
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => toggle(false)}
              aria-label="พับแถบข้าง ให้หน้าคอร์ดกว้างขึ้น"
              title="พับแถบข้าง"
              className={roundBtn}
            >
              <ChevronRightIcon size={18} className="rotate-180" />
            </button>
          </div>

          <div className="flex flex-col gap-3 rounded-[18px] border-2 border-edge bg-hl p-4 text-on-hl">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[19px] font-bold">{room.name}</div>
                <div className="text-[13px]">
                  รหัส <span className="font-mono font-bold tracking-[0.06em]">{code}</span>
                  {!connected && <span> · กำลังเชื่อมต่อ…</span>}
                </div>
              </div>
              <EditRoomButton className="h-9 border-[#0F1A2B] bg-white text-[#0F1A2B]" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyInvite}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border-2 border-[#0F1A2B] bg-white font-bold text-[#0F1A2B]"
              >
                <CopyIcon size={16} /> คัดลอกลิงก์ชวน
              </button>
              <button
                type="button"
                onClick={openInvite}
                aria-label="แสดง QR ชวนเพื่อน"
                title="QR ชวนเพื่อน"
                className="flex h-11 w-12 items-center justify-center rounded-full border-2 border-[#0F1A2B] bg-white font-mono text-xs font-bold text-[#0F1A2B]"
              >
                QR
              </button>
            </div>
          </div>

          <MemberList />
          <HistoryList withCurrent limit={10} />
        </aside>
      )}

      <main className="flex min-w-0 flex-1 flex-col gap-[18px] px-7 pt-[22px] pb-7">
        <div className="flex items-center gap-3">
          {!open && (
            <button
              type="button"
              onClick={() => toggle(true)}
              aria-label="เปิดแถบข้าง (ห้อง คนในห้อง ประวัติ)"
              className="flex h-[52px] shrink-0 items-center gap-1.5 rounded-2xl border-2 border-edge bg-hl px-3.5 font-bold text-on-hl"
            >
              <ChevronRightIcon size={18} /> ห้อง
            </button>
          )}
          <button
            type="button"
            onClick={openSearch}
            className="flex h-[52px] min-w-0 flex-1 items-center gap-3 rounded-2xl border-2 border-edge bg-surface pr-3.5 pl-4 text-left text-base text-muted shadow-hard-sm"
          >
            <SearchIcon />
            <span className="flex-1 truncate">ค้นหาเพลงหรือศิลปิน จาก 3 เว็บ</span>
            {!info.touch && <Kbd>{info.isMac ? "⌘ K" : "Ctrl K"}</Kbd>}
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <SongHeading size="lg" />
          <div className="flex flex-wrap items-center gap-2">
            <SourceSwitcher />
            <FollowToggle />
            <OpenInWeb label />
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <ChordFrame variant="card" />
        </div>
      </main>
      <FloatingMovedBanner />
      <ChangeCard />
    </div>
  );
}
