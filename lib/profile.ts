// ไม่มีบัญชีผู้ใช้: เก็บชื่อ สี ห้องล่าสุด และวิธีดูคอร์ดไว้ใน localStorage ของเครื่อง

export const MEMBER_COLORS = [
  { value: "#6CB4FF", label: "สีฟ้า" },
  { value: "#FF9E7A", label: "สีส้ม" },
  { value: "#B7A3FF", label: "สีม่วง" },
  { value: "#7FD6B0", label: "สีเขียว" },
] as const;

export interface Profile {
  name: string;
  color: string;
}

export interface SavedRoom {
  code: string;
  name: string;
}

const KEYS = {
  profile: "chordroom:profile",
  /** แบบเก่า: จำแค่ห้องล่าสุดห้องเดียว (ย้ายเข้า rooms ตอนอ่านครั้งแรก) */
  lastRoom: "chordroom:lastRoom",
  rooms: "chordroom:rooms",
  owners: "chordroom:owners",
  sidebar: "chordroom:sidebar",
};

/** จำห้องที่เคยเข้าไว้เท่านี้ (ซ้อมหลายวง แต่ละวงคนละห้อง) */
const ROOMS_KEEP = 20;

function read<T>(key: string, storage: () => Storage = () => localStorage): T | null {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown, storage: () => Storage = () => localStorage) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {}
}

export function loadProfile(): Profile | null {
  const p = read<Profile>(KEYS.profile);
  if (!p || typeof p.name !== "string" || !p.name.trim()) return null;
  const color = MEMBER_COLORS.some((c) => c.value === p.color) ? p.color : MEMBER_COLORS[0].value;
  return { name: p.name.trim().slice(0, 24), color };
}

export function saveProfile(p: Profile) {
  write(KEYS.profile, { name: p.name.trim().slice(0, 24), color: p.color });
}

/** ห้องที่เคยเข้า เข้าล่าสุดก่อน */
export function loadRooms(): SavedRoom[] {
  const list = read<SavedRoom[]>(KEYS.rooms);
  if (Array.isArray(list)) return list.filter((r) => r && typeof r.code === "string" && typeof r.name === "string");
  const last = read<SavedRoom>(KEYS.lastRoom);
  return last?.code ? [{ code: last.code, name: String(last.name ?? last.code) }] : [];
}

export function saveRoom(r: SavedRoom) {
  write(KEYS.rooms, [r, ...loadRooms().filter((x) => x.code !== r.code)].slice(0, ROOMS_KEEP));
}

/** ห้องถูกลบ/ไม่มีแล้ว: เอาออกจากรายการและลืมรหัสเจ้าของ */
export function forgetRoom(code: string) {
  write(
    KEYS.rooms,
    loadRooms().filter((x) => x.code !== code),
  );
  const owners = read<Record<string, string>>(KEYS.owners) ?? {};
  delete owners[code];
  write(KEYS.owners, owners);
}

/** รหัสเจ้าของห้อง (ได้ตอนสร้างห้อง หรือจากลิงก์เจ้าของร่วม) */
export function loadOwnerKey(code: string): string | null {
  const key = read<Record<string, string>>(KEYS.owners)?.[code];
  return typeof key === "string" && key ? key : null;
}

export function saveOwnerKey(code: string, key: string) {
  write(KEYS.owners, { ...(read<Record<string, string>>(KEYS.owners) ?? {}), [code]: key });
}

/** แถบข้างบนคอม: เปิดหรือพับไว้ (จำไว้ในเครื่อง) */
export function loadSidebarOpen(): boolean {
  return read<boolean>(KEYS.sidebar) ?? true;
}

export function saveSidebarOpen(open: boolean) {
  write(KEYS.sidebar, open);
}

let pageClientId: string | null = null;

/**
 * แยกแต่ละแท็บออกจากกันใน presence (คนเดียวเปิดหลายแท็บ/หลายเครื่องได้)
 * สุ่มใหม่ทุกครั้งที่โหลดหน้า ไม่เก็บใน sessionStorage เพราะเบราว์เซอร์คัดลอก sessionStorage
 * ไปให้แท็บที่ "ทำสำเนาแท็บ" หรือเปิดจากหน้านี้ ทำให้สองแท็บกลายเป็นคนเดียวกัน
 */
export function getClientId(): string {
  pageClientId ??= crypto.randomUUID();
  return pageClientId;
}

/** ตัวอักษรบนวงกลมสมาชิก: พยัญชนะตัวแรก (ข้ามสระนำ เ แ โ ใ ไ) */
export function initial(name: string): string {
  const first = [...name].find((c) => /[ก-ฮ]/.test(c) || (/[\p{L}\p{N}]/u.test(c) && !/[฀-๿]/.test(c)));
  return (first ?? "?").toUpperCase();
}
