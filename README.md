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

โปรเจกต์ Vercel `chordroom` ต่อกับ repo นี้แล้ว push ขึ้น `main` เมื่อไหร่ Vercel จะ deploy ให้เอง
ใช้ Supabase จาก Vercel Marketplace (ภูมิภาค Singapore) ซึ่ง Vercel ใส่ env ให้เองแล้ว และฟังก์ชันของ Vercel ก็ตั้งให้รันที่ Singapore (`sin1`) ใกล้ฐานข้อมูล

```bash
vercel env pull .env.local      # ดึง env (Supabase, Postgres) มาไว้ในเครื่อง
npm run db:migrate              # สร้างตาราง/ฟังก์ชันค้นหา (รันซ้ำได้)
npm run index -- --max 5000     # เก็บ index เว็บละ 5000 เพลงล่าสุด
npm run index -- --max 0        # ทั้งหมด (หยุดกลางทางได้ รอบหน้าทำต่อจากที่ค้าง)
```

- ใน sitemap มี chordtabs ราว 72,000 เพลงและ chordzaa ราว 11,700 เพลง ถ้าเก็บทั้งหมดใช้เวลาหลายชั่วโมง เพราะสคริปต์ตั้งใจดึงช้าๆ ไม่ให้เว็บต้นทางรับภาระหนัก
- **อัปเดตเองอัตโนมัติ:** GitHub Actions ([`.github/workflows/index-songs.yml`](./.github/workflows/index-songs.yml)) รันทุก 6 ชั่วโมง เก็บเพลงที่ยังไม่มีใน index (เพลงใหม่ก่อน) รอบละไม่เกิน 5.5 ชั่วโมง ครั้งแรกใช้ 2–3 รอบกว่าจะครบ หลังจากนั้นแต่ละรอบเก็บแค่เพลงใหม่ ใช้ secrets `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` สั่งรันเองได้ที่แท็บ Actions → Index songs → Run workflow
  - GitHub ปิด scheduled workflow ของ repo public ถ้าไม่มีความเคลื่อนไหวใน repo 60 วัน (จะมีอีเมลเตือน กดเปิดใหม่ได้ในแท็บ Actions) ระหว่างนั้น Vercel Cron ด้านล่างยังเก็บเพลงใหม่ต่อ
  - รันบ่อยแบบนี้ยังช่วยไม่ให้ Supabase แพ็กเกจฟรีถูกพักเพราะไม่มีการใช้งาน 7 วัน
- Cron (`vercel.json`) เรียก `/api/cron/index` วันละครั้ง (แพ็กเกจ Hobby รันได้วันละครั้ง) แต่ละรอบเก็บเพลงใหม่ได้ราว 100–150 เพลง ใช้ `CRON_SECRET` ที่ตั้งไว้ใน Vercel
- ถ้าจะย้ายไปใช้ Supabase โปรเจกต์อื่น: ใส่ `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL_NON_POOLING`, `CRON_SECRET` ตาม `.env.example`

## สิ่งที่ทำแล้ว (สเปกข้อ 10)

| ขั้น | สถานะ |
|---|---|
| 1. Next.js + Tailwind + tokens 2 โหมด + ThemeToggle | ✅ ตามค่าเริ่มของเครื่อง จำค่าใน `localStorage` ไม่มีจอกะพริบตอนโหลด และแท็บอื่นเปลี่ยนตามด้วย |
| 2. ห้อง + realtime (สร้าง/เข้าห้อง, presence, `song:set` / `song:undo`) | ✅ วางลิงก์เพลงเองได้ด้วย |
| 3. แท็บคอร์ด + fallback + หน้าต่างลอย | ✅ เปลี่ยนเป็นห้องหน้าเดียวที่ฝังหน้าคอร์ดไว้ (ดูด้านล่าง) |
| 4. Index เพลง + ค้นหา + Ctrl/⌘ K | ✅ chordzaa, chordtabs · dochord ดูหมายเหตุ |
| 5. ชวนเพื่อน (QR, คัดลอก, LINE), ประวัติ, responsive | ✅ มือถือ / แผงแคบ (iPad Split View, Slide Over) / คอมและไอแพดเต็มจอ |
| 6. Deploy Vercel + Cron | ✅ Vercel + Supabase (Marketplace) · Cron วันละครั้ง |

## ห้อง = หน้าเดียวจบ

**สเปกข้อ 2 ไม่ตรงกับที่ทดสอบจริงแล้ว:** วันที่ 5 ต.ค. 2026 หน้าเพลงของ dochord, chordzaa และ chordtabs ไม่ได้ส่ง `X-Frame-Options` หรือ CSP `frame-ancestors` และไม่มีสคริปต์กันการฝัง หน้าเว็บคอร์ดจึงฝังด้วย iframe ธรรมดาได้ โดยไม่ต้องใช้ proxy หรือ extension

ห้อง (`/r/{code}`) จึงเป็นหน้าเดียว ไม่ต้องเปิดแท็บคอร์ดแยก ไม่มีหน้าต่างลอย และไม่ต้องวางสองหน้าต่างคู่กัน (`/r/{code}/view` ที่เคยมีจะพากลับมาหน้าห้อง)
- ใครในห้องเลือกเพลงหรือกด "เพลงก่อน" หน้าคอร์ดของทุกคนจะโหลดเพลงใหม่เอง
- **คอม/ไอแพด:** แถบข้างซ้ายมีห้อง รหัส ชวนเพื่อน ช่องค้นหา คนในห้อง และประวัติเพลง พับเก็บได้ (จำค่าไว้ในเครื่อง) ด้านขวาคือหน้าเว็บคอร์ด ค้นหาด้วย Ctrl/⌘ + K ได้
- **มือถือ/หน้าต่างแคบ:** แถบบนมีปุ่มห้อง (QR, รหัส, คนในห้อง, ประวัติ), ค้นหา, เพลงก่อน และเปิดหน้าเว็บต้นฉบับ หน้าคอร์ดเต็มจอ
- iframe ใส่ `sandbox` ไว้ หน้าเว็บคอร์ดจึงพาหน้าเราไปที่อื่นไม่ได้ ส่วนลิงก์และโฆษณาของเว็บนั้นยังเปิดแท็บใหม่ได้ตามปกติ
- ถ้าวันหนึ่งเว็บไหนเริ่มห้ามฝัง ให้ใช้ปุ่ม "เปิดหน้าเว็บต้นฉบับ" ในแถบบนแทน
- ต่างจาก canvas ที่ออกแบบไว้ เพราะตอนออกแบบเชื่อสเปกข้อ 2 ว่าฝังไม่ได้ แถบข้างซ้ายใช้หน้าตาแบบแผงห้องของบอร์ด B-Tablet

## ผลทดสอบตามสเปกข้อ 9 (5 ต.ค. 2026)

1. **หน้าคอร์ดเปลี่ยนตามห้อง**: ฝังหน้าเว็บคอร์ดได้ทั้ง 3 เว็บ และหน้าคอร์ดโหลดเพลงใหม่เองเมื่อคนอื่นในห้องเปลี่ยนเพลง (ทดสอบบน Chromium ทั้งขนาดคอมและมือถือ) · ยังไม่ได้ทดสอบบน Safari, Firefox และเครื่องจริงของคนในกลุ่ม
2. **หน้าต่างลอย**: ไม่ต้องใช้แล้ว เพราะห้องเป็นหน้าเดียวจบ
3. **Index**: robots.txt ของทั้ง 3 เว็บอนุญาตให้เก็บ · chordzaa และ chordtabs อ่านจาก sitemap และ `<title>` ได้ ค้นภาษาไทยแบบ substring ได้ดี
   - **dochord ไม่ได้ทำ index** เพราะเว็บบล็อกบอตไว้ทุกทาง (sitemap ติด Cloudflare challenge, REST API ปิด, feed ปิด) จึงไม่หาทางเลี่ยง
   - ในผลค้นหาจึงมีปุ่ม “ค้นใน dochord.com” ไว้เปิดหน้าค้นหาของเขาในแท็บคอร์ด เจอเพลงแล้วคัดลอกลิงก์มาวางในช่องค้นหาของเรา (ใส่ชื่อเพลงเองได้ เพราะเซิร์ฟเวอร์อ่านชื่อจาก dochord ไม่ได้)
4. **มือถือสลับแท็บ**: เมื่อกลับมาที่แท็บห้อง (`visibilitychange` / `pageshow` / `online`) ระบบดึงสถานะห้องล่าสุดและต่อ realtime ใหม่ · ต้องทดสอบบนมือถือจริงอีกครั้ง

## โครงไฟล์

```
app/                  หน้าเว็บและ API (rooms, search, cron/index)
components/room/      หน้าห้อง: RoomApp, RoomLayouts (คอม/มือถือ), ChordFrame (iframe), SearchPalette (Ctrl+K),
                      SearchPanel, InviteSheet (QR + คนในห้อง + ประวัติ), People
hooks/                useRoom (state + realtime), useLayout, useSearch
lib/                  realtime (Supabase / BroadcastChannel), theme, normalize
lib/server/           store (Supabase / memory), indexer (sitemap → <title>), titles
scripts/index-songs.mts   เก็บ index จากเครื่องตัวเอง
supabase/migrations/      ตาราง + pg_trgm + search_songs()
```

**ส่วนที่ต่างจากร่างในสเปก**
- `room_songs` เก็บ `title`, `artist` ซ้ำไว้ และมี `undone_at` (กด “เพลงก่อน” = ทำเครื่องหมายแถวล่าสุด ไม่ลบทิ้ง) เพราะเพลงจากลิงก์ที่วางเองไม่มีแถวใน `songs`
- `songs` มี `normalized_artist` ไว้ค้นจากชื่อศิลปิน
- ฝั่งเซิร์ฟเวอร์เท่านั้นที่เข้าถึงตารางได้ (RLS เปิดแต่ไม่มี policy) · ส่วน anon key ใช้แค่ Realtime
- ห้องรับเฉพาะลิงก์ https ของ 3 เว็บนี้ เพราะทุกคนในห้องจะถูกพาไปเปิดลิงก์นั้น
