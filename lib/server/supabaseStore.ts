import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalize } from "../normalize";
import type { Room, RoomSnapshot, RoomSong, SongRow, SourceId } from "../types";
import { serviceKey, usageMonth, type Store } from "./store";

interface RoomRow {
  id: string;
  code: string;
  name: string;
  created_at: string;
  owner_hash: string | null;
  kicked: string[] | null;
}

interface RoomSongRow {
  id: number;
  song_id: number | null;
  source: SourceId;
  url: string;
  title: string;
  artist: string | null;
  opened_by: string;
  opened_at: string;
}

const ROOM_SONG_COLS = "id, song_id, source, url, title, artist, opened_by, opened_at";
const ROOM_COLS = "id, code, name, created_at, owner_hash, kicked";
/** จำแท็บที่ถูกเชิญออกไว้แค่นี้ (แท็บเก่าปิดไปนานแล้ว) */
const KICKED_KEEP = 50;

function toRoom(r: RoomRow): Room {
  return { id: r.id, code: r.code, name: r.name, createdAt: r.created_at, hasOwner: Boolean(r.owner_hash) };
}

function toRoomSong(r: RoomSongRow): RoomSong {
  return {
    id: r.id,
    songId: r.song_id,
    source: r.source,
    url: r.url,
    title: r.title,
    artist: r.artist,
    openedBy: r.opened_by,
    openedAt: r.opened_at,
  };
}

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

async function roomByCode(code: string): Promise<RoomRow | null> {
  const { data, error } = await db().from("rooms").select(ROOM_COLS).eq("code", code).maybeSingle();
  if (error) throw error;
  return data;
}

async function snapshot(room: RoomRow, historyLimit: number): Promise<RoomSnapshot> {
  const { data, error } = await db()
    .from("room_songs")
    .select(ROOM_SONG_COLS)
    .eq("room_id", room.id)
    .is("undone_at", null)
    .order("id", { ascending: false })
    .limit(historyLimit);
  if (error) throw error;
  const history = (data ?? []).map(toRoomSong);
  return { room: toRoom(room), current: history[0] ?? null, history, kicked: room.kicked ?? [] };
}

export function supabaseStore(): Store {
  return {
    kind: "supabase",

    async createRoom(code, name, ownerHash) {
      const { data, error } = await db()
        .from("rooms")
        .insert({ code, name, owner_hash: ownerHash })
        .select(ROOM_COLS)
        .single();
      if (error) {
        if (error.code === "23505") return null; // รหัสซ้ำ ให้สุ่มใหม่
        throw error;
      }
      return toRoom(data);
    },

    async getOwnerHash(code) {
      const room = await roomByCode(code);
      return room ? room.owner_hash : undefined;
    },

    async claimRoom(code, ownerHash) {
      // ตั้งได้เฉพาะห้องที่ยังไม่มีเจ้าของ (สองคนกดพร้อมกัน ได้คนเดียว)
      const { data, error } = await db()
        .from("rooms")
        .update({ owner_hash: ownerHash })
        .eq("code", code)
        .is("owner_hash", null)
        .select("id");
      if (error) throw error;
      return (data ?? []).length > 0;
    },

    async renameRoom(code, name) {
      const { data, error } = await db()
        .from("rooms")
        .update({ name })
        .eq("code", code)
        .select(ROOM_COLS)
        .maybeSingle();
      if (error) throw error;
      return data ? toRoom(data) : null;
    },

    async deleteRoom(code) {
      // room_songs ถูกลบตามด้วย (on delete cascade)
      const { data, error } = await db().from("rooms").delete().eq("code", code).select("id");
      if (error) throw error;
      return (data ?? []).length > 0;
    },

    async kick(code, clientId) {
      const room = await roomByCode(code);
      if (!room) return false;
      const kicked = [...(room.kicked ?? []).filter((id) => id !== clientId), clientId].slice(-KICKED_KEEP);
      const { error } = await db().from("rooms").update({ kicked }).eq("id", room.id);
      if (error) throw error;
      return true;
    },

    async getSnapshot(code, historyLimit = 30) {
      const room = await roomByCode(code);
      return room ? snapshot(room, historyLimit) : null;
    },

    async setSong(code, pick, by) {
      const room = await roomByCode(code);
      if (!room) return null;
      const { data, error } = await db()
        .from("room_songs")
        .insert({
          room_id: room.id,
          song_id: pick.songId,
          source: pick.source,
          url: pick.url,
          title: pick.title,
          artist: pick.artist,
          opened_by: by,
        })
        .select(ROOM_SONG_COLS)
        .single();
      if (error) throw error;
      return toRoomSong(data);
    },

    async undo(code) {
      const room = await roomByCode(code);
      if (!room) return null;
      const { data: latest, error } = await db()
        .from("room_songs")
        .select("id")
        .eq("room_id", room.id)
        .is("undone_at", null)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (latest) {
        const { error: upErr } = await db()
          .from("room_songs")
          .update({ undone_at: new Date().toISOString() })
          .eq("id", latest.id);
        if (upErr) throw upErr;
      }
      return snapshot(room, 30);
    },

    async searchSongs(q, source, limit) {
      const { data, error } = await db().rpc("search_songs", {
        q: normalize(q),
        src: source,
        lim: limit,
      });
      if (error) throw error;
      return (data ?? []) as SongRow[];
    },

    async getSong(id) {
      const { data, error } = await db()
        .from("songs")
        .select("id, title, artist, source, url")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as SongRow | null;
    },

    async knownUrls(source) {
      const urls = new Set<string>();
      const page = 1000;
      for (const [table, order] of [
        ["songs", "id"],
        ["index_skips", "url"],
      ] as const) {
        for (let from = 0; ; from += page) {
          const { data, error } = await db()
            .from(table)
            .select("url")
            .eq("source", source)
            .order(order)
            .range(from, from + page - 1);
          if (error) throw error;
          for (const r of data ?? []) urls.add(r.url);
          if (!data || data.length < page) break;
        }
      }
      return urls;
    },

    async countSongs(source) {
      const { count, error } = await db()
        .from("songs")
        .select("*", { count: "exact", head: true })
        .eq("source", source);
      if (error) throw error;
      return count ?? 0;
    },

    async latestSongUrl(source) {
      const { data, error } = await db()
        .from("songs")
        .select("url")
        .eq("source", source)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.url ?? null;
    },

    async latestSongAt(source) {
      const { data, error } = await db()
        .from("songs")
        .select("updated_at")
        .eq("source", source)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.updated_at ?? null;
    },

    async markSkipped(rows) {
      if (!rows.length) return;
      const { error } = await db().from("index_skips").upsert(rows, { onConflict: "url" });
      if (error) throw error;
    },

    async getState<T>(key: string) {
      const { data, error } = await db().from("app_state").select("value").eq("key", key).maybeSingle();
      if (error) throw error;
      return (data?.value as T | undefined) ?? null;
    },

    async setState(key, value) {
      const { error } = await db()
        .from("app_state")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },

    async existingNames(titles, artists) {
      const found = async (column: "normalized_title" | "normalized_artist", values: string[]) => {
        if (!values.length) return new Set<string>();
        // ชื่อเพลงนับเฉพาะแถวที่มีศิลปิน (แถวจาก search engine ที่ชื่อเพลงกับศิลปินยังรวมกันอยู่ไม่นับ)
        let query = db().from("songs").select(column).in(column, values);
        if (column === "normalized_title") query = query.neq("normalized_artist", "");
        const { data, error } = await query.limit(1000);
        if (error) throw error;
        return new Set((data ?? []).map((r) => (r as Record<string, string>)[column]));
      };
      const [t, a] = await Promise.all([found("normalized_title", titles), found("normalized_artist", artists)]);
      return { titles: t, artists: a };
    },

    async songsByUrls(urls) {
      if (!urls.length) return [];
      const { data, error } = await db().from("songs").select("id, title, artist, source, url").in("url", urls);
      if (error) throw error;
      return (data ?? []) as SongRow[];
    },

    async takeWebSearch(q, limit) {
      const { data, error } = await db().rpc("web_search_take", { query: q, lim: limit });
      if (error) throw error;
      return data === true;
    },

    async webSearchState() {
      const { data, error } = await db()
        .from("web_search_usage")
        .select("count, blocked_until")
        .eq("month", usageMonth())
        .maybeSingle();
      if (error) throw error;
      return { used: data?.count ?? 0, blockedUntil: data?.blocked_until ?? null };
    },

    async blockWebSearch(until) {
      const month = usageMonth();
      const { error: insErr } = await db()
        .from("web_search_usage")
        .upsert({ month }, { onConflict: "month", ignoreDuplicates: true });
      if (insErr) throw insErr;
      const { error } = await db()
        .from("web_search_usage")
        .update({ blocked_until: until.toISOString() })
        .eq("month", month);
      if (error) throw error;
    },

    async forgetWebSearch(q) {
      const { error } = await db().from("web_search_queries").delete().eq("q", q);
      if (error) throw error;
    },

    async upsertSongs(rows) {
      if (!rows.length) return 0;
      const payload = rows.map((r) => ({
        title: r.title,
        artist: r.artist,
        source: r.source,
        url: r.url,
        normalized_title: normalize(r.title),
        normalized_artist: normalize(r.artist),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await db().from("songs").upsert(payload, { onConflict: "url" });
      if (error) throw error;
      return payload.length;
    },
  };
}
