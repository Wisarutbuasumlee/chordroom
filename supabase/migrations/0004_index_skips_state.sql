-- หน้าใน sitemap ที่อ่านแล้วไม่ใช่หน้าเพลง (เช่น เพลงถูกลบแล้วพาไปหน้าแรก)
-- จำไว้จะได้ไม่ดึงซ้ำทุกชั่วโมง และนับว่า index ครบได้
create table if not exists index_skips (
  url     text primary key,
  source  text not null,
  reason  text not null,
  at      timestamptz not null default now()
);

-- ค่าสถานะเล็กๆ ของระบบ เช่น แจ้งเตือน "index ครบแล้ว" ไปแล้วหรือยัง
create table if not exists app_state (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table index_skips enable row level security;
alter table app_state enable row level security;
