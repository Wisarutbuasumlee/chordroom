/**
 * รันไฟล์ SQL ใน supabase/migrations ตามลำดับชื่อไฟล์
 *   npm run db:migrate
 * ใช้ POSTGRES_URL_NON_POOLING จาก .env.local (Vercel ใส่ให้เมื่อติดตั้ง Supabase integration)
 * ไฟล์ migration เขียนแบบ "if not exists" / "or replace" รันซ้ำได้
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {}

const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!url) {
  console.error("ไม่พบ POSTGRES_URL_NON_POOLING ใน .env.local (รัน `vercel env pull .env.local` ก่อน)");
  process.exit(1);
}

const dir = path.join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// Supabase ใช้ใบรับรองของตัวเอง: เข้ารหัสการเชื่อมต่อแต่ไม่ตรวจ CA
const connect = async () => {
  const c = new pg.Client({
    connectionString: url.replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  return c;
};

// โปรเจกต์ที่เพิ่งสร้างใช้เวลาสักพักกว่าฐานข้อมูลจะพร้อม
let client: pg.Client | null = null;
for (let i = 1; !client; i++) {
  try {
    client = await connect();
  } catch (e) {
    if (i >= 12) throw e;
    console.log(`ฐานข้อมูลยังไม่พร้อม (${(e as Error).message}) ลองใหม่ใน 15 วินาที…`);
    await new Promise((r) => setTimeout(r, 15_000));
  }
}
try {
  for (const f of files) {
    console.log(`รัน ${f}`);
    await client.query(readFileSync(path.join(dir, f), "utf8"));
  }
  console.log("เสร็จแล้ว");
} finally {
  await client.end();
}
