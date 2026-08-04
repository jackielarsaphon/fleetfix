package store

import (
	"context"

	"fleetfix/stores/internal/model"
)

// Dashboard รวมตัวเลขทั้งหมดที่หน้าภาพรวมต้องใช้ ในการเรียกครั้งเดียว
func (s *Store) Dashboard(ctx context.Context) (model.Dashboard, error) {
	var d model.Dashboard
	var err error

	if d.StatusCounts, err = s.StatusCounts(ctx); err != nil {
		return d, err
	}
	if d.Monthly, err = s.MonthlyCost(ctx); err != nil {
		return d, err
	}
	if d.Frequent, err = s.FrequentVehicles(ctx, 5); err != nil {
		return d, err
	}
	if d.OpenCost, err = s.OpenCost(ctx); err != nil {
		return d, err
	}
	if d.AvgRepairDays, d.AvgRepairDaysPrev, err = s.AvgRepairDays(ctx); err != nil {
		return d, err
	}
	return d, nil
}

// AvgRepairDays คืนเวลาซ่อมเฉลี่ย (วัน) ของงานที่ปิดในเดือนนี้ และเดือนก่อน
// นับจากวันที่แจ้งถึงวันที่ปิดงาน — คืน nil เมื่อเดือนนั้นไม่มีงานปิดเลย
func (s *Store) AvgRepairDays(ctx context.Context) (thisMonth, prevMonth *float64, err error) {
	err = s.pool.QueryRow(ctx, `
		select
		  avg(j.done_on - j.reported_on) filter (
		    where date_trunc('month', j.done_on) = date_trunc('month', current_date))::float8,
		  avg(j.done_on - j.reported_on) filter (
		    where date_trunc('month', j.done_on) = date_trunc('month', current_date - interval '1 month'))::float8
		  from public.repair_jobs j
		 where j.done_on is not null`).Scan(&thisMonth, &prevMonth)
	if err != nil {
		return nil, nil, classify(err)
	}
	return thisMonth, prevMonth, nil
}

// StatusCounts คืนจำนวนใบงานและค่าซ่อมรวมแยกตามสถานะ
func (s *Store) StatusCounts(ctx context.Context) ([]model.StatusCount, error) {
	rows, err := s.pool.Query(ctx, `
		select code, label_th, sort_order, job_count::int, total_cost::float8
		  from public.job_status_counts
		 order by sort_order`)
	if err != nil {
		return nil, classify(err)
	}
	defer rows.Close()

	list := make([]model.StatusCount, 0, 4)
	for rows.Next() {
		var c model.StatusCount
		if err := rows.Scan(&c.Code, &c.Label, &c.Order, &c.JobCount, &c.TotalCost); err != nil {
			return nil, classify(err)
		}
		list = append(list, c)
	}
	return list, classify(rows.Err())
}

// MonthlyCost คืนค่าซ่อมรายเดือนสำหรับกราฟแท่ง
func (s *Store) MonthlyCost(ctx context.Context) ([]model.MonthlyCost, error) {
	rows, err := s.pool.Query(ctx, `
		select to_char(month, 'YYYY-MM'), job_count::int, total_cost::float8
		  from public.monthly_repair_cost
		 order by month`)
	if err != nil {
		return nil, classify(err)
	}
	defer rows.Close()

	list := make([]model.MonthlyCost, 0, 12)
	for rows.Next() {
		var m model.MonthlyCost
		if err := rows.Scan(&m.Month, &m.JobCount, &m.TotalCost); err != nil {
			return nil, classify(err)
		}
		list = append(list, m)
	}
	return list, classify(rows.Err())
}

// OpenCost คือค่าซ่อมรวมของงานที่ยังไม่ปิด
func (s *Store) OpenCost(ctx context.Context) (float64, error) {
	var total float64
	err := s.pool.QueryRow(ctx, `
		select coalesce(sum(t.grand_total), 0)::float8
		  from public.repair_jobs j
		  join public.job_statuses s on s.code = j.status
		  left join public.job_totals t on t.job_id = j.id
		 where s.is_closed = false`).Scan(&total)
	if err != nil {
		return 0, classify(err)
	}
	return total, nil
}
