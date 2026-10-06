"use client";

import { createContext, useContext } from "react";
import type { RoomEvent, SongInput } from "@/hooks/useRoom";
import type { LayoutInfo } from "@/hooks/useLayout";
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
  /** เปิด "ติดตามห้อง" อยู่: หน้าคอร์ดเปลี่ยนตามเพลงของห้อง */
  following: boolean;
  setFollowing(v: boolean): void;
  /** เพลงที่แสดงในกรอบคอร์ดของเรา (ติดตามห้อง = เพลงของห้อง · ไม่ติดตาม = เพลงที่ค้างไว้) */
  viewSong: RoomSong | null;
  /** เลือกเพลงให้ทั้งห้อง · หน้าคอร์ดของทุกคน (รวมของเรา) เปลี่ยนตามเอง */
  pick(input: SongInput): Promise<boolean>;
  undo(): Promise<void>;
  /** เปิดลิงก์เป็นแท็บใหม่โดยไม่เปลี่ยนเพลงของห้อง (เช่น หน้าค้นหาของ dochord) */
  openInChordTab(url: string): void;
  openInvite(): void;
  openSearch(): void;
  toast(msg: string): void;
  /** เครื่องนี้มีรหัสเจ้าของห้อง (สร้างห้องเอง หรือเปิดจากลิงก์เจ้าของร่วม) */
  isOwner: boolean;
  admin: {
    /** คืนข้อความผิดพลาด หรือ null ถ้าสำเร็จ */
    rename(name: string): Promise<string | null>;
    kick(m: Member): Promise<void>;
    /** ลบห้อง แล้วพากลับหน้าแรก · คืนข้อความผิดพลาด หรือ null ถ้าสำเร็จ */
    remove(): Promise<string | null>;
    /** ห้องที่ยังไม่มีเจ้าของ: ตั้งเครื่องนี้เป็นเจ้าของ */
    claim(): Promise<void>;
    ownerLink(): string | null;
  };
}

export const RoomContext = createContext<RoomCtx | null>(null);

export function useRoomCtx(): RoomCtx {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoomCtx ต้องอยู่ใน RoomContext");
  return ctx;
}
