-- ============================================================
-- 0400 · View สำหรับหน้าจอต่าง ๆ และฟังก์ชันเรียกใช้จากแอป (RPC)
-- security_invoker = true → RLS ของตารางต้นทางยังมีผลเมื่ออ่านผ่าน view
-- ============================================================

-- ── ยอดเงินต่อใบงาน ─────────────────────────────────────────
create or replace view public.job_totals with (security_invoker = true) as
select
  j.id                                                                as job_id,
  coalesce(sum(p.gross_amount), 0)                                    as subtotal,
  coalesce(sum(p.gross_amount - p.net_amount), 0)                     as discount_total,
  coalesce(sum(p.net_amount), 0)                                      as net_total,
  round(coalesce(sum(p.net_amount), 0) * public.app_vat_rate(), 2)    as vat,
  round(coalesce(sum(p.net_amount), 0) * (1 + public.app_vat_rate()), 2) as grand_total,
  count(p.id)                                                         as parts_count
from public.repair_jobs j
left join public.job_parts p on p.job_id = j.id
group by j.id;

comment on view public.job_totals is 'ยอดก่อน VAT / ส่วนลด / VAT / รวมทั้งสิ้น ต่อใบงาน (คำนวณจาก job_parts)';

-- ── รายการงานซ่อม (หน้าจอรายการ + การ์ด + คิวสถานะ) ──────────
create or replace view public.jobs_list with (security_invoker = true) as
select
  j.id,
  j.code,
  j.status,
  s.label_th        as status_label,
  s.chip_fg,
  s.chip_bg,
  s.dot_color,
  s.sort_order      as status_order,
  s.is_closed,
  s.action_label_th as next_action_label,
  j.symptom,
  j.root_cause,
  j.mileage,
  j.reported_on,
  j.break_on,
  j.done_on,
  j.reporter,
  j.note,
  v.id              as vehicle_id,
  v.code            as vehicle_code,
  v.brand_model,
  v.plate,
  pl.id             as place_id,
  pl.name           as place_name,
  (
    select string_agg(t.name, ' + ' order by jt.is_lead desc, t.name)
      from public.job_technicians jt
      join public.technicians t on t.id = jt.technician_id
     where jt.job_id = j.id
  ) as technicians,
  (
    select array_agg(distinct pr.code order by pr.code)
      from public.job_parts p2
      join public.purchase_requests pr on pr.id = p2.pr_id
     where p2.job_id = j.id
  ) as pr_codes,
  (select count(*) from public.job_photos ph where ph.job_id = j.id) as photo_count,
  t.parts_count,
  t.subtotal,
  t.discount_total,
  t.vat,
  t.grand_total,
  case when s.is_closed then null else current_date - j.reported_on end as age_days
from public.repair_jobs j
join public.vehicles v      on v.id = j.vehicle_id
join public.job_statuses s  on s.code = j.status
left join public.repair_places pl on pl.id = j.place_id
left join public.job_totals t     on t.job_id = j.id;

-- ── สรุปรายคัน (หน้าทะเบียนรถ + การ์ด "รถที่ซ่อมบ่อย") ────────
create or replace view public.vehicle_summary with (security_invoker = true) as
select
  v.id,
  v.code,
  v.plate,
  v.brand_model,
  v.vehicle_type,
  v.note,
  v.mileage,
  v.is_active,
  count(j.id)                          as job_count,
  count(j.id) filter (where s.is_closed is false) as open_job_count,
  coalesce(sum(t.grand_total), 0)      as repair_cost,
  max(j.reported_on)                   as last_reported_on
from public.vehicles v
left join public.repair_jobs j    on j.vehicle_id = v.id
left join public.job_statuses s   on s.code = j.status
left join public.job_totals t     on t.job_id = j.id
group by v.id;

-- ── KPI: จำนวนงานแยกตามสถานะ ────────────────────────────────
create or replace view public.job_status_counts with (security_invoker = true) as
select
  s.code,
  s.label_th,
  s.sort_order,
  count(j.id) as job_count,
  coalesce(sum(t.grand_total), 0) as total_cost
from public.job_statuses s
left join public.repair_jobs j on j.status = s.code
left join public.job_totals t  on t.job_id = j.id
group by s.code, s.label_th, s.sort_order;

-- ── กราฟค่าซ่อมรายเดือน (แดชบอร์ด) ──────────────────────────
create or replace view public.monthly_repair_cost with (security_invoker = true) as
select
  date_trunc('month', j.reported_on)::date as month,
  count(*)                                 as job_count,
  coalesce(sum(t.grand_total), 0)          as total_cost
from public.repair_jobs j
left join public.job_totals t on t.job_id = j.id
group by 1
order by 1;

-- ── ยอดรวมต่อใบสั่งซื้อ (การ์ด PR ในหน้ารายละเอียด) ──────────
create or replace view public.pr_summary with (security_invoker = true) as
select
  pr.id,
  pr.code,
  pr.issued_on,
  count(p.id)                    as items_count,
  coalesce(sum(p.net_amount), 0) as net_amount,
  round(coalesce(sum(p.net_amount), 0) * (1 + public.app_vat_rate()), 2) as amount_incl_vat,
  array_agg(distinct j.code order by j.code) as job_codes
from public.purchase_requests pr
left join public.job_parts p    on p.pr_id = pr.id
left join public.repair_jobs j  on j.id = p.job_id
group by pr.id;

-- ============================================================
-- ฟังก์ชันเรียกจากแอป
-- ============================================================

-- ค้นหาใบงาน: เบอร์รถ / อาการ / เลขที่ใบงาน / ชื่อช่าง / อะไหล่ / เลข PR
create or replace function public.search_jobs(q text default null, p_status text default null)
returns setof public.jobs_list
language sql
stable
set search_path = ''
as $$
  select l.*
    from public.jobs_list l
   where (p_status is null or l.status = p_status)
     and (
       q is null or btrim(q) = ''
       or l.vehicle_code ilike '%' || q || '%'
       or l.symptom      ilike '%' || q || '%'
       or l.code         ilike '%' || q || '%'
       or coalesce(l.root_cause, '')  ilike '%' || q || '%'
       or coalesce(l.technicians, '') ilike '%' || q || '%'
       or exists (
            select 1 from unnest(coalesce(l.pr_codes, array[]::text[])) c
             where c ilike '%' || q || '%'
          )
       or exists (
            select 1 from public.job_parts p
             where p.job_id = l.id
               and (p.name ilike '%' || q || '%' or coalesce(p.part_no, '') ilike '%' || q || '%')
          )
     )
   order by l.reported_on desc, l.code desc;
$$;

-- หา (หรือสร้าง) ใบสั่งซื้อจากเลข PR
create or replace function public.upsert_purchase_request(p_code text)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_code is null or btrim(p_code) = '' then
    return null;
  end if;

  insert into public.purchase_requests (code)
  values (btrim(p_code))
  on conflict (code) do nothing;

  select id into v_id from public.purchase_requests where code = btrim(p_code);
  return v_id;
end;
$$;

-- เลื่อนสถานะงานไปขั้นถัดไป (ปุ่มในหน้ารายละเอียดใบงาน)
create or replace function public.advance_job_status(p_job_id uuid, p_note text default null)
returns public.repair_jobs
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_job  public.repair_jobs;
  v_next text;
begin
  select * into v_job from public.repair_jobs where id = p_job_id for update;
  if not found then
    raise exception 'ไม่พบใบงาน %', p_job_id using errcode = 'no_data_found';
  end if;

  select next_code into v_next from public.job_statuses where code = v_job.status;

  if v_next is null or v_next = v_job.status then
    return v_job;             -- ปิดงานแล้ว ไม่มีขั้นถัดไป
  end if;

  update public.repair_jobs
     set status = v_next
   where id = p_job_id
  returning * into v_job;

  if p_note is not null and btrim(p_note) <> '' then
    update public.job_status_events
       set note = p_note
     where id = (select max(id) from public.job_status_events where job_id = p_job_id);
  end if;

  return v_job;
end;
$$;

-- สร้างใบแจ้งซ่อมพร้อมอะไหล่และช่างในคำสั่งเดียว (ใช้กับฟอร์ม "แจ้งซ่อมใหม่")
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

  -- อะไหล่ / ค่าแรง
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

  -- ช่างที่ทำ (สร้างรายชื่อใหม่ให้ถ้ายังไม่มีในระบบ)
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
