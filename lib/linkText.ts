/**
 * กันคนแปะลิงก์/ชื่อเว็บไว้ในข้อความที่คนอื่นในห้องเห็น (ชื่อคน ชื่อห้อง ชื่อเพลงที่พิมพ์เอง)
 * จับ http(s)://, www., ชื่อโดเมนที่ลงท้ายด้วย TLD ที่พบบ่อย และบริการย่อลิงก์/แชต
 * ชื่อศิลปินอย่าง "Dr.Fuu", "F.HERO", "Medkit.z" ไม่โดน เพราะไม่ได้ลงท้ายด้วย TLD
 */
const LINK =
  /https?:\/\/|www\.|\b(?:bit\.ly|t\.me|line\.me|lin\.ee|tinyurl\.com|shorturl\.at|cutt\.ly)\b|[a-z0-9-]{2,}\s*(?:\.|\[\.\]|\(\.\)|\s+dot\s+)\s*(?:com|net|org|info|xyz|top|site|online|shop|store|club|vip|bet|win|casino|io|co|me|ly|cc|gg|to|tv|app|link|live|life|fun|asia|in\.th|co\.th|th)\b/i;

export function hasLink(text: string | null | undefined): boolean {
  return !!text && LINK.test(text);
}

/** ชื่อที่ส่งมาทาง realtime (ไม่ผ่าน server) · มีลิงก์ปนมา → แสดงแทนด้วยชื่อกลางๆ */
export function safeName(name: string, fallback = "มีคน"): string {
  return hasLink(name) ? fallback : name;
}
