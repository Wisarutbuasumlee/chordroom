import { normalizeRoomCode } from "../roomCode";

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function readJson<T>(req: Request): Promise<Partial<T>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

/** ตัดช่องว่างและจำกัดความยาว · คืน null ถ้าว่าง */
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim().slice(0, max);
  return s || null;
}

export async function roomCodeParam(params: Promise<{ code: string }>): Promise<string | null> {
  const { code } = await params;
  return normalizeRoomCode(decodeURIComponent(code));
}
