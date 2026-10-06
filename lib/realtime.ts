"use client";

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { Member, RoomSong } from "./types";

/** ช่อง room:{code} · event ตามสเปกข้อ 8 */
export interface SongSetEvent {
  songId: number | null;
  source: RoomSong["source"];
  url: string;
  title: string;
  by: string;
  song: RoomSong;
}

export interface SongUndoEvent {
  by: string;
}

/** ตำแหน่งเลื่อนของคนนำ (px จากบนสุดของหน้าคอร์ด) · ใช้กับเพลงที่ id ตรงกันเท่านั้น */
export interface ScrollPosEvent {
  clientId: string;
  songId: number;
  y: number;
}

/** มีคนกด "ให้ทุกคนเลื่อนตามฉัน": คนที่นำอยู่ก่อนเลิกนำ */
export interface ScrollLeadEvent {
  clientId: string;
}

export interface RoomChannelHandlers {
  onSongSet(e: SongSetEvent): void;
  onSongUndo(e: SongUndoEvent): void;
  /** เจ้าของห้องเปลี่ยนชื่อ/ลบห้อง/เตะคนออก: เป็นแค่สัญญาณให้ดึงสถานะจริงจาก server */
  onRoomChanged(): void;
  onScrollPos(e: ScrollPosEvent): void;
  onScrollLead(e: ScrollLeadEvent): void;
  onPresence(members: Member[]): void;
  onStatus(connected: boolean): void;
}

export interface RoomChannel {
  sendSongSet(e: SongSetEvent): void;
  sendSongUndo(e: SongUndoEvent): void;
  sendRoomChanged(): void;
  sendScrollPos(e: ScrollPosEvent): void;
  sendScrollLead(e: ScrollLeadEvent): void;
  track(me: Member): void;
  /** เรียกตอนแท็บกลับมา active: ต่อใหม่ถ้าหลุด */
  ensureConnected(): void;
  close(): void;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const realtimeMode: "supabase" | "local" = SUPABASE_URL && SUPABASE_KEY ? "supabase" : "local";

export function connectRoom(code: string, handlers: RoomChannelHandlers): RoomChannel {
  return realtimeMode === "supabase" ? supabaseChannel(code, handlers) : localChannel(code, handlers);
}

function dedupe(members: Member[]): Member[] {
  const seen = new Map<string, Member>();
  for (const m of members) seen.set(m.clientId, m);
  return [...seen.values()];
}

// ---------- Supabase Realtime (Broadcast + Presence) ----------

let supabase: SupabaseClient | null = null;

function supabaseChannel(code: string, h: RoomChannelHandlers): RoomChannel {
  supabase ??= createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let me: Member | null = null;
  let channel: RealtimeChannel;
  let closed = false;

  const open = () => {
    channel = supabase!.channel(`room:${code}`, {
      config: { broadcast: { self: false }, presence: { key: me?.clientId ?? crypto.randomUUID() } },
    });
    channel
      .on("broadcast", { event: "song:set" }, ({ payload }) => h.onSongSet(payload as SongSetEvent))
      .on("broadcast", { event: "song:undo" }, ({ payload }) => h.onSongUndo(payload as SongUndoEvent))
      .on("broadcast", { event: "room:changed" }, () => h.onRoomChanged())
      .on("broadcast", { event: "scroll:pos" }, ({ payload }) => h.onScrollPos(payload as ScrollPosEvent))
      .on("broadcast", { event: "scroll:lead" }, ({ payload }) => h.onScrollLead(payload as ScrollLeadEvent))
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Member>();
        h.onPresence(dedupe(Object.values(state).flat()));
      })
      .subscribe((status) => {
        if (closed) return;
        h.onStatus(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED" && me) void channel.track(me);
      });
  };
  open();

  return {
    sendSongSet: (e) => void channel.send({ type: "broadcast", event: "song:set", payload: e }),
    sendSongUndo: (e) => void channel.send({ type: "broadcast", event: "song:undo", payload: e }),
    sendRoomChanged: () => void channel.send({ type: "broadcast", event: "room:changed", payload: {} }),
    sendScrollPos: (e) => void channel.send({ type: "broadcast", event: "scroll:pos", payload: e }),
    sendScrollLead: (e) => void channel.send({ type: "broadcast", event: "scroll:lead", payload: e }),
    track(m) {
      me = m;
      if (channel.state === "joined") void channel.track(m);
    },
    ensureConnected() {
      if (closed || channel.state === "joined" || channel.state === "joining") return;
      void supabase!.removeChannel(channel);
      open();
    },
    close() {
      closed = true;
      void supabase!.removeChannel(channel);
    },
  };
}

// ---------- โหมดบนเครื่อง (ยังไม่ได้ตั้ง Supabase) ----------
// ใช้ BroadcastChannel: เห็นกันได้เฉพาะแท็บในเบราว์เซอร์เดียวกัน ไว้ทดสอบตอน dev

type LocalMsg =
  | { kind: "song:set"; payload: SongSetEvent }
  | { kind: "song:undo"; payload: SongUndoEvent }
  | { kind: "room:changed" }
  | { kind: "scroll:pos"; payload: ScrollPosEvent }
  | { kind: "scroll:lead"; payload: ScrollLeadEvent }
  | { kind: "presence"; member: Member }
  | { kind: "leave"; clientId: string }
  | { kind: "hello" };

function localChannel(code: string, h: RoomChannelHandlers): RoomChannel {
  const bc = new BroadcastChannel(`chordroom:room:${code}`);
  const seen = new Map<string, { m: Member; at: number }>();
  let me: Member | null = null;
  let closed = false;
  const post = (msg: LocalMsg) => {
    if (!closed) bc.postMessage(msg);
  };

  const emit = () => {
    const now = Date.now();
    for (const [id, v] of seen) if (now - v.at > 12_000) seen.delete(id);
    h.onPresence([
      ...(me ? [me] : []),
      ...[...seen.values()].map((v) => v.m).filter((m) => m.clientId !== me?.clientId),
    ]);
  };
  const announce = () => me && post({ kind: "presence", member: me });

  bc.onmessage = (ev: MessageEvent<LocalMsg>) => {
    const msg = ev.data;
    if (msg.kind === "song:set") h.onSongSet(msg.payload);
    else if (msg.kind === "song:undo") h.onSongUndo(msg.payload);
    else if (msg.kind === "room:changed") h.onRoomChanged();
    else if (msg.kind === "scroll:pos") h.onScrollPos(msg.payload);
    else if (msg.kind === "scroll:lead") h.onScrollLead(msg.payload);
    else if (msg.kind === "presence") {
      seen.set(msg.member.clientId, { m: msg.member, at: Date.now() });
      emit();
    } else if (msg.kind === "leave") {
      seen.delete(msg.clientId);
      emit();
    } else if (msg.kind === "hello") announce();
  };

  const beat = setInterval(() => {
    announce();
    emit();
  }, 4000);
  queueMicrotask(() => {
    if (closed) return;
    h.onStatus(true);
    post({ kind: "hello" });
  });

  return {
    sendSongSet: (e) => post({ kind: "song:set", payload: e }),
    sendSongUndo: (e) => post({ kind: "song:undo", payload: e }),
    sendRoomChanged: () => post({ kind: "room:changed" }),
    sendScrollPos: (e) => post({ kind: "scroll:pos", payload: e }),
    sendScrollLead: (e) => post({ kind: "scroll:lead", payload: e }),
    track(m) {
      me = m;
      announce();
      emit();
    },
    ensureConnected() {
      announce();
    },
    close() {
      clearInterval(beat);
      if (me) post({ kind: "leave", clientId: me.clientId });
      closed = true;
      bc.close();
    },
  };
}
