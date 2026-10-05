# ChordRoom

เว็บเปิดคอร์ดเพลงเดียวกันทั้งวง ใช้กันเองในกลุ่ม · สเปกเต็มอยู่ที่ [`chordroom-spec.md`](./chordroom-spec.md)

Next.js 16 (App Router) + TypeScript + Tailwind 4 · Supabase (Realtime + Postgres) · Deploy บน Vercel

## รันบนเครื่อง

```bash
npm install
npm run dev          # http://localhost:3000
```

ยังไม่ใส่ค่า Supabase ก็รันได้ จะเข้า **โหมดทดสอบบนเครื่อง** (มีแถบบอกด้านบน):
ห้องเก็บในหน่วยความจำของเซิร์ฟเวอร์ dev และ realtime เห็นกันเฉพาะแท็บในเบราว์เซอร์เดียวกัน

ค้นหาเพลงต้องมี index ก่อน: `npm run index` (เก็บเว็บละ 200 เพลงล่าสุดลง `data/songs.local.json`)

## ตั้งค่าใช้งานจริง

1. **Supabase** (แพ็กเกจฟรี): สร้างโปรเจกต์ → SQL Editor → รัน [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql)
2. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` และ `CRON_SECRET` (สุ่มยาวๆ)
3. **เก็บ index ครั้งแรกจากเครื่องตัวเอง** (ใน sitemap มี chordtabs ~72,000 เพลง และ chordzaa ~11,700 เพลง ถ้าเก็บทั้งหมดใช้เวลาหลายชั่วโมง เพราะสคริปต์ตั้งใจดึงช้าๆ ไม่ให้เว็บต้นทางรับภาระหนัก)
   ```bash
   npm run index -- --max 5000      # เว็บละ 5000 เพลงล่าสุด
   npm run index -- --max 0         # ทั้งหมด (หยุดกลางทางได้ รอบหน้าทำต่อจากที่ค้าง)
   ```
4. **Vercel**: Import repo → ใส่ env 4 ตัวเดียวกัน → Deploy · `vercel.json` ตั้ง Cron ให้เรียก `/api/cron/index` วันละครั้ง
   (แพ็กเกจ Hobby ยอมให้ Cron รันได้วันละครั้ง แต่ละรอบเก็บเพลงใหม่ได้ประมาณ 100–150 เพลง ภายในเวลา 60 วินาที)

## สิ่งที่ทำแล้ว (สเปกข้อ 10)

| ขั้น | สถานะ |
|---|---|
| 1. Next.js + Tailwind + tokens 2 โหมด + ThemeToggle | ✅ ตามค่าเริ่มของเครื่อง จำค่าใน `localStorage` ไม่มีจอกะพริบตอนโหลด และแท็บอื่นเปลี่ยนตามด้วย |
| 2. ห้อง + realtime (สร้าง/เข้าห้อง, presence, `song:set` / `song:undo`) | ✅ วางลิงก์เพลงเองได้ด้วย |
| 3. แท็บคอร์ด + fallback + หน้าต่างลอย | ✅ ดูผลทดสอบด้านล่าง |
| 4. Index เพลง + ค้นหา + Ctrl/⌘ K | ✅ chordzaa, chordtabs · dochord ดูหมายเหตุ |
| 5. ชวนเพื่อน (QR, คัดลอก, LINE), ประวัติ, responsive | ✅ มือถือ / แผงแคบ (iPad Split View, Slide Over) / คอมและไอแพดเต็มจอ |
| 6. Deploy Vercel + Cron | ⏳ เตรียมไฟล์ไว้แล้ว ต้องใช้บัญชี Vercel/Supabase ของเจ้าของ |

## ผลทดสอบตามสเปกข้อ 9 (5 ต.ค. 2026)

1. **แท็บคอร์ดเปลี่ยนตามห้อง**: ทั้ง 3 เว็บไม่ได้ตั้ง `Cross-Origin-Opener-Policy` · ทดสอบบน Chromium ว่าแท็บคอร์ดเปลี่ยนเพลงตามห้องได้เอง (chordzaa → chordtabs → กดเพลงก่อน) ได้ทั้งตอนกดจากหน้าต่างหลักและจากหน้าต่างลอย และหลังโหลดหน้าห้องใหม่ก็ยังใช้แท็บคอร์ดเดิม ไม่เปิดแท็บเพิ่ม
   - **สิ่งที่พบ:** ห้ามตัด `opener` ของแท็บคอร์ด (`noopener` / `w.opener = null`) เพราะ Chrome จะไม่ยอมให้เปลี่ยนหน้าแท็บข้ามโดเมน
   - ยังไม่ได้ทดสอบบน Safari, Firefox และเครื่องจริงของคนในกลุ่ม
2. **หน้าต่างลอย** (Document PiP): เปิดได้บน Chromium ขนาด 340×440 ค้นหา เปลี่ยนเพลง และกดเพลงก่อนได้จากในหน้าต่าง
3. **Index**: robots.txt ของทั้ง 3 เว็บอนุญาตให้เก็บ · chordzaa และ chordtabs อ่านจาก sitemap และ `<title>` ได้ ค้นภาษาไทยแบบ substring ได้ดี
   - **dochord ไม่ได้ทำ index** เพราะเว็บบล็อกบอตไว้ทุกทาง (sitemap ติด Cloudflare challenge, REST API ปิด, feed ปิด) จึงไม่หาทางเลี่ยง
   - ในผลค้นหาจึงมีปุ่ม “ค้นใน dochord.com” ไว้เปิดหน้าค้นหาของเขาในแท็บคอร์ด เจอเพลงแล้วคัดลอกลิงก์มาวางในช่องค้นหาของเรา (ใส่ชื่อเพลงเองได้ เพราะเซิร์ฟเวอร์อ่านชื่อจาก dochord ไม่ได้)
4. **มือถือสลับแท็บ**: เมื่อกลับมาที่แท็บห้อง (`visibilitychange` / `pageshow` / `online`) ระบบดึงสถานะห้องล่าสุดและต่อ realtime ใหม่ · ต้องทดสอบบนมือถือจริงอีกครั้ง

## โครงไฟล์

```
app/                  หน้าเว็บและ API (rooms, search, cron/index)
components/room/      หน้าห้อง: RoomApp (3 layout), NowPlayingCard, SearchPalette (Ctrl+K),
                      SearchPanel, InviteSheet (QR), FloatWindow (PiP), ViewModeChooser, People
hooks/                useRoom (state + realtime), useLayout, useSearch, useChordWindow
lib/                  chordWindow (แท็บคอร์ด), realtime (Supabase / BroadcastChannel), theme, normalize
lib/server/           store (Supabase / memory), indexer (sitemap → <title>), titles
scripts/index-songs.mts   เก็บ index จากเครื่องตัวเอง
supabase/migrations/      ตาราง + pg_trgm + search_songs()
```

**ส่วนที่ต่างจากร่างในสเปก**
- `room_songs` เก็บ `title`, `artist` ซ้ำไว้ และมี `undone_at` (กด “เพลงก่อน” = ทำเครื่องหมายแถวล่าสุด ไม่ลบทิ้ง) เพราะเพลงจากลิงก์ที่วางเองไม่มีแถวใน `songs`
- `songs` มี `normalized_artist` ไว้ค้นจากชื่อศิลปิน
- ฝั่งเซิร์ฟเวอร์เท่านั้นที่เข้าถึงตารางได้ (RLS เปิดแต่ไม่มี policy) · ส่วน anon key ใช้แค่ Realtime
- ห้องรับเฉพาะลิงก์ https ของ 3 เว็บนี้ เพราะทุกคนในห้องจะถูกพาไปเปิดลิงก์นั้น
