"use client";

import { useState } from "react";
import { SOURCE_BY_ID } from "@/lib/sources";
import { SearchIcon } from "../Icons";
import { useRoomCtx } from "./RoomContext";

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
      <div className="flex h-8 shrink-0 items-center border-b border-[#E1E4E8] bg-[#F1F3F5] px-3.5 text-xs text-[#57606A]">
        <span className="truncate">{SOURCE_BY_ID[viewSong.source].host} · แสดงหน้าเว็บต้นทางในกรอบนี้</span>
      </div>
      <div className="relative min-h-0 flex-1">
        <iframe
          key={frameKey}
          src={viewSong.url}
          title={`คอร์ด ${viewSong.title}`}
          onLoad={() => setLoadedKey(frameKey)}
          // หน้าเว็บคอร์ดพาหน้าเราไปที่อื่นไม่ได้ (ไม่มี allow-top-navigation) แต่ลิงก์/โฆษณาของเขาเปิดแท็บใหม่ได้
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          allow="fullscreen; clipboard-write"
          className="absolute inset-0 size-full border-0"
        />
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
