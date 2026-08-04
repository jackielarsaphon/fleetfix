-- ============================================================
-- 0300 · ใบงานซ่อมและตารางลูก: อะไหล่, ช่างที่ทำ, รูปภาพ, ไทม์ไลน์
-- ============================================================

-- เลขที่ใบงานอัตโนมัติ: JR<ปี ค.ศ. 2 หลัก>-<running 4 หลัก> เช่น JR26-0155
create sequence if not exists public.job_code_seq as integer start 1;

create or replace function public.next_job_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select coalesce((select (value #>> '{}') from public.app_settings where key = 'job_code_prefix'), 'JR')
      || to_char(current_date, 'YY')
      || '-'
      || lpad(nextval('public.job_code_seq')::text, 4, '0');
$$;

-- ── ใบงานซ่อม ───────────────────────────────────────────────
create table if not exists public.repair_jobs (
  id          uuid primary key default gen_random_uuid(),
  code        text    not null unique default public.next_job_code(),
  vehicle_id  uuid    not null references public.vehicles (id) on delete restrict,
  place_id    uuid    references public.repair_places (id) on delete set null,
  status      text    not null default 'new' references public.job_statuses (code),
  symptom     text    not null check (btrim(symptom) <> ''),   -- อาการแจ้งซ่อม
  root_cause  text,                                            -- อาการหลักที่ตรวจพบ
  mileage     integer check (mileage >= 0),                     -- เลขไมล์ตอนแจ้ง
  reported_on date    not null default current_date,            -- วันที่แจ้ง
  break_on    date,                                             -- วันที่เสีย
  done_on     date,                                             -- วันที่ซ่อมเสร็จ
  reporter    text,                                             -- ผู้แจ้ง
  note        text,
  created_by  text,                                             -- ชื่อผู้คีย์ข้อมูล (ระบบไม่มีล็อกอิน)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint repair_jobs_dates_ok check (done_on is null or break_on is null or done_on >= break_on)
);

create index if not exists repair_jobs_vehicle_idx  on public.repair_jobs (vehicle_id);
create index if not exists repair_jobs_status_idx   on public.repair_jobs (status);
create index if not exists repair_jobs_place_idx    on public.repair_jobs (place_id);
create index if not exists repair_jobs_reported_idx on public.repair_jobs (reported_on desc);
create index if not exists repair_jobs_open_idx     on public.repair_jobs (reported_on desc)
  where status <> 'done';
create index if not exists repair_jobs_search_trgm_idx
  on public.repair_jobs using gin ((code || ' ' || symptom || ' ' || coalesce(root_cause, '')) gin_trgm_ops);

drop trigger if exists repair_jobs_touch on public.repair_jobs;
create trigger repair_jobs_touch before update on public.repair_jobs
  for each row execute function public.touch_updated_at();

-- ── อะไหล่และค่าแรงในใบงาน ──────────────────────────────────
create table if not exists public.job_parts (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid    not null references public.repair_jobs (id) on delete cascade,
  line_no      integer not null default 1,
  name         text    not null check (btrim(name) <> ''),
  part_no      text,
  qty          numeric(12, 2) not null default 1 check (qty > 0),
  unit         text    not null default 'ชิ้น',
  unit_price   numeric(12, 2) not null default 0 check (unit_price >= 0),
  discount_pct numeric(5, 2)  not null default 0 check (discount_pct >= 0 and discount_pct <= 100),
  pr_id        uuid    references public.purchase_requests (id) on delete set null,
  -- ยอดคำนวณอัตโนมัติ ป้องกันแอปคำนวณไม่ตรงกัน
  gross_amount numeric(14, 2) generated always as (round(qty * unit_price, 2)) stored,
  net_amount   numeric(14, 2) generated always as (round(qty * unit_price * (1 - discount_pct / 100), 2)) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (job_id, line_no)
);

comment on table public.job_parts is 'รายการอะไหล่/ค่าแรงต่อใบงาน — ค่าแรงลงเป็นรายการหนึ่งโดยใช้ unit = ชั่วโมง/งาน';

create index if not exists job_parts_job_idx on public.job_parts (job_id);
create index if not exists job_parts_pr_idx  on public.job_parts (pr_id);
create index if not exists job_parts_search_trgm_idx
  on public.job_parts using gin ((name || ' ' || coalesce(part_no, '')) gin_trgm_ops);

drop trigger if exists job_parts_touch on public.job_parts;
create trigger job_parts_touch before update on public.job_parts
  for each row execute function public.touch_updated_at();

-- ── ช่างที่ทำงานใบนี้ (หลายคนต่อใบงานได้) ────────────────────
create table if not exists public.job_technicians (
  job_id        uuid not null references public.repair_jobs (id) on delete cascade,
  technician_id uuid not null references public.technicians (id) on delete restrict,
  is_lead       boolean not null default false,
  primary key (job_id, technician_id)
);

create index if not exists job_technicians_tech_idx on public.job_technicians (technician_id);

-- ── รูปภาพก่อน/หลังซ่อม ─────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'photo_kind') then
    create type public.photo_kind as enum ('before', 'after', 'report');
  end if;
end
$$;

create table if not exists public.job_photos (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid    not null references public.repair_jobs (id) on delete cascade,
  kind         public.photo_kind not null default 'before',
  storage_path text    not null,                 -- path ใน bucket job-photos
  caption      text,
  sort_order   integer not null default 0,
  uploaded_by  text,
  created_at   timestamptz not null default now()
);

create index if not exists job_photos_job_idx on public.job_photos (job_id, kind, sort_order);

-- ── ไทม์ไลน์การเปลี่ยนสถานะ ─────────────────────────────────
create table if not exists public.job_status_events (
  id          bigint generated always as identity primary key,
  job_id      uuid not null references public.repair_jobs (id) on delete cascade,
  from_status text references public.job_statuses (code),
  to_status   text not null references public.job_statuses (code),
  note        text,
  actor       text,
  created_at  timestamptz not null default now()
);

create index if not exists job_status_events_job_idx on public.job_status_events (job_id, created_at);

-- ── trigger: ใส่/ล้างวันที่ปิดงานตามสถานะ ────────────────────
create or replace function public.sync_job_done_on()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  closed boolean;
begin
  select is_closed into closed from public.job_statuses where code = new.status;

  if closed and new.done_on is null then
    new.done_on := current_date;
  elsif not closed then
    new.done_on := null;
  end if;

  return new;
end;
$$;

drop trigger if exists repair_jobs_sync_done_on on public.repair_jobs;
create trigger repair_jobs_sync_done_on before insert or update of status, done_on on public.repair_jobs
  for each row execute function public.sync_job_done_on();

-- ── trigger: บันทึกไทม์ไลน์ทุกครั้งที่สถานะเปลี่ยน ────────────
create or replace function public.log_job_status_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.job_status_events (job_id, from_status, to_status, actor)
    values (new.id, null, new.status, new.created_by);
  elsif new.status is distinct from old.status then
    insert into public.job_status_events (job_id, from_status, to_status, actor)
    values (new.id, old.status, new.status, new.created_by);
  end if;
  return null;
end;
$$;

drop trigger if exists repair_jobs_log_status on public.repair_jobs;
create trigger repair_jobs_log_status after insert or update of status on public.repair_jobs
  for each row execute function public.log_job_status_event();

-- ── trigger: อัปเดตเลขไมล์ล่าสุดของรถจากใบงาน ────────────────
create or replace function public.sync_vehicle_mileage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.mileage is not null then
    update public.vehicles
       set mileage = new.mileage
     where id = new.vehicle_id
       and new.mileage > mileage;
  end if;
  return null;
end;
$$;

drop trigger if exists repair_jobs_sync_mileage on public.repair_jobs;
create trigger repair_jobs_sync_mileage after insert or update of mileage on public.repair_jobs
  for each row execute function public.sync_vehicle_mileage();
