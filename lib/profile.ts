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

export interface LastRoom {
  code: string;
  name: string;
}


const KEYS = {
  profile: "chordroom:profile",
  lastRoom: "chordroom:lastRoom",
  sidebar: "chordroom:sidebar",
  clientId: "chordroom:clientId",
};

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

export function loadLastRoom(): LastRoom | null {
  return read<LastRoom>(KEYS.lastRoom);
}

export function saveLastRoom(r: LastRoom) {
  write(KEYS.lastRoom, r);
}

/** แถบข้างบนคอม: เปิดหรือพับไว้ (จำไว้ในเครื่อง) */
export function loadSidebarOpen(): boolean {
  return read<boolean>(KEYS.sidebar) ?? true;
}

export function saveSidebarOpen(open: boolean) {
  write(KEYS.sidebar, open);
}

/** แยกแต่ละแท็บออกจากกันใน presence (คนเดียวเปิดสองเครื่องได้) */
export function getClientId(): string {
  const existing = read<string>(KEYS.clientId, () => sessionStorage);
  if (existing) return existing;
  const id = crypto.randomUUID();
  write(KEYS.clientId, id, () => sessionStorage);
  return id;
}

/** ตัวอักษรบนวงกลมสมาชิก: พยัญชนะตัวแรก (ข้ามสระนำ เ แ โ ใ ไ) */
export function initial(name: string): string {
  const first = [...name].find((c) => /[ก-ฮ]/.test(c) || (/[\p{L}\p{N}]/u.test(c) && !/[฀-๿]/.test(c)));
  return (first ?? "?").toUpperCase();
}
