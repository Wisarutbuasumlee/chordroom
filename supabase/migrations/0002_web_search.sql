-- ค้นเพลง dochord ผ่าน Brave Search (ทำงานเมื่อตั้ง BRAVE_SEARCH_API_KEY)
-- จำคำที่เคยค้นแล้ว (ไม่ถามซ้ำภายใน 30 วัน) และนับจำนวนครั้งต่อเดือน กันเกินโควตาฟรี

create table if not exists web_search_queries (
  q            text primary key,          -- คำค้นที่ผ่าน normalize() แล้ว
  searched_at  timestamptz not null default now()
);

create table if not exists web_search_usage (
  month  text primary key,                 -- 'YYYY-MM' (เวลา UTC)
  count  int not null default 0
);

alter table web_search_queries enable row level security;
alter table web_search_usage enable row level security;

-- คืน true ถ้าควรถาม Brave: คำนี้ยังไม่เคยค้นใน 30 วัน และเดือนนี้ยังไม่ถึง lim ครั้ง
-- ถ้าคืน true จะจองโควตาและบันทึกคำค้นไว้เลยในคำสั่งเดียว (กันหลายคนค้นพร้อมกันแล้วเกินโควตา)
-- ชื่อพารามิเตอร์ต้องไม่ซ้ำชื่อคอลัมน์ q (Postgres จะฟ้อง column reference is ambiguous)
drop function if exists web_search_take(text, int);
create or replace function web_search_take(query text, lim int)
returns boolean
language plpgsql
as $$
declare
  m text := to_char(now() at time zone 'utc', 'YYYY-MM');
  used int;
begin
  if exists (select 1 from web_search_queries w where w.q = query and w.searched_at > now() - interval '30 days') then
    return false;
  end if;

  insert into web_search_usage as u (month, count) values (m, 0)
  on conflict (month) do nothing;

  update web_search_usage u set count = u.count + 1
  where u.month = m and u.count < lim
  returning u.count into used;

  if used is null then
    return false;
  end if;

  insert into web_search_queries as w (q, searched_at) values (query, now())
  on conflict on constraint web_search_queries_pkey do update set searched_at = excluded.searched_at;
  return true;
end;
$$;
