-- รันไฟล์นี้ใน Supabase Dashboard > SQL Editor เพื่อสร้างตารางเก็บข้อมูลลิงก์ YouTube

create extension if not exists "pgcrypto";

create table if not exists public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  youtube_url text not null,
  title text not null,
  channel text not null,
  video_date date,
  status text not null default 'not_watched'
    check (status in ('not_watched', 'watching', 'watched')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- อัปเดต updated_at อัตโนมัติทุกครั้งที่แก้ไขแถว
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_youtube_videos_updated_at on public.youtube_videos;
create trigger trg_youtube_videos_updated_at
  before update on public.youtube_videos
  for each row execute function public.set_updated_at();

-- เปิด Row Level Security
alter table public.youtube_videos enable row level security;

-- อนุญาตให้ทุกคน (anon key) อ่าน/เพิ่ม/แก้ไข/ลบได้
-- หมายเหตุ: เหมาะสำหรับใช้งานส่วนตัว/เดโม ถ้าจะเปิดให้คนอื่นเข้าถึงเว็บด้วย
-- ควรเพิ่มระบบ auth แล้วเปลี่ยน policy ให้ผูกกับ user_id แทน
create policy "Allow anon select" on public.youtube_videos
  for select using (true);

create policy "Allow anon insert" on public.youtube_videos
  for insert with check (true);

create policy "Allow anon update" on public.youtube_videos
  for update using (true) with check (true);

create policy "Allow anon delete" on public.youtube_videos
  for delete using (true);
