-- ============================================================
-- 0100 · ส่วนขยาย, ตารางตั้งค่า และฟังก์ชันช่วยเหลือ
-- ระบบนี้ไม่มีระบบล็อกอิน — ไม่มีตาราง profiles และไม่อ้าง auth.users ที่ใดเลย
-- ============================================================

create extension if not exists pg_trgm;      -- ค้นหาข้อความบางส่วน (ILIKE เร็วขึ้น)
create extension if not exists pgcrypto;     -- gen_random_uuid()

-- ── ตั้งค่าระดับระบบ (VAT ฯลฯ) ─────────────────────────────
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb       not null,
  description text,
  updated_at  timestamptz not null default now()
);

insert into public.app_settings (key, value, description) values
  ('vat_rate',        '0.07'::jsonb, 'อัตราภาษีมูลค่าเพิ่ม'),
  ('job_code_prefix', '"JR"'::jsonb, 'อักษรนำหน้าเลขที่ใบงาน')
on conflict (key) do nothing;

-- อัตรา VAT ปัจจุบัน (ถ้าไม่ได้ตั้งค่าไว้ใช้ 0.07)
create or replace function public.app_vat_rate()
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'vat_rate'), 0.07);
$$;

-- ── trigger กลาง: อัปเดต updated_at ทุกครั้งที่แก้แถว ────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
