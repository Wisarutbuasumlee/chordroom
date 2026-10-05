"use client";

/**
 * แท็บ "คอร์ด" แท็บเดียว (สเปกข้อ 6)
 * - เปิดครั้งแรกต้องมาจากการกดของผู้ใช้
 * - มีคนเปลี่ยนเพลง: ถ้ายังจับแท็บไว้ได้ เปลี่ยน location ของแท็บเดิม ไม่ต้องให้กด
 * - จับไม่ได้ (ปิดไปแล้ว / เว็บต้นทางตั้ง COOP / เบราว์เซอร์มือถือหยุดแท็บ): UI แสดงปุ่ม "เปิดเพลงนี้"
 */

export const CHORD_WINDOW_NAME = "chordroom-chords";

interface ChordState {
  alive: boolean;
  /** ลิงก์ล่าสุดที่เราสั่งให้แท็บคอร์ดเปิด */
  url: string | null;
  /** เคยเปิดแท็บคอร์ดในรอบนี้แล้ว */
  opened: boolean;
}

let win: Window | null = null;
let state: ChordState = { alive: false, url: null, opened: false };
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

const SERVER_STATE: ChordState = { alive: false, url: null, opened: false };
export function getChordServerState(): ChordState {
  return SERVER_STATE;
}

function navigate(w: Window, url: string): boolean {
  try {
    w.location.href = url;
    return true;
  } catch {
    return false;
  }
}

export interface OpenResult {
  ok: boolean;
  blocked?: boolean;
}

/** เรียกจาก onClick เท่านั้น · side = จัดเป็นหน้าต่างด้านขวาของจอ */
export function openChord(url: string, opts: { side?: boolean; host?: Window } = {}): OpenResult {
  const host = opts.host ?? window;
  let features: string | undefined;
  if (opts.side) {
    const s = host.screen as Screen & { availLeft?: number; availTop?: number };
    const left = (s.availLeft ?? 0) + Math.round(s.availWidth * 0.3);
    const width = Math.round(s.availWidth * 0.7);
    features = `popup,left=${left},top=${s.availTop ?? 0},width=${width},height=${s.availHeight}`;
  }

  if (isAlive(win) && !opts.side) {
    const ok = navigate(win, url);
    if (ok) {
      try {
        win.focus();
      } catch {}
      set({ alive: true, url, opened: true });
      return { ok };
    }
  }

  // ห้ามตัด opener (noopener / w.opener = null): เบราว์เซอร์ยอมให้เปลี่ยนหน้าแท็บข้ามโดเมน
  // เฉพาะหน้าที่เป็น opener ของแท็บนั้น ถ้าตัดไป แท็บคอร์ดจะไม่เปลี่ยนตามห้อง (ทดสอบแล้วบน Chrome)
  const w = host.open(url, CHORD_WINDOW_NAME, features);
  if (!w) return { ok: false, blocked: true };
  win = w;
  try {
    w.focus();
  } catch {}
  set({ alive: true, url, opened: true });
  startPolling();
  return { ok: true };
}

/** มีคนเปลี่ยนเพลงในห้อง: เปลี่ยนแท็บเดิมให้เองถ้าทำได้ */
export function followChord(url: string): boolean {
  if (!isAlive(win)) {
    if (state.alive) set({ alive: false });
    return false;
  }
  if (state.url === url) return true;
  const ok = navigate(win, url);
  set(ok ? { url, alive: true } : { alive: false });
  return ok;
}
