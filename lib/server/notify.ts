/**
 * ส่งข้อความเข้าห้อง Discord ผ่าน webhook (ตั้ง DISCORD_WEBHOOK_URL ใน GitHub secrets)
 * ไม่ได้ตั้งไว้ = ไม่ส่ง ไม่ถือว่าผิดพลาด
 */
export async function notifyDiscord(content: string): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // allowed_mentions ว่าง = ไม่แท็กใครแม้ข้อความจะมี @
      body: JSON.stringify({ username: "ChordRoom", content: content.slice(0, 1900), allowed_mentions: { parse: [] } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
