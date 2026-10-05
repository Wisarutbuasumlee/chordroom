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
  knownUrls(source: SourceId): Promise<Set<string>>;
  upsertSongs(rows: NewSong[]): Promise<number>;
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
