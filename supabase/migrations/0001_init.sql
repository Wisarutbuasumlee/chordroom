-- ChordRoom · รันใน Supabase SQL Editor ครั้งเดียว
create extension if not exists pg_trgm;

create table if not exists rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- เก็บแค่ชื่อเพลง ศิลปิน ลิงก์ · ห้ามเก็บเนื้อคอร์ด
create table if not exists songs (
  id                 bigserial primary key,
  title              text not null,
  artist             text,
  source             text not null check (source in ('dochord', 'chordzaa', 'chordtabs')),
  url                text not null unique,
  normalized_title   text not null default '',
  normalized_artist  text not null default '',
  updated_at         timestamptz not null default now()
);

-- ประวัติเพลงของห้อง · เพลงปัจจุบัน = แถวล่าสุดที่ undone_at เป็น null
-- เก็บ title/artist ซ้ำไว้ด้วย เพราะเพลงจากลิงก์ที่วางเองไม่มีแถวใน songs
create table if not exists room_songs (
  id          bigserial primary key,
  room_id     uuid not null references rooms(id) on delete cascade,
  song_id     bigint references songs(id) on delete set null,
  source      text not null,
  url         text not null,
  title       text not null,
  artist      text,
  opened_by   text not null,
  opened_at   timestamptz not null default now(),
  undone_at   timestamptz
);

create index if not exists room_songs_room_idx on room_songs (room_id, id desc) where undone_at is null;
create index if not exists songs_title_trgm on songs using gin (normalized_title gin_trgm_ops);
create index if not exists songs_artist_trgm on songs using gin (normalized_artist gin_trgm_ops);

-- เปิด RLS โดยไม่มี policy: เข้าถึงตารางได้เฉพาะฝั่งเซิร์ฟเวอร์ (service role)
-- ส่วน Realtime Broadcast/Presence ใช้ anon key ได้โดยไม่ต้องอ่านตาราง
alter table rooms enable row level security;
alter table songs enable row level security;
alter table room_songs enable row level security;

-- ภาษาไทยไม่มีช่องว่างคั่นคำ จึงหาแบบ substring ด้วย trigram แทน full-text
-- q ต้องผ่าน normalize() มาแล้ว (ไม่มีช่องว่าง/เครื่องหมาย)
create or replace function search_songs(q text, src text default null, lim int default 40)
returns table (id bigint, title text, artist text, source text, url text)
language sql stable
as $$
  select s.id, s.title, s.artist, s.source, s.url
  from songs s
  where (src is null or s.source = src)
    and q <> ''
    and (s.normalized_title like '%' || q || '%' or s.normalized_artist like '%' || q || '%')
  order by
    (s.normalized_title = q) desc,
    (s.normalized_title like q || '%') desc,
    (s.normalized_title like '%' || q || '%') desc,
    similarity(s.normalized_title, q) desc,
    length(s.normalized_title)
  limit least(lim, 100);
$$;
