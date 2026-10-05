"use client";

/**
 * แท็บ "คอร์ด" แท็บเดียว = หน้าดูคอร์ดของเราเอง (/r/{code}/view)
 * หน้านั้นฝังหน้าเว็บคอร์ดไว้ และฟังห้องเอง ใครเปลี่ยนเพลงก็โหลดเพลงใหม่ให้เอง
 * (ทดสอบ 5 ต.ค. 2026: dochord, chordzaa, chordtabs ไม่ได้ส่ง X-Frame-Options / CSP frame-ancestors ฝังได้ตามปกติ)
 * แท็บห้องจึงแค่เปิดแท็บนี้ครั้งแรก (ต้องมาจากการกดของผู้ใช้) และคอยดูว่ายังเปิดอยู่ไหม
 */

export const CHORD_WINDOW_NAME = "chordroom-chords";

interface ChordState {
  /** แท็บดูคอร์ดยังเปิดอยู่ */
  alive: boolean;
  /** เคยเปิดแท็บดูคอร์ดในรอบนี้แล้ว */
  opened: boolean;
}

let win: Window | null = null;
let state: ChordState = { alive: false, opened: false };
const listeners = new Set<() => void>();
let poll: ReturnType<typeof setInterval> | null = null;

function set(next: Partial<ChordState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function isAlive(w: Window | null): w is Window {
  try {
    return !!w && !w.closed;
  } catch {
    return false;
  }
}

function startPolling() {
  poll ??= setInterval(() => {
    const alive = isAlive(win);
    if (alive !== state.alive) set({ alive });
    if (!alive && poll) {
      clearInterval(poll);
      poll = null;
    }
  }, 1500);
}

export function subscribeChord(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getChordState(): ChordState {
  return state;
}

const SERVER_STATE: ChordState = { alive: false, opened: false };
export function getChordServerState(): ChordState {
  return SERVER_STATE;
}

export interface OpenResult {
  ok: boolean;
  blocked?: boolean;
}

/**
 * เปิดแท็บดูคอร์ด (เรียกจาก onClick เท่านั้น) · เปิดอยู่แล้วก็แค่สลับไปที่แท็บนั้น
 * side = จัดเป็นหน้าต่างด้านขวาของจอ (โหมดวางสองหน้าต่างคู่กันบนคอม)
 */
export function openViewer(path: string, opts: { side?: boolean; host?: Window; focus?: boolean } = {}): OpenResult {
  const host = opts.host ?? window;
  if (isAlive(win) && !opts.side) {
    if (opts.focus !== false) {
      try {
        win.focus();
      } catch {}
    }
    return { ok: true };
  }

  let features: string | undefined;
  if (opts.side) {
    const s = host.screen as Screen & { availLeft?: number; availTop?: number };
    const left = (s.availLeft ?? 0) + Math.round(s.availWidth * 0.3);
    const width = Math.round(s.availWidth * 0.7);
    features = `popup,left=${left},top=${s.availTop ?? 0},width=${width},height=${s.availHeight}`;
  }
  const url = new URL(path, window.location.origin).toString();
  const w = host.open(url, CHORD_WINDOW_NAME, features);
  if (!w) return { ok: false, blocked: true };
  win = w;
  try {
    w.focus();
  } catch {}
  set({ alive: true, opened: true });
  startPolling();
  return { ok: true };
}
