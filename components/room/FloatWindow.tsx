"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MusicIcon, UndoIcon } from "../Icons";
import { AvatarStack } from "../ui";
import { useSortedMembers } from "./People";
import { useRoomCtx } from "./RoomContext";
import SearchPanel from "./SearchPanel";
import { sinceText, useNow } from "@/hooks/useNow";

interface DocumentPictureInPicture {
  requestWindow(opts: { width: number; height: number }): Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export function pipSupported(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

/**
 * หน้าต่างลอยเป็น about:blank: url() แบบ relative จะชี้ผิดที่ (ฟอนต์ไม่โหลด)
 * ไฟล์ CSS จึงลิงก์ด้วย URL เต็ม ส่วน <style> ในหน้าแปลง url("/...") เป็น URL เต็มก่อนคัดลอก
 */
function copyStyles(target: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.href) {
      const link = target.createElement("link");
      link.rel = "stylesheet";
      link.href = sheet.href;
      target.head.appendChild(link);
      continue;
    }
    try {
      const style = target.createElement("style");
      style.textContent = Array.from(sheet.cssRules, (r) => r.cssText)
        .join("\n")
        .replace(/url\((["']?)\//g, `url($1${location.origin}/`);
      target.head.appendChild(style);
    } catch {}
  }
}

/**
 * หน้าต่างลอย (Document Picture-in-Picture, Chrome/Edge)
 * ต้องเรียก requestWindow จากการกดปุ่ม · ไม่มี API ให้ซ่อนตัวเลือกนี้
 */
export async function openFloatWindow(): Promise<Window | null> {
  const api = window.documentPictureInPicture;
  if (!api) return null;
  if (api.window) return api.window;
  const pip = await api.requestWindow({ width: 340, height: 440 });
  pip.document.documentElement.className = document.documentElement.className;
  pip.document.documentElement.lang = "th";
  pip.document.title = "ChordRoom";
  copyStyles(pip.document);
  pip.document.body.className = "bg-bg text-ink";
  return pip;
}

export default function FloatWindow({ pip, onClosed }: { pip: Window; onClosed(): void }) {
  useEffect(() => {
    const syncTheme = () => (pip.document.documentElement.className = document.documentElement.className);
    window.addEventListener("chordroom:theme", syncTheme);
    pip.addEventListener("pagehide", onClosed);
    return () => {
      window.removeEventListener("chordroom:theme", syncTheme);
      pip.removeEventListener("pagehide", onClosed);
    };
  }, [pip, onClosed]);

  return createPortal(<FloatPanel pip={pip} />, pip.document.body);
}

function FloatPanel({ pip }: { pip: Window }) {
  const { room, current, following, chordOpened, openCurrent, undo, history } = useRoomCtx();
  const members = useSortedMembers();
  const now = useNow();
  const [searching, setSearching] = useState(false);

  return (
    <div className="flex min-h-screen flex-col gap-3 p-3 font-sans">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
        <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
        <span className="flex-1 truncate">ChordRoom · {room.name}</span>
      </div>

      {searching ? (
        <div className="flex flex-col gap-2">
          <SearchPanel compact autoFocus onPicked={() => setSearching(false)} />
          <button
            type="button"
            onClick={() => setSearching(false)}
            className="h-10 rounded-full border-2 border-edge bg-surface text-sm font-bold"
          >
            ปิดการค้นหา
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSearching(true)}
          className="flex h-11 items-center rounded-[14px] border-2 border-edge bg-surface px-3 text-left text-[15px] text-muted shadow-hard-sm"
        >
          ค้นหาเพลง
        </button>
      )}

      {current && !searching && (
        <div className="flex flex-col gap-1 rounded-[18px] border-2 border-edge bg-hl p-3 text-on-hl">
          <div className="text-xs font-semibold">
            {following ? "ห้องกำลังเปิด · แท็บคอร์ดตามอยู่" : "ห้องกำลังเปิด"}
          </div>
          <div className="font-display text-xl leading-tight font-bold break-words">{current.title}</div>
          <div className="text-xs">
            {current.source} · {current.openedBy} เปิด{sinceText(current.openedAt, now)}
          </div>
          {(!following || !chordOpened) && (
            <button
              type="button"
              onClick={() => openCurrent(pip)}
              className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full border-2 border-[#0F1A2B] bg-white font-bold text-[#0F1A2B]"
            >
              <MusicIcon size={18} /> เปิดเพลงนี้
            </button>
          )}
        </div>
      )}

      {!searching && (
        <div className="mt-auto flex items-center gap-2">
          <AvatarStack people={members.map((m) => ({ key: m.clientId, name: m.name, color: m.color }))} size={28} />
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => void undo()}
            disabled={history.length < 2}
            className="flex h-10 items-center gap-1.5 rounded-full border-2 border-edge bg-surface px-3 text-[13px] font-bold disabled:opacity-40"
          >
            <UndoIcon size={15} /> เพลงก่อน
          </button>
        </div>
      )}
    </div>
  );
}
