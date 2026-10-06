"use client";

import { useEffect, useRef, useState } from "react";
import { SOURCE_BY_ID } from "@/lib/sources";
import { SearchIcon } from "../Icons";
import { useRoomCtx } from "./RoomContext";

/**
 * ความสูงของหน้าเว็บคอร์ดในกรอบ: หน้าเว็บเป็นของเว็บอื่น เราเลื่อนข้างในหรืออ่านความยาวจริงไม่ได้
 * จึงให้ iframe สูงเกินหน้าเพลงทั่วไป แล้วเลื่อนที่กล่องของเราเอง (ซิงก์การเลื่อนได้)
 * เพลงสั้นจะมีที่ว่างท้ายหน้า · หน้าที่ยาวกว่านี้เลื่อนต่อในกรอบได้ตามปกติ (แต่ไม่ซิงก์ส่วนเกิน)
 */
const FRAME_HEIGHT = 16_000;
/** เลื่อนอัตโนมัติ: px ต่อวินาที */
const SPEEDS = [20, 35, 55] as const;
/** ส่งตำแหน่งไม่ถี่กว่านี้ระหว่างเลื่อน และส่งซ้ำทุก HEARTBEAT ให้คนที่เพิ่งเข้าห้อง/เพิ่งกลับมาติดตาม */
const SEND_EVERY_MS = 120;
const HEARTBEAT_MS = 2000;

/**
 * กรอบหน้าเว็บคอร์ดของเพลงที่กำลังดู (บอร์ด S-*) ฝังด้วย iframe ธรรมดา
 * (5 ต.ค. 2026: dochord, chordzaa, chordtabs ไม่ได้ส่ง X-Frame-Options / CSP frame-ancestors จึงฝังได้)
 * เพลงเปลี่ยน → key เปลี่ยน → iframe โหลดหน้าใหม่เอง
 *
 * card  = คอม/ไอแพดแนวนอน: กรอบโค้งรอบด้าน มีเงา
 * sheet = มือถือ/ไอแพดแนวตั้ง: โค้งเฉพาะด้านบน ชิดขอบล่างจอ
 */
export default function ChordFrame({ variant }: { variant: "card" | "sheet" }) {
  const { viewSong, openSearch } = useRoomCtx();
  const frameKey = viewSong ? String(viewSong.id) : "none";
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const { scroller, autoSpeed, setAutoSpeed } = useScrollSync(viewSong?.id ?? null);

  const shape =
    variant === "card"
      ? "rounded-[22px] border-2 border-edge shadow-hard-lg"
      : "rounded-t-[20px] border-2 border-b-0 border-edge";

  if (!viewSong) {
    return (
      <section
        aria-label="หน้าคอร์ด"
        className={`flex h-full flex-col items-center justify-center gap-4 bg-surface p-6 text-center ${shape}`}
      >
        <h1 className="m-0 font-display text-2xl font-bold">ยังไม่มีเพลงในห้อง</h1>
        <p className="m-0 max-w-sm text-muted">
          ค้นหาเพลงแล้วแตะชื่อเว็บ หน้าคอร์ดของทุกคนในห้องจะเปลี่ยนเป็นเพลงนั้นทันที
        </p>
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

  return (
    <section aria-label="หน้าคอร์ดจากเว็บต้นทาง" className={`flex h-full flex-col overflow-hidden bg-white ${shape}`}>
      <div className="flex min-h-9 shrink-0 items-center gap-2 border-b border-[#E1E4E8] bg-[#F1F3F5] py-1 pr-1.5 pl-3.5 text-xs text-[#57606A]">
        <span className="min-w-0 flex-1 truncate">{SOURCE_BY_ID[viewSong.source].host} · หน้าเว็บต้นทาง</span>
        <ScrollControls autoSpeed={autoSpeed} setAutoSpeed={setAutoSpeed} />
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={scroller} className="absolute inset-0 overflow-y-auto overscroll-contain">
          <iframe
            key={frameKey}
            src={viewSong.url}
            title={`คอร์ด ${viewSong.title}`}
            onLoad={() => setLoadedKey(frameKey)}
            // หน้าเว็บคอร์ดพาหน้าเราไปที่อื่นไม่ได้ (ไม่มี allow-top-navigation) แต่ลิงก์/โฆษณาของเขาเปิดแท็บใหม่ได้
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            allow="fullscreen; clipboard-write"
            className="block w-full border-0"
            style={{ height: FRAME_HEIGHT }}
          />
        </div>
        {loadedKey !== frameKey && (
          <div role="status" className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
            <span className="pop-in rounded-full border-2 border-[#0F1A2B] bg-[#FFD43B] px-4 py-2 text-sm font-bold text-[#0F1A2B]">
              กำลังโหลด {viewSong.title}…
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * ซิงก์การเลื่อน
 * - เรานำ: ส่งตำแหน่งตอนเลื่อน (ไม่ถี่เกิน) และส่งซ้ำเป็นระยะ
 * - คนอื่นนำ และเราติดตามห้องอยู่: เลื่อนตามตำแหน่งของคนนำ (เฉพาะเพลงเดียวกัน)
 * - เลื่อนอัตโนมัติ (ความเร็ว autoSpeed) ใช้ได้เมื่อไม่ได้เลื่อนตามคนอื่นอยู่
 */
function useScrollSync(songId: number | null) {
  const scroller = useRef<HTMLDivElement>(null);
  const { me, leader, following, scroll } = useRoomCtx();
  const [autoSpeed, setAutoSpeed] = useState<number | null>(null);
  const leadingMe = leader?.clientId === me.clientId;
  const followLeader = Boolean(leader && !leadingMe && following);

  // เพลงใหม่เริ่มบนสุด
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [songId]);

  // เรานำ: ส่งตำแหน่ง
  useEffect(() => {
    const el = scroller.current;
    if (!leadingMe || !el || songId === null) return;
    let lastSent = 0;
    let trailing: ReturnType<typeof setTimeout> | undefined;
    const send = () => {
      lastSent = Date.now();
      scroll.send({ clientId: me.clientId, songId, y: Math.round(el.scrollTop) });
    };
    const onScroll = () => {
      clearTimeout(trailing);
      const wait = SEND_EVERY_MS - (Date.now() - lastSent);
      if (wait <= 0) send();
      else trailing = setTimeout(send, wait);
    };
    send();
    el.addEventListener("scroll", onScroll, { passive: true });
    const beat = setInterval(send, HEARTBEAT_MS);
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearInterval(beat);
      clearTimeout(trailing);
    };
  }, [leadingMe, songId, scroll, me.clientId]);

  // คนอื่นนำ: เลื่อนตาม
  const leaderId = leader?.clientId;
  useEffect(() => {
    if (!followLeader || songId === null) return;
    return scroll.onScroll((pos) => {
      const el = scroller.current;
      if (!el || pos.clientId !== leaderId || pos.songId !== songId) return;
      // ห่างไม่เกินหนึ่งจอ เลื่อนนุ่มๆ · ไกลกว่านั้นกระโดดไปเลย (เพิ่งเข้าห้อง/เพิ่งกลับมาติดตาม)
      const far = Math.abs(el.scrollTop - pos.y) > el.clientHeight;
      el.scrollTo({ top: pos.y, behavior: far ? "instant" : "smooth" });
    });
  }, [followLeader, leaderId, songId, scroll]);

  // เลื่อนอัตโนมัติ · หยุดเองเมื่อเปลี่ยนเพลง หรือเริ่มเลื่อนตามคนอื่น
  const speed = followLeader ? null : autoSpeed;
  useEffect(() => {
    const el = scroller.current;
    if (!speed || !el) return;
    let raf = 0;
    let last = performance.now();
    let y = el.scrollTop;
    const step = (now: number) => {
      // ผู้ใช้เลื่อนเองระหว่างนี้: เริ่มนับจากตำแหน่งใหม่
      if (Math.abs(el.scrollTop - y) > 2) y = el.scrollTop;
      y = Math.min(y + (speed * (now - last)) / 1000, el.scrollHeight - el.clientHeight);
      last = now;
      el.scrollTop = y;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [speed, songId]);

  return { scroller, autoSpeed: speed, setAutoSpeed };
}

/** แถบบนกรอบคอร์ด: นำการเลื่อน / เลื่อนตามใคร / เลื่อนอัตโนมัติ */
function ScrollControls({
  autoSpeed,
  setAutoSpeed,
}: {
  autoSpeed: number | null;
  setAutoSpeed(v: number | null): void;
}) {
  const { me, leader, following, setLeading } = useRoomCtx();
  const leadingMe = leader?.clientId === me.clientId;
  const pill =
    "flex h-7 shrink-0 items-center rounded-full border border-[#C9CED6] bg-white px-2.5 font-bold text-[#0F1A2B]";

  if (leader && !leadingMe) {
    return (
      <>
        <span className="max-w-[45%] truncate font-semibold text-[#0F1A2B]">
          {following ? `เลื่อนตาม ${leader.name}` : `${leader.name} นำเลื่อนอยู่`}
        </span>
        <button type="button" onClick={() => setLeading(true)} className={pill}>
          นำแทน
        </button>
      </>
    );
  }

  const nextSpeed = () => {
    const i = autoSpeed === null ? -1 : SPEEDS.indexOf(autoSpeed as (typeof SPEEDS)[number]);
    setAutoSpeed(SPEEDS[(i + 1) % SPEEDS.length]);
  };
  const speedLabel = autoSpeed === null ? "" : `×${SPEEDS.indexOf(autoSpeed as (typeof SPEEDS)[number]) + 1}`;

  return (
    <>
      <button
        type="button"
        onClick={() => (autoSpeed === null ? setAutoSpeed(SPEEDS[0]) : setAutoSpeed(null))}
        aria-label={autoSpeed === null ? "เริ่มเลื่อนอัตโนมัติ" : "หยุดเลื่อนอัตโนมัติ"}
        aria-pressed={autoSpeed !== null}
        className={pill}
      >
        {autoSpeed === null ? "▶ เลื่อนอัตโนมัติ" : "❚❚ หยุด"}
      </button>
      {autoSpeed !== null && (
        <button
          type="button"
          onClick={nextSpeed}
          aria-label={`ความเร็ว ${speedLabel} แตะเพื่อเปลี่ยน`}
          className={pill}
        >
          {speedLabel}
        </button>
      )}
      <button
        type="button"
        onClick={() => setLeading(!leadingMe)}
        aria-pressed={leadingMe}
        className={`${pill} ${leadingMe ? "border-[#0F1A2B] bg-[#FFD43B]" : ""}`}
      >
        {leadingMe ? "หยุดนำ" : "ให้ทุกคนเลื่อนตาม"}
      </button>
    </>
  );
}
