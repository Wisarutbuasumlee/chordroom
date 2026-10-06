"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { safeName } from "@/lib/linkText";
import { connectRoom, type RoomChannel } from "@/lib/realtime";
import type { Member, RoomSnapshot, RoomSong } from "@/lib/types";

export type RoomStatus = "loading" | "ready" | "notfound" | "error";

export interface RoomEvent {
  kind: "set" | "undo";
  by: string;
  at: number;
  /** เราเป็นคนกดเอง */
  self: boolean;
}

export type SongInput = { songId: number } | { url: string; title?: string; artist?: string };

type FetchResult = { kind: "ok"; snapshot: RoomSnapshot } | { kind: "notfound" } | { kind: "error" };

async function fetchRoom(code: string): Promise<FetchResult> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`, { cache: "no-store" });
    if (res.status === 404) return { kind: "notfound" };
    if (!res.ok) return { kind: "error" };
    return { kind: "ok", snapshot: await res.json() };
  } catch {
    return { kind: "error" };
  }
}

function mergeSong(prev: RoomSnapshot, song: RoomSong): RoomSnapshot {
  const history = [song, ...prev.history.filter((h) => h.id !== song.id)].sort((a, b) => b.id - a.id).slice(0, 30);
  return { ...prev, current: history[0] ?? null, history };
}

export function useRoom(code: string, name: string | null) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [status, setStatus] = useState<RoomStatus>("loading");
  const [members, setMembers] = useState<Member[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RoomEvent | null>(null);
  const channel = useRef<RoomChannel | null>(null);
  const meRef = useRef<Member | null>(null);

  const apply = useCallback((r: FetchResult) => {
    if (r.kind === "ok") {
      setSnapshot(r.snapshot);
      setStatus("ready");
    } else if (r.kind === "notfound") setStatus("notfound");
    else setStatus((s) => (s === "ready" ? s : "error"));
  }, []);

  const refresh = useCallback(() => fetchRoom(code).then(apply), [code, apply]);

  /**
   * ข้อความ realtime ใครก็ส่งเข้าห้องได้ (คีย์ Supabase อยู่ในหน้าเว็บ) จึงไม่เชื่อลิงก์/ชื่อในข้อความ
   * ใช้เป็นแค่สัญญาณให้ดึงเพลงจริงจาก server (ที่ตรวจลิงก์แล้ว)
   * ถ้ามีข้อความรัวเข้ามาระหว่างดึง ไม่ยิงซ้อน แต่ดึงอีกรอบเดียวหลังรอบนี้จบ (จะได้ไม่พลาดเพลงล่าสุด)
   */
  const syncing = useRef(false);
  const queued = useRef<{ kind: RoomEvent["kind"]; by: (s: RoomSnapshot) => string } | null>(null);
  const syncFromServer = useCallback(
    async (kind: RoomEvent["kind"], by: (s: RoomSnapshot) => string) => {
      queued.current = { kind, by };
      if (syncing.current) return;
      syncing.current = true;
      try {
        while (queued.current) {
          const job = queued.current;
          queued.current = null;
          const r = await fetchRoom(code);
          apply(r);
          if (r.kind === "ok") setLastEvent({ kind: job.kind, by: job.by(r.snapshot), at: Date.now(), self: false });
        }
      } finally {
        syncing.current = false;
      }
    },
    [code, apply],
  );

  useEffect(() => {
    fetchRoom(code).then(apply);
    const ch = connectRoom(code, {
      onSongSet: () => void syncFromServer("set", (s) => s.current?.openedBy ?? "มีคน"),
      // server ไม่ได้จดว่าใครกดย้อน จึงใช้ชื่อในข้อความ แต่ไม่แสดงถ้ามีลิงก์ปนมา
      onSongUndo: (e) => void syncFromServer("undo", () => safeName(String(e.by ?? ""))),
      // ชื่อใน presence มาจากเครื่องคนอื่นตรงๆ ไม่ผ่าน server: ตัดความยาว และซ่อนชื่อที่มีลิงก์
      onPresence: (list) =>
        setMembers(list.map((m) => ({ ...m, name: safeName(String(m.name ?? "").slice(0, 24), "ไม่ระบุชื่อ") }))),
      onStatus: setConnected,
    });
    channel.current = ch;
    if (meRef.current) ch.track(meRef.current);

    // มือถือหยุด JS ของแท็บที่ไม่ได้ดู: กลับมาเมื่อไหร่ ดึงสถานะล่าสุดและต่อ realtime ใหม่
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      ch.ensureConnected();
      void refresh();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    window.addEventListener("pageshow", wake);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
      window.removeEventListener("pageshow", wake);
      ch.close();
      channel.current = null;
    };
  }, [code, apply, refresh, syncFromServer]);

  /** ส่ง presence ของเรา (ชื่อ สี และแท็บคอร์ดตามห้องอยู่ไหม) */
  const track = useCallback((m: Member) => {
    meRef.current = m;
    channel.current?.track(m);
  }, []);

  const setSong = useCallback(
    async (input: SongInput): Promise<{ ok: true; song: RoomSong } | { ok: false; error: string }> => {
      if (!name) return { ok: false, error: "ยังไม่ได้ใส่ชื่อ" };
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/song`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...input, by: name }),
        });
        const body = await res.json();
        if (!res.ok) return { ok: false, error: body.error ?? "เปลี่ยนเพลงไม่สำเร็จ" };
        const song = body.song as RoomSong;
        setSnapshot((prev) => (prev ? mergeSong(prev, song) : prev));
        setLastEvent({ kind: "set", by: name, at: Date.now(), self: true });
        channel.current?.sendSongSet({
          songId: song.songId,
          source: song.source,
          url: song.url,
          title: song.title,
          by: name,
          song,
        });
        return { ok: true, song };
      } catch {
        return { ok: false, error: "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง" };
      }
    },
    [code, name],
  );

  const undo = useCallback(async () => {
    if (!name) return false;
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/undo`, { method: "POST" });
      if (!res.ok) return false;
      setSnapshot(await res.json());
      setLastEvent({ kind: "undo", by: name, at: Date.now(), self: true });
      channel.current?.sendSongUndo({ by: name });
      return true;
    } catch {
      return false;
    }
  }, [code, name]);

  return { snapshot, status, members, connected, lastEvent, setSong, undo, refresh, track };
}
