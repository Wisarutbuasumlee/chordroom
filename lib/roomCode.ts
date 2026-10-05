// ตัดตัวที่สับสนง่ายออก (0/O, 1/I/L)
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateRoomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 3).join("")}-${chars.slice(3).join("")}`;
}

/** รับ "kx742q", "KX7 42Q", "KX7-42Q" แล้วคืนรูปแบบมาตรฐาน หรือ null ถ้าไม่ใช่รหัส */
export function normalizeRoomCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (raw.length !== 6) return null;
  for (const c of raw) if (!ALPHABET.includes(c)) return null;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}
