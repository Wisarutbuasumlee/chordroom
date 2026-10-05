"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useChordWindow } from "@/hooks/useChordWindow";
import { useLayout } from "@/hooks/useLayout";
import { useNow } from "@/hooks/useNow";
import { useRoom, type SongInput } from "@/hooks/useRoom";
import { followChord, getChordState, openChord } from "@/lib/chordWindow";
import {
  getClientId,
  loadProfile,
  loadViewMode,
  saveLastRoom,
  saveViewMode,
  type Profile,
  type ViewMode,
} from "@/lib/profile";
import { realtimeMode } from "@/lib/realtime";
import type { Member } from "@/lib/types";
import { LinkIcon, MusicIcon, SearchIcon, UsersIcon } from "../Icons";
import ThemeToggle from "../ThemeToggle";
import { AvatarStack, Kbd, Logo } from "../ui";
import FloatWindow, { openFloatWindow } from "./FloatWindow";
import InviteSheet from "./InviteSheet";
import NowPlayingCard from "./NowPlayingCard";
import { HistoryList, MemberList, useSortedMembers } from "./People";
import { RoomContext, useRoomCtx, type RoomCtx } from "./RoomContext";
import SearchPalette from "./SearchPalette";
import SearchPanel from "./SearchPanel";
import ViewModeChooser, { SplitViewTip } from "./ViewModeChooser";

export default function RoomApp({ code, openInvite = false }: { code: string; openInvite?: boolean }) {
  const router = useRouter();
  const info = useLayout();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientId, setClientId] = useState("");
  const [viewMode, setViewModeState] = useState<ViewMode>("float");
  const room = useRoom(code, profile?.name ?? null);
  const chord = useChordWindow();
  const [inviteOpen, setInviteOpen] = useState(openInvite);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [phoneTab, setPhoneTab] = useState<"song" | "search">("song");
  const [pip, setPip] = useState<Window | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; at: number } | null>(null);

  // ตัวตนเก็บในเครื่อง: ยังไม่มีชื่อ → ไปหน้าใส่ชื่อก่อน
  useEffect(() => {
    const p = loadProfile();
    if (!p) {
      router.replace(`/r/${code}/join`);
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านค่าจาก localStorage ได้หลัง mount เท่านั้น */
    setProfile(p);
    setClientId(getClientId());
    setViewModeState(loadViewMode() ?? "float");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [code, router]);

  const snapshot = room.snapshot;
  const current = snapshot?.current ?? null;
  const following = chord.alive && !!current && chord.url === current.url;

  const me = useMemo<Member | null>(
    () =>
      profile && clientId
        ? { clientId, name: profile.name, color: profile.color, following: chord.opened ? following : null }
        : null,
    [profile, clientId, following, chord.opened],
  );
  const { track } = room;
  useEffect(() => {
    if (me) track(me);
  }, [me, track]);

  useEffect(() => {
    if (snapshot) saveLastRoom({ code: snapshot.room.code, name: snapshot.room.name });
  }, [snapshot]);

  // มีคนเปลี่ยนเพลง: แท็บคอร์ดเปลี่ยนตามเองถ้าทำได้ (ข้อ 6)
  const currentUrl = current?.url;
  useEffect(() => {
    if (currentUrl) followChord(currentUrl);
  }, [currentUrl]);

  const toast = useCallback((text: string) => setToastMsg({ text, at: Date.now() }), []);

  // คนอื่นเปลี่ยนเพลง/ย้อนเพลง: แจ้ง "เพลงใหม่ · ชื่อคนเปลี่ยน"
  const lastEvent = room.lastEvent;
  const eventToast =
    lastEvent && !lastEvent.self
      ? {
          text: lastEvent.kind === "set" ? `เพลงใหม่ · ${lastEvent.by} เปลี่ยน` : `${lastEvent.by} ย้อนไปเพลงก่อน`,
          at: lastEvent.at,
        }
      : null;
  const latestToast = [toastMsg, eventToast].reduce<{ text: string; at: number } | null>(
    (a, b) => (b && (!a || b.at > a.at) ? b : a),
    null,
  );

  const layout = info?.layout;
  // Ctrl/⌘ + K เปิดช่องค้นหาจากหน้าไหนก็ได้
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (layout === "desk") setPaletteOpen(true);
        else if (layout === "phone") setPhoneTab("search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout]);

  const setSong = room.setSong;
  const pick = useCallback(
    async (input: SongInput, open?: { url: string; host?: Window }) => {
      // คอม/ไอแพด: เปิด/เปลี่ยนแท็บคอร์ดของเราทันที ก่อน await (ยังอยู่ในจังหวะที่ผู้ใช้กด)
      // มือถือ: อยู่หน้าห้องต่อ ผู้ใช้กดปุ่มใหญ่ "เปิดคอร์ดเพลงนี้" เอง (สเปกข้อ 5)
      if (open && info && info.layout !== "phone") {
        const side = viewMode === "side" && info.layout === "desk" && !info.touch && !getChordState().alive;
        const r = openChord(open.url, { side, host: open.host });
        if (r.blocked) toast("เบราว์เซอร์บล็อกการเปิดแท็บใหม่ อนุญาตป๊อปอัปให้เว็บนี้ก่อน");
      }
      const r = await setSong(input);
      if (!r.ok) {
        toast(r.error);
        return false;
      }
      toast(`ส่งให้ทุกคนในห้องแล้ว · ${r.song.title}`);
      return true;
    },
    [setSong, toast, info, viewMode],
  );

  const roomUndo = room.undo;
  const undo = useCallback(async () => {
    if (!(await roomUndo())) toast("ย้อนเพลงไม่สำเร็จ");
  }, [roomUndo, toast]);

  const ctx = useMemo<RoomCtx | null>(() => {
    if (!snapshot || !me || !info) return null;
    const side = viewMode === "side" && info.layout === "desk" && !info.touch;
    return {
      code,
      room: snapshot.room,
      current,
      history: snapshot.history,
      members: room.members,
      me,
      connected: room.connected,
      lastEvent,
      info,
      chordOpened: chord.opened,
      following,
      viewMode,
      setViewMode: (v) => {
        setViewModeState(v);
        saveViewMode(v);
      },
      pick,
      undo,
      openCurrent: (host) => {
        if (!current) return;
        const r = openChord(current.url, { side: side && !chord.alive, host });
        if (r.blocked) toast("เบราว์เซอร์บล็อกการเปิดแท็บใหม่ อนุญาตป๊อปอัปให้เว็บนี้ก่อน");
      },
      openInChordTab: (url, host) => {
        const r = openChord(url, { host });
        if (r.blocked) toast("เบราว์เซอร์บล็อกการเปิดแท็บใหม่ อนุญาตป๊อปอัปให้เว็บนี้ก่อน");
      },
      openInvite: () => setInviteOpen(true),
      openSearch: () => (info.layout === "desk" ? setPaletteOpen(true) : setPhoneTab("search")),
      toast,
    };
  }, [snapshot, me, info, viewMode, code, current, room.members, room.connected, lastEvent, chord, following, pick, undo, toast]);

  const openFloat = useCallback(async () => {
    try {
      const w = await openFloatWindow();
      if (w) setPip(w);
      else toast("เบราว์เซอร์นี้ไม่รองรับหน้าต่างลอย ใช้แบบวางสองหน้าต่างคู่กันแทน");
    } catch {
      toast("เปิดหน้าต่างลอยไม่สำเร็จ");
    }
  }, [toast]);
  const closeFloat = useCallback(() => setPip(null), []);

  if (room.status === "notfound") return <RoomMessage title="ไม่พบห้องนี้" body={`ไม่มีห้องรหัส ${code} หรือห้องถูกลบไปแล้ว`} />;
  if (room.status === "error" && !snapshot)
    return <RoomMessage title="เชื่อมต่อไม่ได้" body="ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง" retry={() => void room.refresh()} />;
  if (!ctx) return <RoomLoading />;

  return (
    <RoomContext.Provider value={ctx}>
      {ctx.info.layout === "phone" ? (
        // มือถือ: สูงพอดีจอ เมนูล่างติดขอบ
        <div className="flex h-dvh flex-col">
          {realtimeMode === "local" && <LocalModeBanner />}
          <PhoneRoom tab={phoneTab} setTab={setPhoneTab} />
        </div>
      ) : (
        realtimeMode === "local" && <LocalModeBanner />
      )}
      {ctx.info.layout === "panel" && <PanelRoom />}
      {ctx.info.layout === "desk" && (
        <DeskRoom onSearch={() => setPaletteOpen(true)} onOpenFloat={openFloat} />
      )}
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {pip && <FloatWindow pip={pip} onClosed={closeFloat} />}
      <Toast toast={latestToast} raised={ctx.info.layout === "phone"} />
    </RoomContext.Provider>
  );
}

// ---------- มือถือ (B-Song / B-Search) ----------

function PhoneRoom({ tab, setTab }: { tab: "song" | "search"; setTab(t: "song" | "search"): void }) {
  const { room, code, current, openInvite } = useRoomCtx();
  const members = useSortedMembers();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2.5 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-xl font-bold">{room.name}</div>
          <div className="text-xs text-muted">
            <span className="font-mono">{code}</span> · {members.length} คนอยู่ในห้อง
          </div>
        </div>
        <AvatarStack people={members.map((m) => ({ key: m.clientId, name: m.name, color: m.color }))} size={32} max={3} />
        <ThemeToggle />
        <button
          type="button"
          onClick={openInvite}
          aria-label="ชวนเพื่อน"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-surface text-ink"
        >
          <LinkIcon />
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-1 pb-4">
        {tab === "song" && (
          <>
            <NowPlayingCard variant="phone" />
            <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-soft px-3.5 py-3">
              <div className="flex shrink-0 gap-1" aria-hidden="true">
                <span className="h-7 w-5 rounded-[5px] border-2 border-primary bg-surface" />
                <span className="h-7 w-5 rounded-[5px] border-2 border-edge bg-surface" />
              </div>
              <div className="text-[13px] leading-normal">ใช้แค่ 2 แท็บ: แท็บนี้ไว้เลือกเพลง แท็บ “คอร์ด” ไว้อ่าน</div>
            </div>
            <HistoryList limit={5} />
          </>
        )}
        <div hidden={tab !== "search"}>
          <SearchPanel onPicked={() => setTab("song")} />
        </div>
      </main>

      {tab === "search" && current && (
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
          <span aria-hidden="true">›</span>
        </button>
      )}

      <nav
        aria-label="เมนูหลัก"
        className="mt-2.5 flex border-t-2 border-edge bg-surface px-2 pt-1.5 pb-[max(12px,env(safe-area-inset-bottom))]"
      >
        <NavItem active={tab === "song"} onClick={() => setTab("song")} icon={<MusicIcon size={22} />} label="เพลงตอนนี้" />
        <NavItem active={tab === "search"} onClick={() => setTab("search")} icon={<SearchIcon size={22} />} label="ค้นหา" />
        <NavItem active={false} onClick={openInvite} icon={<UsersIcon size={22} />} label="คนในห้อง" />
      </nav>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick(): void; icon: React.ReactNode; label: string }) {
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

// ---------- แผงแคบ: iPad Split View / Slide Over, หน้าต่างห้องแคบบนคอม (B-Tablet / B-TSlide) ----------

function PanelRoom() {
  const { room, code, current, following, chordOpened, openCurrent, openInvite } = useRoomCtx();
  const members = useSortedMembers();
  const names = members.map((m, i) => (i === 0 ? "คุณ" : m.name));
  const namesText =
    names.length === 1 ? "มีแค่คุณในห้อง" : `${names.slice(1).join(", ")} และคุณ อยู่ในห้อง`;

  return (
    <div className="flex min-h-dvh flex-col gap-4 p-4">
      <header className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-bold">{room.name}</div>
          <div className="font-mono text-xs font-bold tracking-wider text-muted">{code}</div>
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={openInvite}
          className="flex h-11 items-center gap-1.5 rounded-full border-2 border-edge bg-hl px-3.5 text-sm font-bold text-on-hl"
        >
          <LinkIcon size={16} /> ชวน
        </button>
      </header>

      {current && chordOpened && !following && (
        <div className="flex flex-col gap-2.5 rounded-[18px] border-2 border-edge bg-hl p-3.5 text-on-hl" role="status">
          <div className="text-sm">
            {current.openedBy} เปลี่ยนเพลงของห้องเป็น <b>{current.title}</b>
          </div>
          <button
            type="button"
            onClick={() => openCurrent()}
            className="h-11 rounded-full border-2 border-[#0F1A2B] bg-white font-bold text-[#0F1A2B]"
          >
            เปิดเพลงนี้
          </button>
        </div>
      )}

      <NowPlayingCard variant="panel" />
      <SearchPanel compact />

      <div className="mt-auto flex items-center gap-2.5 rounded-2xl border-2 border-line bg-surface p-3">
        <AvatarStack people={members.map((m) => ({ key: m.clientId, name: m.name, color: m.color }))} size={28} max={4} />
        <div className="min-w-0 flex-1 truncate text-[13px]">{namesText}</div>
      </div>
      <HistoryList limit={4} />
    </div>
  );
}

// ---------- คอม / ไอแพดเต็มจอ (B-DeskRoom) ----------

function DeskRoom({ onSearch, onOpenFloat }: { onSearch(): void; onOpenFloat(): void }) {
  const { room, code, info, openInvite, connected } = useRoomCtx();
  return (
    <div className="flex min-h-dvh flex-wrap">
      <aside className="flex max-w-none flex-[1_1_280px] flex-col gap-6 border-edge bg-surface px-5 py-6 md:max-w-[320px] md:border-r-2">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex-1 text-ink no-underline" aria-label="ChordRoom หน้าแรก">
            <Logo size={36} textClass="text-lg" />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-col gap-3 rounded-[18px] border-2 border-edge bg-hl p-4 text-on-hl">
          <div>
            <div className="font-display text-[19px] font-bold break-words">{room.name}</div>
            <div className="text-[13px]">
              รหัส <span className="font-mono font-bold tracking-wider">{code}</span>
              {!connected && <span> · กำลังเชื่อมต่อ…</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={openInvite}
            className="flex h-11 items-center justify-center gap-2 rounded-full border-2 border-[#0F1A2B] bg-white font-bold text-[#0F1A2B]"
          >
            <LinkIcon size={18} /> ชวนเพื่อน
          </button>
        </div>
        <MemberList />
        <HistoryList />
      </aside>

      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-4 py-6 sm:px-8 sm:pb-8">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-[54px] items-center gap-3 rounded-2xl border-2 border-edge bg-surface pr-3.5 pl-4 text-left text-[15px] text-muted shadow-hard-sm"
        >
          <SearchIcon />
          <span className="flex-1">ค้นหาเพลงหรือศิลปิน จาก 3 เว็บ</span>
          {!info.touch && <Kbd>{info.isMac ? "⌘ K" : "Ctrl K"}</Kbd>}
        </button>
        <NowPlayingCard variant="desk" />
        {info.touch ? <SplitViewTip /> : <ViewModeChooser onOpenFloat={onOpenFloat} />}
      </main>
    </div>
  );
}

// ---------- สถานะอื่นๆ ----------

function Toast({ toast, raised }: { toast: { text: string; at: number } | null; raised: boolean }) {
  const now = useNow(1000);
  const msg = toast && now - toast.at < 4000 ? toast.text : null;
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 ${raised ? "bottom-28" : "bottom-6"}`}
    >
      {msg && (
        <div className="pop-in rounded-full border-2 border-edge bg-ink px-4 py-2.5 text-sm font-semibold text-bg shadow-hard-sm">
          {msg}
        </div>
      )}
    </div>
  );
}

function LocalModeBanner() {
  return (
    <div className="border-b-2 border-edge bg-soft px-4 py-1.5 text-center text-xs text-ink">
      โหมดทดสอบบนเครื่อง: ยังไม่ได้ตั้งค่า Supabase · เห็นกันเฉพาะแท็บในเบราว์เซอร์นี้
    </div>
  );
}

function RoomLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-muted" role="status">
      กำลังเข้าห้อง…
    </div>
  );
}

function RoomMessage({ title, body, retry }: { title: string; body: string; retry?: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="m-0 font-display text-2xl font-bold">{title}</h1>
      <p className="m-0 text-muted">{body}</p>
      <div className="flex gap-3">
        {retry && (
          <button type="button" onClick={retry} className="h-12 rounded-full border-2 border-edge bg-surface px-5 font-bold">
            ลองใหม่
          </button>
        )}
        <Link
          href="/"
          className="flex h-12 items-center rounded-full border-2 border-edge bg-primary px-5 font-bold text-on-primary no-underline"
        >
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}
