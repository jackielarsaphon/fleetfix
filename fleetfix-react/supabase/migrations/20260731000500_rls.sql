-- ============================================================
-- 0500 · Row Level Security (โหมดไม่มีระบบล็อกอิน)
--
-- ⚠️  ระบบนี้ไม่มี auth — ทุกคนที่มี URL + publishable key ทำได้ทุกอย่าง
--     publishable key อยู่ในไฟล์ JS ของหน้าเว็บ ใครเปิดเว็บก็อ่านค่านี้ได้
--     ใช้กับงานในวงปิดเท่านั้น ถ้าจะเปิดให้คนนอกเข้าถึงต้องกลับมาใส่ auth
--
-- ยังเปิด RLS ไว้ (ไม่ปิด) เพื่อให้เพิ่ม policy ที่เข้มขึ้นภายหลังได้
-- โดยไม่ต้องแก้โครงตาราง — แค่แทน policy ตัวที่เปิดกว้างในไฟล์นี้
--
-- ไฟล์นี้เขียนเป็นคำสั่งตรง ๆ ทั้งหมด ไม่มีบล็อก do $$ ... $$ และไม่มีการ
-- grant execute ให้ฟังก์ชัน (PostgreSQL ให้สิทธิ์ execute กับ PUBLIC มาแต่ต้นแล้ว)
-- ============================================================

-- ── เปิด RLS ทุกตาราง ───────────────────────────────────────
alter table public.app_settings      enable row level security;
alter table public.job_statuses      enable row level security;
alter table public.vehicles          enable row level security;
alter table public.repair_places     enable row level security;
alter table public.technicians       enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.repair_jobs       enable row level security;
alter table public.job_parts         enable row level security;
alter table public.job_technicians   enable row level security;
alter table public.job_photos        enable row level security;
alter table public.job_status_events enable row level security;

-- ── ตารางตั้งค่า: อ่านได้ แก้ไม่ได้จากฝั่งหน้าเว็บ ────────────
-- (แก้ค่า VAT / ผังสถานะงาน ผ่าน Dashboard หรือ service_role เท่านั้น)
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select to anon, authenticated using (true);

drop policy if exists job_statuses_read on public.job_statuses;
create policy job_statuses_read on public.job_statuses
  for select to anon, authenticated using (true);

-- ── ตารางข้อมูลงาน: อ่าน / เพิ่ม / แก้ / ลบ ได้ทั้งหมด ────────
drop policy if exists vehicles_all on public.vehicles;
create policy vehicles_all on public.vehicles
  for all to anon, authenticated using (true) with check (true);

drop policy if exists repair_places_all on public.repair_places;
create policy repair_places_all on public.repair_places
  for all to anon, authenticated using (true) with check (true);

drop policy if exists technicians_all on public.technicians;
create policy technicians_all on public.technicians
  for all to anon, authenticated using (true) with check (true);

drop policy if exists purchase_requests_all on public.purchase_requests;
create policy purchase_requests_all on public.purchase_requests
  for all to anon, authenticated using (true) with check (true);

drop policy if exists repair_jobs_all on public.repair_jobs;
create policy repair_jobs_all on public.repair_jobs
  for all to anon, authenticated using (true) with check (true);

drop policy if exists job_parts_all on public.job_parts;
create policy job_parts_all on public.job_parts
  for all to anon, authenticated using (true) with check (true);

drop policy if exists job_technicians_all on public.job_technicians;
create policy job_technicians_all on public.job_technicians
  for all to anon, authenticated using (true) with check (true);

drop policy if exists job_photos_all on public.job_photos;
create policy job_photos_all on public.job_photos
  for all to anon, authenticated using (true) with check (true);

drop policy if exists job_status_events_all on public.job_status_events;
create policy job_status_events_all on public.job_status_events
  for all to anon, authenticated using (true) with check (true);

-- ── สิทธิ์ระดับ schema / ตาราง / view / sequence ─────────────
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.vehicles,
  public.repair_places,
  public.technicians,
  public.purchase_requests,
  public.repair_jobs,
  public.job_parts,
  public.job_technicians,
  public.job_photos,
  public.job_status_events
to anon, authenticated;

grant select on public.app_settings, public.job_statuses to anon, authenticated;

-- เลขที่ใบงานอัตโนมัติเรียก nextval() ในสิทธิ์ของผู้เรียก → ต้องให้สิทธิ์ sequence ด้วย
grant usage, select on sequence public.job_code_seq to anon, authenticated;

grant select on
  public.jobs_list,
  public.job_totals,
  public.vehicle_summary,
  public.job_status_counts,
  public.monthly_repair_cost,
  public.pr_summary
to anon, authenticated;
