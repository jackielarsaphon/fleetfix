-- ============================================================
-- 0800 · เลิกคิดภาษีมูลค่าเพิ่มทั้งระบบ
--
-- ยอด "รวมทั้งสิ้น" = มูลค่าอะไหล่และค่าแรง หักส่วนลด (ไม่บวก 7% อีก)
--
-- ต้อง drop แล้วสร้าง view ใหม่ (ไม่ใช่ create or replace) เพราะการตัดคอลัมน์
-- ออกจาก view เดิมทำด้วย replace ไม่ได้ และต้อง drop จากปลายทางเข้าหาต้นทาง
-- ตามลำดับการพึ่งพา — จบด้วยการ grant สิทธิ์คืน เพราะสิทธิ์หายไปพร้อม view เดิม
-- ============================================================

-- ── 1. ทิ้งของเดิม (ฟังก์ชันที่คืนชนิดของ view ต้องไปก่อน) ─────
drop function if exists public.search_jobs(text, text);

drop view if exists public.pr_summary;
drop view if exists public.monthly_repair_cost;
drop view if exists public.job_status_counts;
drop view if exists public.vehicle_summary;
drop view if exists public.jobs_list;
drop view if exists public.job_totals;

-- ── 2. ยอดเงินต่อใบงาน (ไม่มี VAT) ──────────────────────────
create view public.job_totals with (security_invoker = true) as
select
  j.id                                            as job_id,
  coalesce(sum(p.gross_amount), 0)                as subtotal,
  coalesce(sum(p.gross_amount - p.net_amount), 0) as discount_total,
  coalesce(sum(p.net_amount), 0)                  as grand_total,
  count(p.id)                                     as parts_count
from public.repair_jobs j
left join public.job_parts p on p.job_id = j.id
group by j.id;

comment on view public.job_totals is
  'ยอดก่อนหักส่วนลด / ส่วนลดรวม / รวมทั้งสิ้น ต่อใบงาน (ไม่คิด VAT)';

-- ── 3. รายการงานซ่อม ────────────────────────────────────────
create view public.jobs_list with (security_invoker = true) as
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
  t.grand_total,
  case when s.is_closed then null else current_date - j.reported_on end as age_days
from public.repair_jobs j
join public.vehicles v      on v.id = j.vehicle_id
join public.job_statuses s  on s.code = j.status
left join public.repair_places pl on pl.id = j.place_id
left join public.job_totals t     on t.job_id = j.id;

-- ── 4. สรุปรายคัน ───────────────────────────────────────────
create view public.vehicle_summary with (security_invoker = true) as
select
  v.id,
  v.code,
  v.plate,
  v.brand_model,
  v.vehicle_type,
  v.note,
  v.mileage,
  v.is_active,
  count(j.id)                                     as job_count,
  count(j.id) filter (where s.is_closed is false) as open_job_count,
  coalesce(sum(t.grand_total), 0)                 as repair_cost,
  max(j.reported_on)                              as last_reported_on
from public.vehicles v
left join public.repair_jobs j    on j.vehicle_id = v.id
left join public.job_statuses s   on s.code = j.status
left join public.job_totals t     on t.job_id = j.id
group by v.id;

-- ── 5. จำนวนงานแยกตามสถานะ ──────────────────────────────────
create view public.job_status_counts with (security_invoker = true) as
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

-- ── 6. ค่าซ่อมรายเดือน ──────────────────────────────────────
create view public.monthly_repair_cost with (security_invoker = true) as
select
  date_trunc('month', j.reported_on)::date as month,
  count(*)                                 as job_count,
  coalesce(sum(t.grand_total), 0)          as total_cost
from public.repair_jobs j
left join public.job_totals t on t.job_id = j.id
group by 1
order by 1;

-- ── 7. ยอดรวมต่อใบสั่งซื้อ ──────────────────────────────────
create view public.pr_summary with (security_invoker = true) as
select
  pr.id,
  pr.code,
  pr.issued_on,
  count(p.id)                    as items_count,
  coalesce(sum(p.net_amount), 0) as amount,
  array_agg(distinct j.code order by j.code) as job_codes
from public.purchase_requests pr
left join public.job_parts p    on p.pr_id = pr.id
left join public.repair_jobs j  on j.id = p.job_id
group by pr.id;

-- ── 8. ฟังก์ชันค้นหา (สร้างใหม่หลัง jobs_list มีแล้ว) ─────────
create function public.search_jobs(q text default null, p_status text default null)
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

-- ── 9. คืนสิทธิ์ (หายไปพร้อม view เดิม) ──────────────────────
grant select on
  public.jobs_list,
  public.job_totals,
  public.vehicle_summary,
  public.job_status_counts,
  public.monthly_repair_cost,
  public.pr_summary
to anon, authenticated;

grant execute on function public.search_jobs(text, text) to anon, authenticated;

-- ── 10. ทิ้งฟังก์ชันและค่าตั้งอัตรา VAT ที่ไม่ใช้แล้ว ──────────
drop function if exists public.app_vat_rate();
delete from public.app_settings where key = 'vat_rate';
