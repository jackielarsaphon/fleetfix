-- ============================================================
-- 0200 · ตารางข้อมูลหลัก: สถานะงาน, รถ, สถานที่ซ่อม, ช่าง, ใบสั่งซื้อ
-- ============================================================

-- ── สถานะงานซ่อม (แทนค่าคงที่ STATUS / ORDER / NEXT ในโค้ด) ──
create table if not exists public.job_statuses (
  code            text primary key,
  label_th        text    not null,
  sort_order      integer not null unique,
  -- deferrable เพราะแถวแรกอ้างสถานะถัดไปที่ยังไม่ถูก insert ใน statement เดียวกัน
  next_code       text    references public.job_statuses (code) deferrable initially deferred,
  action_label_th text,                       -- ข้อความบนปุ่มเลื่อนสถานะ
  chip_fg         text    not null default '#4b453e',
  chip_bg         text    not null default '#eceadf',
  dot_color       text    not null default '#9a938a',
  is_closed       boolean not null default false
);

comment on table public.job_statuses is
  'สถานะงานซ่อมและลำดับการไหลของงาน — เพิ่ม/แก้สถานะได้โดยไม่ต้องแก้โค้ดแอป';

insert into public.job_statuses
  (code, label_th, sort_order, next_code, action_label_th, chip_fg, chip_bg, dot_color, is_closed) values
  ('new',           'แจ้งใหม่',  1, 'waiting_parts', 'เปิดสั่งอะไหล่',        '#4b453e', '#eceadf', '#9a938a', false),
  ('waiting_parts', 'รออะไหล่',  2, 'in_progress',   'เริ่มลงมือซ่อม',        '#8a4a06', '#fdf0da', '#b45309', false),
  ('in_progress',   'กำลังซ่อม', 3, 'done',          'ปิดงาน (ซ่อมเสร็จ)',    '#1a4796', '#e6edfb', '#2a5cc4', false),
  ('done',          'เสร็จแล้ว', 4, 'done',          'ปิดงานแล้ว',            '#12603c', '#e4f2e8', '#157347', true)
on conflict (code) do nothing;

-- ── ทะเบียนรถ ───────────────────────────────────────────────
create table if not exists public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  code         text    not null unique,          -- เบอร์รถ เช่น TS-028
  plate        text,                             -- ทะเบียนรถ
  brand_model  text,                             -- ยี่ห้อ / รุ่น
  vehicle_type text,                             -- ประเภทรถ
  owner        text,                             -- หน่วยงาน / ผู้ครอบครอง
  note         text,
  mileage      integer not null default 0 check (mileage >= 0),
  photo_path   text,                             -- path ใน storage bucket vehicle-photos
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.vehicles.mileage is 'เลขไมล์ล่าสุด — trigger อัปเดตให้เองจากใบงานที่แจ้ง';

create index if not exists vehicles_code_trgm_idx on public.vehicles using gin (code gin_trgm_ops);
create index if not exists vehicles_active_idx on public.vehicles (is_active) where is_active;

drop trigger if exists vehicles_touch on public.vehicles;
create trigger vehicles_touch before update on public.vehicles
  for each row execute function public.touch_updated_at();

-- ── สถานที่ซ่อม ─────────────────────────────────────────────
create table if not exists public.repair_places (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  kind       text,                              -- อู่ในบริษัท / อู่คู่สัญญา / รถโมบายล์
  contact    text,
  phone      text,
  address    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists repair_places_touch on public.repair_places;
create trigger repair_places_touch before update on public.repair_places
  for each row execute function public.touch_updated_at();

-- ── ช่าง ────────────────────────────────────────────────────
create table if not exists public.technicians (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists technicians_touch on public.technicians;
create trigger technicians_touch before update on public.technicians
  for each row execute function public.touch_updated_at();

-- ── ใบสั่งซื้อ (PR) ─────────────────────────────────────────
create table if not exists public.purchase_requests (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,              -- เช่น PR2605006
  issued_on  date,
  issued_by  text,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.purchase_requests is
  'ใบสั่งซื้อ — อะไหล่หลายรายการอ้าง PR ใบเดียวกันได้ และใบงานเดียวมีได้หลาย PR';

create index if not exists purchase_requests_code_trgm_idx
  on public.purchase_requests using gin (code gin_trgm_ops);

drop trigger if exists purchase_requests_touch on public.purchase_requests;
create trigger purchase_requests_touch before update on public.purchase_requests
  for each row execute function public.touch_updated_at();
