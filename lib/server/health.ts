import { SOURCE_BY_ID, SOURCES } from "../sources";
import type { SourceId } from "../types";
import { alertOnChange, alertOnce } from "./alerts";
import type { Store } from "./store";
import { USER_AGENT } from "./titles";

export type EmbedStatus = "ok" | "blocked" | "unknown";

/**
 * หน้าเพลงยังฝังใน iframe ได้ไหม: ดูแค่ header (X-Frame-Options, CSP frame-ancestors) ไม่อ่านเนื้อหน้า
 * ถ้าเจอหน้าตรวจบอตของ Cloudflare = ตรวจไม่ได้ (unknown) ไม่ถือว่าโดนบล็อก
 */
export async function checkEmbeddable(url: string): Promise<{ status: EmbedStatus; detail: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect: "follow", signal: ctrl.signal });
    ctrl.abort(); // ได้ header แล้ว ไม่ต้องอ่านเนื้อหน้า
    if (
      res.headers.get("cf-mitigated") === "challenge" ||
      ((res.status === 403 || res.status === 503) && res.headers.get("server")?.includes("cloudflare"))
    ) {
      return { status: "unknown", detail: `เจอหน้าตรวจบอตของ Cloudflare (HTTP ${res.status})` };
    }
    if (!res.ok) return { status: "unknown", detail: `HTTP ${res.status}` };

    const xfo = res.headers.get("x-frame-options")?.trim().toUpperCase();
    if (xfo === "DENY" || xfo === "SAMEORIGIN") return { status: "blocked", detail: `X-Frame-Options: ${xfo}` };

    const csp = res.headers.get("content-security-policy") ?? "";
    const fa = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.toLowerCase().startsWith("frame-ancestors"));
    if (fa) {
      const allowed = fa.split(/\s+/).slice(1);
      if (!allowed.some((v) => v === "*" || v === "https:")) return { status: "blocked", detail: `CSP ${fa}` };
    }
    return { status: "ok", detail: "ฝังได้" };
  } catch {
    return { status: "unknown", detail: "เชื่อมต่อไม่ได้" };
  } finally {
    clearTimeout(timer);
  }
}

/** ข้อ 1: เว็บคอร์ดเริ่มไม่ยอมให้ฝัง → หน้าคอร์ดในห้องจะว่าง (แจ้งตอนสถานะเปลี่ยน) */
export async function checkEmbedsAndAlert(store: Store) {
  const results: Record<string, { status: EmbedStatus; detail: string; url: string | null }> = {};
  for (const s of SOURCES) {
    const url = await store.latestSongUrl(s.id);
    if (!url) {
      results[s.id] = { status: "unknown", detail: "ยังไม่มีเพลงใน index ให้ตรวจ", url: null };
      continue;
    }
    const r = await checkEmbeddable(url);
    results[s.id] = { ...r, url };
    await alertOnChange(store, `embed:${s.id}`, r.status, {
      blocked: `🚫 **${s.host} เริ่มไม่ยอมให้ฝังหน้าเว็บแล้ว** (${r.detail})\nหน้าคอร์ดของเพลงจากเว็บนี้ในห้องจะว่าง ให้ใช้ปุ่ม "เปิดในเว็บ" แทน · ตรวจจาก ${url}`,
      ok: `✅ ${s.host} กลับมาฝังหน้าเว็บได้ตามปกติแล้ว`,
    });
  }
  return results;
}

const STALE_MS = 3 * 24 * 60 * 60 * 1000;

/** ข้อ 3: ไม่มีเพลงใหม่ / GitHub Actions ไม่ได้รันเกิน 3 วัน (ตรวจจาก Vercel เพราะถ้า GitHub หยุดก็เตือนตัวเองไม่ได้) */
export async function checkFreshnessAndAlert(store: Store) {
  const lastRun = await store.getState<{ at: string }>("index_last_run");
  const runAge = lastRun ? Date.now() - new Date(lastRun.at).getTime() : null;
  const newest: Partial<Record<SourceId, string | null>> = {};
  for (const id of ["chordzaa", "chordtabs"] as SourceId[]) newest[id] = await store.latestSongAt(id);

  if (runAge !== null && runAge > STALE_MS) {
    await alertOnce(
      store,
      "index:github-stale",
      `⏸️ **GitHub Actions ไม่ได้เก็บ index มา ${Math.floor(runAge / 86_400_000)} วันแล้ว** (GitHub อาจปิดการรันอัตโนมัติเพราะ repo ไม่มีการเปลี่ยนแปลง)\nเปิดใหม่ได้ที่แท็บ Actions → Index songs → Enable workflow`,
    );
  }
  for (const [id, at] of Object.entries(newest)) {
    if (!at) continue;
    const age = Date.now() - new Date(at).getTime();
    if (age > STALE_MS) {
      await alertOnce(
        store,
        `index:${id}:no-new-songs`,
        `🕸️ **ไม่มีเพลงใหม่จาก ${SOURCE_BY_ID[id as SourceId].host} เข้า index มา ${Math.floor(age / 86_400_000)} วันแล้ว** ลองดูว่ารอบเก็บ index ยังทำงานอยู่ไหม หรือเว็บเปลี่ยนรูปแบบ sitemap`,
      );
    }
  }
  return { lastRun: lastRun?.at ?? null, newest };
}
