// ใช้ทั้งใน API route และสคริปต์ index (รันด้วย tsx) จึงไม่ import "server-only"
import type { Room, RoomSnapshot, RoomSong, SongPick, SongRow, SourceId } from "../types";
import { memoryStore } from "./memoryStore";
import { supabaseStore } from "./supabaseStore";

export interface NewSong {
  title: string;
  artist: string | null;
  source: SourceId;
  url: string;
}

export interface Store {
  kind: "supabase" | "memory";
  createRoom(code: string, name: string): Promise<Room | null>;
  getSnapshot(code: string, historyLimit?: number): Promise<RoomSnapshot | null>;
  setSong(code: string, pick: SongPick, by: string): Promise<RoomSong | null>;
  /** ย้อนเพลงล่าสุด · คืนเพลงปัจจุบันหลังย้อน */
  undo(code: string): Promise<RoomSnapshot | null>;
  searchSongs(q: string, source: SourceId | null, limit: number): Promise<SongRow[]>;
  getSong(id: number): Promise<SongRow | null>;
  /** ลิงก์ที่ไม่ต้องดึงอีก: มีใน index แล้ว หรืออยู่ในรายการข้าม (ไม่ใช่หน้าเพลง) */
  knownUrls(source: SourceId): Promise<Set<string>>;
  markSkipped(rows: { url: string; source: SourceId; reason: string }[]): Promise<void>;
  countSongs(source: SourceId): Promise<number>;
  getState<T>(key: string): Promise<T | null>;
  setState(key: string, value: unknown): Promise<void>;
  upsertSongs(rows: NewSong[]): Promise<number>;
  songsByUrls(urls: string[]): Promise<SongRow[]>;
  /** จองโควตาค้นผ่าน search engine: คืน true ถ้าคำนี้ยังไม่เคยค้นใน 30 วันและเดือนนี้ยังไม่ถึง limit */
  takeWebSearch(qNormalized: string, limit: number): Promise<boolean>;
  /** search engine ตอบไม่สำเร็จ: ลบคำนี้ออกจากรายการที่ค้นแล้ว ครั้งหน้าจะได้ลองใหม่ */
  forgetWebSearch(qNormalized: string): Promise<void>;
  /** เดือนนี้ถาม search engine ไปแล้วกี่ครั้ง และถูกพักไว้ถึงเมื่อไหร่ (Brave แจ้งว่าเครดิตหมด) */
  webSearchState(): Promise<{ used: number; blockedUntil: string | null }>;
  /** search engine แจ้งว่าเครดิตหมด: หยุดถามถึงเวลานี้ แล้วค่อยลองใหม่ */
  blockWebSearch(until: Date): Promise<void>;
}

/** เดือนปัจจุบันแบบ YYYY-MM (UTC) ตรงกับ web_search_take() ใน SQL */
export function usageMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function hasSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && serviceKey());
}

export function serviceKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

export function getStore(): Store {
  return hasSupabase() ? supabaseStore() : memoryStore();
}
