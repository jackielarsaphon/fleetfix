-- ============================================================
-- 0700 · ตัดทุกอย่างที่อ้าง auth.users ออกจากฐานข้อมูลที่ apply ไปแล้ว
--
-- รันไฟล์นี้ครั้งเดียว ถ้าเคยรัน migration รุ่นที่ยังมีระบบล็อกอิน
-- (ฐานข้อมูลใหม่ที่รัน 0100–0600 รุ่นปัจจุบันไม่ต้องรันไฟล์นี้ — รันซ้ำก็ไม่พัง)
--
-- หมายเหตุ: ตาราง auth.users เป็นของ Supabase เอง ลบไม่ได้และไม่ควรลบ
-- ไฟล์นี้ตัดเฉพาะ "เส้นเชื่อม" จากตารางของเราไปหามัน ให้ไม่เหลือความสัมพันธ์
-- ============================================================

-- ── 1. trigger บน auth.users และฟังก์ชันที่คู่กัน ─────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ── 2. policy รุ่นเก่าที่อ้างฟังก์ชันสิทธิ์ (ต้องลบก่อนลบฟังก์ชัน) ──
drop policy if exists app_settings_admin_write on public.app_settings;
drop policy if exists job_statuses_admin_write on public.job_statuses;

drop policy if exists vehicles_read   on public.vehicles;
drop policy if exists vehicles_insert on public.vehicles;
drop policy if exists vehicles_update on public.vehicles;
drop policy if exists vehicles_delete on public.vehicles;

drop policy if exists repair_places_read   on public.repair_places;
drop policy if exists repair_places_insert on public.repair_places;
drop policy if exists repair_places_update on public.repair_places;
drop policy if exists repair_places_delete on public.repair_places;

drop policy if exists technicians_read   on public.technicians;
drop policy if exists technicians_insert on public.technicians;
drop policy if exists technicians_update on public.technicians;
drop policy if exists technicians_delete on public.technicians;

drop policy if exists purchase_requests_read   on public.purchase_requests;
drop policy if exists purchase_requests_insert on public.purchase_requests;
drop policy if exists purchase_requests_update on public.purchase_requests;
drop policy if exists purchase_requests_delete on public.purchase_requests;

drop policy if exists repair_jobs_read   on public.repair_jobs;
drop policy if exists repair_jobs_insert on public.repair_jobs;
drop policy if exists repair_jobs_update on public.repair_jobs;
drop policy if exists repair_jobs_delete on public.repair_jobs;

drop policy if exists job_parts_read   on public.job_parts;
drop policy if exists job_parts_insert on public.job_parts;
drop policy if exists job_parts_update on public.job_parts;
drop policy if exists job_parts_delete on public.job_parts;

drop policy if exists job_technicians_read   on public.job_technicians;
drop policy if exists job_technicians_insert on public.job_technicians;
drop policy if exists job_technicians_update on public.job_technicians;
drop policy if exists job_technicians_delete on public.job_technicians;

drop policy if exists job_photos_read   on public.job_photos;
drop policy if exists job_photos_insert on public.job_photos;
drop policy if exists job_photos_update on public.job_photos;
drop policy if exists job_photos_delete on public.job_photos;

drop policy if exists job_status_events_read   on public.job_status_events;
drop policy if exists job_status_events_insert on public.job_status_events;
drop policy if exists job_status_events_update on public.job_status_events;

-- ── 3. policy ของ Storage รุ่นเก่า (อ้าง is_staff() ด้วย) ──────
-- ต้องลบก่อน ไม่งั้นจะลบฟังก์ชันในขั้นที่ 5 ไม่ได้
-- (จะสร้างขึ้นใหม่แบบไม่ต้องล็อกอินในขั้นที่ 6)
drop policy if exists photos_read   on storage.objects;
drop policy if exists photos_insert on storage.objects;
drop policy if exists photos_update on storage.objects;
drop policy if exists photos_delete on storage.objects;

-- ── 4. ตาราง profiles (ตัวที่มี FK ไป auth.users.id) ──────────
drop table if exists public.profiles cascade;

-- ── 5. ฟังก์ชันตรวจสิทธิ์ที่ไม่ใช้แล้ว ───────────────────────
-- ใส่ cascade เป็นตัวกันพลาด: ผู้ที่ขึ้นอยู่กับฟังก์ชันเหล่านี้ถูกลบไปแล้วในขั้น 2–4
-- ถ้ายังมี policy อื่นที่หลงเหลืออยู่ cascade จะลบให้ ไม่ให้ migration ค้างกลางทาง
drop function if exists public.is_staff() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.current_role_name() cascade;

-- ── 6. สร้าง policy ของ Storage ใหม่ (ไม่ต้องล็อกอิน) ─────────
create policy photos_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('job-photos', 'vehicle-photos'));

create policy photos_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id in ('job-photos', 'vehicle-photos'));

create policy photos_update on storage.objects
  for update to anon, authenticated
  using (bucket_id in ('job-photos', 'vehicle-photos'))
  with check (bucket_id in ('job-photos', 'vehicle-photos'));

create policy photos_delete on storage.objects
  for delete to anon, authenticated
  using (bucket_id in ('job-photos', 'vehicle-photos'));

-- ── 7. คอลัมน์ uuid ที่ผูก auth.users → เปลี่ยนเป็นข้อความ ────
alter table public.repair_jobs       drop constraint if exists repair_jobs_created_by_fkey;
alter table public.job_photos        drop constraint if exists job_photos_uploaded_by_fkey;
alter table public.job_status_events drop constraint if exists job_status_events_actor_fkey;

alter table public.repair_jobs       alter column created_by  type text using created_by::text;
alter table public.job_photos        alter column uploaded_by type text using uploaded_by::text;
alter table public.job_status_events alter column actor       type text using actor::text;

-- ── 8. trigger ไทม์ไลน์: เลิกใช้ auth.uid() ───────────────────
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

-- ── 9. create_repair_job: ทิ้งรุ่นเก่า (ที่เรียก auth.uid()) ───
-- ต้อง drop จริง ไม่ใช่ replace เพราะรุ่นใหม่เพิ่มพารามิเตอร์ p_created_by
-- ถ้าเหลือทั้งสองรุ่น PostgREST จะเลือกไม่ถูกว่าจะเรียกตัวไหน
drop function if exists public.create_repair_job(text, text, date, integer, text, text, text, jsonb, text[]);

create or replace function public.create_repair_job(
  p_vehicle_code text,
  p_symptom      text,
  p_break_on     date    default null,
  p_mileage      integer default null,
  p_place_name   text    default null,
  p_reporter     text    default null,
  p_note         text    default null,
  p_parts        jsonb   default '[]'::jsonb,
  p_technicians  text[]  default array[]::text[],
  p_created_by   text    default null
)
returns public.repair_jobs
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_vehicle_id uuid;
  v_place_id   uuid;
  v_job        public.repair_jobs;
begin
  select id into v_vehicle_id from public.vehicles where code = btrim(p_vehicle_code);
  if v_vehicle_id is null then
    raise exception 'ไม่พบเบอร์รถ %', p_vehicle_code using errcode = 'foreign_key_violation';
  end if;

  if p_place_name is not null and btrim(p_place_name) <> '' then
    select id into v_place_id from public.repair_places where name = btrim(p_place_name);
  end if;

  insert into public.repair_jobs
    (vehicle_id, place_id, symptom, mileage, break_on, reporter, note, created_by)
  values
    (v_vehicle_id, v_place_id, btrim(p_symptom), p_mileage, p_break_on,
     nullif(btrim(coalesce(p_reporter, '')), ''), nullif(btrim(coalesce(p_note, '')), ''),
     nullif(btrim(coalesce(p_created_by, '')), ''))
  returning * into v_job;

  insert into public.job_parts
    (job_id, line_no, name, part_no, qty, unit, unit_price, discount_pct, pr_id)
  select
    v_job.id,
    row_number() over (),
    btrim(p.name),
    nullif(btrim(coalesce(p.part_no, '')), ''),
    coalesce(p.qty, 1),
    coalesce(nullif(btrim(coalesce(p.unit, '')), ''), 'ชิ้น'),
    coalesce(p.unit_price, 0),
    coalesce(p.discount_pct, 0),
    public.upsert_purchase_request(p.pr_code)
  from jsonb_to_recordset(coalesce(p_parts, '[]'::jsonb))
    as p(name text, part_no text, qty numeric, unit text, unit_price numeric, discount_pct numeric, pr_code text)
  where btrim(coalesce(p.name, '')) <> '';

  insert into public.technicians (name)
  select distinct btrim(t)
    from unnest(coalesce(p_technicians, array[]::text[])) as t
   where btrim(coalesce(t, '')) <> ''
  on conflict (name) do nothing;

  insert into public.job_technicians (job_id, technician_id)
  select v_job.id, tc.id
    from public.technicians tc
   where tc.name in (
     select btrim(t) from unnest(coalesce(p_technicians, array[]::text[])) as t
      where btrim(coalesce(t, '')) <> ''
   )
  on conflict do nothing;

  return v_job;
end;
$$;

-- ── 10. คืนสิทธิ์ execute ที่ migration รุ่นเก่าเพิกถอนไป ──────
-- รุ่นเก่ามีบรรทัด `revoke all on function ... from public, anon`
-- การเพิกถอนติดอยู่กับตัวฟังก์ชันในฐานข้อมูล ไม่หายไปเองเมื่อแก้ไฟล์ migration
-- (ฐานข้อมูลใหม่ไม่ต้องใช้บล็อกนี้ PostgreSQL ให้ execute กับ PUBLIC มาแต่ต้น
--  แต่ใส่ไว้ก็ไม่เสียหาย เพราะเป็นการให้สิทธิ์ซ้ำกับที่มีอยู่แล้ว)
grant execute on function public.app_vat_rate()                    to anon, authenticated;
grant execute on function public.search_jobs(text, text)           to anon, authenticated;
grant execute on function public.upsert_purchase_request(text)      to anon, authenticated;
grant execute on function public.advance_job_status(uuid, text)     to anon, authenticated;
grant execute on function
  public.create_repair_job(text, text, date, integer, text, text, text, jsonb, text[], text)
to anon, authenticated;
