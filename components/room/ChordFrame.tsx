"use client";

import { useState } from "react";
import { SearchIcon } from "../Icons";
import { useRoomCtx } from "./RoomContext";

/**
 * หน้าเว็บคอร์ดของเพลงปัจจุบัน ฝังด้วย iframe ธรรมดา
 * (5 ต.ค. 2026: dochord, chordzaa, chordtabs ไม่ได้ส่ง X-Frame-Options / CSP frame-ancestors จึงฝังได้)
 * ใครในห้องเปลี่ยนเพลง key เปลี่ยน → iframe โหลดหน้าใหม่เอง
 */
export default function ChordFrame() {
  const { current, openSearch } = useRoomCtx();
  const frameKey = current ? String(current.id) : "none";
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  if (!current) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="m-0 font-display text-2xl font-bold">ยังไม่มีเพลงในห้อง</h1>
        <p className="m-0 max-w-sm text-muted">ค้นหาเพลงแล้วแตะชื่อเว็บ หน้าคอร์ดของทุกคนในห้องจะเปลี่ยนเป็นเพลงนั้นทันที</p>
        <button
          type="button"
          onClick={openSearch}
          className="flex h-12 items-center gap-2 rounded-full border-2 border-edge bg-primary px-5 font-display font-semibold text-on-primary"
        >
          <SearchIcon size={18} /> ค้นหาเพลง
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-white">
      <iframe
        key={frameKey}
        src={current.url}
        title={`คอร์ด ${current.title}`}
        onLoad={() => setLoadedKey(frameKey)}
        // หน้าเว็บคอร์ดพาหน้าเราไปที่อื่นไม่ได้ (ไม่มี allow-top-navigation) แต่ลิงก์/โฆษณาของเขาเปิดแท็บใหม่ได้
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="fullscreen; clipboard-write"
        className="absolute inset-0 size-full border-0"
      />
      {loadedKey !== frameKey && (
        <div role="status" className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
          <span className="pop-in rounded-full border-2 border-edge bg-hl px-4 py-2 text-sm font-bold text-on-hl shadow-hard-sm">
            กำลังโหลด {current.title}…
          </span>
        </div>
      )}
    </div>
  );
}
