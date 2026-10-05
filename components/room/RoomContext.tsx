"use client";

import { createContext, useContext } from "react";
import type { RoomEvent, SongInput } from "@/hooks/useRoom";
import type { LayoutInfo } from "@/hooks/useLayout";
import type { ViewMode } from "@/lib/profile";
import type { Member, Room, RoomSong } from "@/lib/types";

export interface RoomCtx {
  code: string;
  room: Room;
  current: RoomSong | null;
  history: RoomSong[];
  members: Member[];
  me: Member;
  connected: boolean;
  lastEvent: RoomEvent | null;
  info: LayoutInfo;
  chordOpened: boolean;
  following: boolean;
  viewMode: ViewMode;
  setViewMode(v: ViewMode): void;
  /**
   * เลือกเพลงให้ทั้งห้อง · ส่ง open มาด้วยเพื่อเปิดแท็บคอร์ดของเราทันทีในการกดครั้งเดียวกัน
   * (เรียกจาก onClick/onKeyDown เท่านั้น เบราว์เซอร์ถึงจะยอมให้เปิดแท็บ) · host = หน้าต่างที่ถูกกด เช่นหน้าต่างลอย
   */
  pick(input: SongInput, open?: { url: string; host?: Window }): Promise<boolean>;
  undo(): Promise<void>;
  /** เปิดเพลงปัจจุบันในแท็บคอร์ด (เรียกจาก onClick) */
  openCurrent(host?: Window): void;
  /** เปิดลิงก์ในแท็บคอร์ดโดยไม่เปลี่ยนเพลงของห้อง (เช่น หน้าค้นหาของ dochord) */
  openInChordTab(url: string, host?: Window): void;
  openInvite(): void;
  openSearch(): void;
  toast(msg: string): void;
}

export const RoomContext = createContext<RoomCtx | null>(null);

export function useRoomCtx(): RoomCtx {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoomCtx ต้องอยู่ใน RoomContext");
  return ctx;
}
