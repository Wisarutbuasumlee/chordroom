"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLayout } from "@/hooks/useLayout";
import { useNow } from "@/hooks/useNow";
import { useRoom, type SongInput } from "@/hooks/useRoom";
import { getClientId, loadProfile, saveLastRoom, type Profile } from "@/lib/profile";
import { realtimeMode } from "@/lib/realtime";
import type { Member, RoomSong } from "@/lib/types";
import InviteSheet from "./InviteSheet";
import { RoomContext, type RoomCtx } from "./RoomContext";
import { DeskRoom, PhoneRoom, PortraitRoom, TabletRoom, type SideTab } from "./RoomLayouts";
import SearchPalette from "./SearchPalette";

/**
 * ห้อง = หน้าเดียวจบ (บอร์ด S-* ในไฟล์ handoff): หน้าเว็บคอร์ด + ค้นหา + คนในห้อง
 * ใครในห้องเลือกเพลง หน้าคอร์ดของทุกคนที่เปิด "ติดตามห้อง" โหลดเพลงใหม่เอง
 * ปิดติดตามห้อง = ค้างเพลงที่ดูอยู่ ห้องเปลี่ยนเพลงจะขึ้นแบนเนอร์ "ไปดูด้วย" แทน
 */
export default function RoomApp({ code, openInvite = false }: { code: string; openInvite?: boolean }) {
  const router = useRouter();
  const info = useLayout();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientId, setClientId] = useState("");
  const room = useRoom(code, profile?.name ?? null);
  const [inviteOpen, setInviteOpen] = useState(openInvite);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [phoneTab, setPhoneTab] = useState<"song" | "search">("song");
  const [sideTab, setSideTab] = useState<SideTab>("search");
  const [following, setFollowingState] = useState(true);
  const [held, setHeld] = useState<RoomSong | null>(null);
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
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [code, router]);

  const snapshot = room.snapshot;
  const current = snapshot?.current ?? null;

  const viewSong = following ? current : held;
  const setFollowing = useCallback(
    (v: boolean) => {
      if (!v) setHeld(current);
      setFollowingState(v);
    },
    [current],
  );

  const me = useMemo<Member | null>(
    () => (profile && clientId ? { clientId, name: profile.name, color: profile.color, following } : null),
    [profile, clientId, following],
  );
  const { track } = room;
  useEffect(() => {
    if (me) track(me);
  }, [me, track]);

  useEffect(() => {
    if (snapshot) saveLastRoom({ code: snapshot.room.code, name: snapshot.room.name });
  }, [snapshot]);

  const toast = useCallback((text: string) => setToastMsg({ text, at: Date.now() }), []);

  const layout = info?.layout;
  // คนอื่นเปลี่ยนเพลง/ย้อนเพลง · จอใหญ่มีการ์ด "ต้น เปิด X ให้ทุกคน" แทนข้อความเปลี่ยนเพลง
  const lastEvent = room.lastEvent;
  const eventToast =
    lastEvent && !lastEvent.self && (lastEvent.kind === "undo" || layout === "phone")
      ? {
          text: lastEvent.kind === "set" ? `เพลงใหม่ · ${lastEvent.by} เปลี่ยน` : `${lastEvent.by} ย้อนไปเพลงก่อน`,
          at: lastEvent.at,
        }
      : null;
  const latestToast = [toastMsg, eventToast].reduce<{ text: string; at: number } | null>(
    (a, b) => (b && (!a || b.at > a.at) ? b : a),
    null,
  );

  const openSearch = useCallback(() => {
    if (layout === "desk") setPaletteOpen(true);
    else if (layout === "tablet") setSideTab("search");
    else if (layout === "portrait") setSearchSheetOpen(true);
    else setPhoneTab("search");
  }, [layout]);

  // Ctrl/⌘ + K เปิดช่องค้นหา (ถ้าโฟกัสอยู่ในหน้าเว็บคอร์ด ปุ่มนี้มาไม่ถึงเรา ต้องคลิกนอกกรอบก่อน)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  const setSong = room.setSong;
  const pick = useCallback(
    async (input: SongInput) => {
      const r = await setSong(input);
      if (!r.ok) {
        toast(r.error);
        return false;
      }
      // เลือกเพลงให้ห้อง = อยากดูเพลงนั้นด้วย → กลับมาติดตามห้อง
      setFollowingState(true);
      if (layout === "phone") toast(`ส่งให้ทุกคนในห้องแล้ว · ${r.song.title}`);
      return true;
    },
    [setSong, toast, layout],
  );

  const roomUndo = room.undo;
  const undo = useCallback(async () => {
    if (!(await roomUndo())) toast("ย้อนเพลงไม่สำเร็จ");
  }, [roomUndo, toast]);

  const ctx = useMemo<RoomCtx | null>(() => {
    if (!snapshot || !me || !info) return null;
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
      following,
      setFollowing,
      viewSong,
      pick,
      undo,
      openInChordTab: (url) => {
        // หน้าค้นหาของเว็บคอร์ด (เช่น dochord) เปิดเป็นแท็บใหม่ ไม่ใช่เพลงของห้อง
        if (!window.open(url, "_blank", "noopener,noreferrer")) {
          toast("เบราว์เซอร์บล็อกการเปิดแท็บใหม่ อนุญาตป๊อปอัปให้เว็บนี้ก่อน");
        }
      },
      openInvite: () => setInviteOpen(true),
      openSearch,
      toast,
    };
  }, [
    snapshot,
    me,
    info,
    code,
    current,
    room.members,
    room.connected,
    lastEvent,
    following,
    setFollowing,
    viewSong,
    pick,
    undo,
    openSearch,
    toast,
  ]);

  if (room.status === "notfound")
    return <RoomMessage title="ไม่พบห้องนี้" body={`ไม่มีห้องรหัส ${code} หรือห้องถูกลบไปแล้ว`} />;
  if (room.status === "error" && !snapshot)
    return (
      <RoomMessage
        title="เชื่อมต่อไม่ได้"
        body="ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง"
        retry={() => void room.refresh()}
      />
    );
  if (!ctx) return <RoomLoading />;

  return (
    <RoomContext.Provider value={ctx}>
      <div className="flex h-dvh flex-col">
        {realtimeMode === "local" && <LocalModeBanner />}
        {layout === "desk" && <DeskRoom />}
        {layout === "tablet" && <TabletRoom sideTab={sideTab} setSideTab={setSideTab} />}
        {layout === "portrait" && <PortraitRoom searchOpen={searchSheetOpen} setSearchOpen={setSearchSheetOpen} />}
        {layout === "phone" && <PhoneRoom tab={phoneTab} setTab={setPhoneTab} />}
      </div>
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {/* มือถือ: ไว้เหนือเมนูล่าง ไม่บังแถบ "เปิดเพลงนี้ให้ทุกคน" ด้านบน */}
      <Toast toast={latestToast} bottom={layout === "phone"} />
    </RoomContext.Provider>
  );
}

// ---------- สถานะอื่นๆ ----------

function Toast({ toast, bottom }: { toast: { text: string; at: number } | null; bottom: boolean }) {
  const now = useNow(1000);
  const msg = toast && now - toast.at < 4000 ? toast.text : null;
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 ${bottom ? "bottom-28" : "top-16"}`}
    >
      {msg && (
        <div className="pop-in rounded-full border-2 border-edge bg-hl px-4 py-2.5 text-sm font-bold text-on-hl shadow-hard-sm">
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
          <button
            type="button"
            onClick={retry}
            className="h-12 rounded-full border-2 border-edge bg-surface px-5 font-bold"
          >
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
