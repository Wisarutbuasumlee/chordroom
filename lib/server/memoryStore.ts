import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { normalize } from "../normalize";
import type { Room, RoomSnapshot, RoomSong, SongRow } from "../types";
import type { Store } from "./store";

/**
 * ที่เก็บข้อมูลในหน่วยความจำ ใช้ตอนยังไม่ได้ตั้งค่า Supabase (รัน dev บนเครื่อง)
 * ห้องหายเมื่อรีสตาร์ต · index เพลงอ่าน/เขียนที่ data/songs.local.json
 */
interface MemState {
  rooms: Map<string, Room>;
  roomSongs: Map<string, (RoomSong & { undone: boolean })[]>;
  songs: SongRow[] | null;
  nextId: number;
  webQueries?: Map<string, number>;
  webUsage?: Map<string, number>;
  webBlockedUntil?: { month: string; until: string };
}

const SONGS_FILE = path.join(process.cwd(), "data", "songs.local.json");

const g = globalThis as unknown as { __chordroomMem?: MemState };
const state: MemState = (g.__chordroomMem ??= {
  rooms: new Map(),
  roomSongs: new Map(),
  songs: null,
  nextId: 1,
});

function songs(): SongRow[] {
  if (!state.songs) {
    try {
      state.songs = JSON.parse(readFileSync(SONGS_FILE, "utf8")) as SongRow[];
    } catch {
      state.songs = [];
    }
  }
  return state.songs;
}

function withoutUndone(row: RoomSong & { undone: boolean }): RoomSong {
  const song: RoomSong & { undone?: boolean } = { ...row };
  delete song.undone;
  return song;
}

function snapshot(code: string, limit: number): RoomSnapshot | null {
  const room = state.rooms.get(code);
  if (!room) return null;
  const history = (state.roomSongs.get(code) ?? [])
    .filter((s) => !s.undone)
    .slice(-limit)
    .reverse()
    .map(withoutUndone);
  return { room, current: history[0] ?? null, history };
}

export function memoryStore(): Store {
  return {
    kind: "memory",

    async createRoom(code, name) {
      if (state.rooms.has(code)) return null;
      const room: Room = { id: crypto.randomUUID(), code, name, createdAt: new Date().toISOString() };
      state.rooms.set(code, room);
      state.roomSongs.set(code, []);
      return room;
    },

    async getSnapshot(code, historyLimit = 30) {
      return snapshot(code, historyLimit);
    },

    async setSong(code, pick, by) {
      const list = state.roomSongs.get(code);
      if (!list) return null;
      const row = { ...pick, id: state.nextId++, openedBy: by, openedAt: new Date().toISOString(), undone: false };
      list.push(row);
      return withoutUndone(row);
    },

    async undo(code) {
      const list = state.roomSongs.get(code);
      if (!list) return null;
      const last = list.findLast((s) => !s.undone);
      if (last) last.undone = true;
      return snapshot(code, 30);
    },

    async searchSongs(q, source, limit) {
      const nq = normalize(q);
      if (!nq) return [];
      const scored: { row: SongRow; score: number }[] = [];
      for (const row of songs()) {
        if (source && row.source !== source) continue;
        const t = normalize(row.title);
        const a = normalize(row.artist);
        let score = -1;
        if (t === nq) score = 4;
        else if (t.startsWith(nq)) score = 3;
        else if (t.includes(nq)) score = 2;
        else if (a.includes(nq)) score = 1;
        if (score >= 0) scored.push({ row, score });
      }
      scored.sort((x, y) => y.score - x.score || x.row.title.length - y.row.title.length);
      return scored.slice(0, limit).map((s) => s.row);
    },

    async getSong(id) {
      return songs().find((s) => s.id === id) ?? null;
    },

    async knownUrls(source) {
      return new Set(
        songs()
          .filter((s) => s.source === source)
          .map((s) => s.url),
      );
    },

    async songsByUrls(urls) {
      const set = new Set(urls);
      return songs().filter((s) => set.has(s.url));
    },

    async takeWebSearch(q, limit) {
      const queries = (state.webQueries ??= new Map());
      const usage = (state.webUsage ??= new Map());
      const last = queries.get(q);
      if (last && Date.now() - last < 30 * 24 * 3600_000) return false;
      const month = new Date().toISOString().slice(0, 7);
      const used = usage.get(month) ?? 0;
      if (used >= limit) return false;
      usage.set(month, used + 1);
      queries.set(q, Date.now());
      return true;
    },

    async webSearchState() {
      const month = new Date().toISOString().slice(0, 7);
      const blocked = state.webBlockedUntil?.month === month ? state.webBlockedUntil.until : null;
      return { used: state.webUsage?.get(month) ?? 0, blockedUntil: blocked };
    },

    async blockWebSearch(until) {
      state.webBlockedUntil = { month: new Date().toISOString().slice(0, 7), until: until.toISOString() };
    },

    async forgetWebSearch(q) {
      state.webQueries?.delete(q);
    },

    async upsertSongs(rows) {
      const all = songs();
      const byUrl = new Map(all.map((s) => [s.url, s]));
      let nextId = all.reduce((m, s) => Math.max(m, s.id), 0) + 1;
      for (const r of rows) {
        const existing = byUrl.get(r.url);
        if (existing) Object.assign(existing, r);
        else {
          const row: SongRow = { id: nextId++, ...r };
          all.push(row);
          byUrl.set(r.url, row);
        }
      }
      mkdirSync(path.dirname(SONGS_FILE), { recursive: true });
      writeFileSync(SONGS_FILE, JSON.stringify(all));
      return rows.length;
    },
  };
}
