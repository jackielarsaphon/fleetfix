-- ============================================================
-- 0900 · เพิ่มจำนวนรถ (ไม่ซ้ำคัน) เข้าไปใน job_status_counts
--
-- แดชบอร์ดต้องบอกได้ว่าสถานะหนึ่ง ๆ มีรถกี่คัน ซึ่งไม่เท่ากับจำนวนใบงาน
-- เพราะรถคันเดียวมีหลายใบงานในสถานะเดียวกันได้
--
-- ต้อง drop แล้วสร้างใหม่ (เพิ่มคอลัมน์กลาง view ด้วย replace ไม่ได้)
-- และ grant สิทธิ์คืนเพราะสิทธิ์หายไปพร้อม view เดิม
-- ============================================================

drop view if exists public.job_status_counts;

create view public.job_status_counts with (security_invoker = true) as
select
  s.code,
  s.label_th,
  s.sort_order,
  count(j.id)                        as job_count,
  count(distinct j.vehicle_id)       as vehicle_count,
  coalesce(sum(t.grand_total), 0)    as total_cost
from public.job_statuses s
left join public.repair_jobs j on j.status = s.code
left join public.job_totals t  on t.job_id = j.id
group by s.code, s.label_th, s.sort_order;

comment on view public.job_status_counts is
  'จำนวนใบงาน จำนวนรถ (ไม่ซ้ำคัน) และค่าซ่อมรวม แยกตามสถานะ';

grant select on public.job_status_counts to anon, authenticated;
