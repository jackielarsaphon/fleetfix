package store

import (
	"context"
	"errors"
	"fmt"

	"fleetfix/stores/internal/model"

	"github.com/jackc/pgx/v5"
)

// อ่านจาก view jobs_list ที่รวมยอดเงิน สีชิป จำนวนรูป และอายุงานมาให้แล้ว
const jobSelect = `
select
  j.id::text,
  j.code,
  j.status,
  j.status_label,
  j.status_order,
  j.is_closed,
  coalesce(j.next_action_label, ''),
  j.chip_fg,
  j.chip_bg,
  j.dot_color,
  j.symptom,
  coalesce(j.root_cause, ''),
  coalesce(j.mileage, 0),
  coalesce(to_char(j.reported_on, 'YYYY-MM-DD'), ''),
  coalesce(to_char(j.break_on, 'YYYY-MM-DD'), ''),
  coalesce(to_char(j.done_on, 'YYYY-MM-DD'), ''),
  coalesce(j.reporter, ''),
  coalesce(j.note, ''),
  j.vehicle_id::text,
  j.vehicle_code,
  coalesce(j.brand_model, ''),
  coalesce(j.plate, ''),
  coalesce(j.place_name, ''),
  coalesce(j.technicians, ''),
  coalesce(j.pr_codes, '{}'),
  coalesce(j.photo_count, 0)::int,
  coalesce(j.parts_count, 0)::int,
  coalesce(j.subtotal, 0)::float8,
  coalesce(j.discount_total, 0)::float8,
  coalesce(j.grand_total, 0)::float8,
  j.age_days
from public.jobs_list j`

func scanJob(sc scanner) (model.Job, error) {
	var j model.Job
	err := sc.Scan(
		&j.ID, &j.Code, &j.Status, &j.StatusLabel, &j.StatusOrder, &j.IsClosed, &j.NextActionLabel,
		&j.ChipFg, &j.ChipBg, &j.DotColor,
		&j.Symptom, &j.RootCause, &j.Mileage,
		&j.ReportedOn, &j.BreakOn, &j.DoneOn,
		&j.Reporter, &j.Note,
		&j.VehicleID, &j.VehicleCode, &j.BrandModel, &j.Plate, &j.PlaceName,
		&j.Technicians, &j.PRCodes,
		&j.PhotoCount, &j.PartsCount,
		&j.Subtotal, &j.DiscountTotal, &j.GrandTotal,
		&j.AgeDays,
	)
	return j, err
}

// ListJobs คืนรายการใบงาน กรองด้วยสถานะ (รหัส เช่น waiting_parts) และคำค้น
// คำค้นครอบ: เบอร์รถ / อาการ / เลขที่ใบงาน / อาการหลัก / ชื่อช่าง / เลข PR / ชื่อและรหัสอะไหล่
func (s *Store) ListJobs(ctx context.Context, status, q string) ([]model.Job, error) {
	sql := jobSelect + `
 where ($1 = '' or j.status = $1)
   and ($2 = ''
        or j.vehicle_code ilike '%' || $2 || '%'
        or j.symptom ilike '%' || $2 || '%'
        or j.code ilike '%' || $2 || '%'
        or coalesce(j.root_cause, '') ilike '%' || $2 || '%'
        or coalesce(j.technicians, '') ilike '%' || $2 || '%'
        or exists (
             select 1 from unnest(coalesce(j.pr_codes, '{}')) c
              where c ilike '%' || $2 || '%')
        or exists (
             select 1 from public.job_parts p
              where p.job_id = j.id
                and (p.name ilike '%' || $2 || '%'
                     or coalesce(p.part_no, '') ilike '%' || $2 || '%')))
 order by j.reported_on desc, j.code desc`

	rows, err := s.pool.Query(ctx, sql, status, q)
	if err != nil {
		return nil, classify(err)
	}
	defer rows.Close()

	jobs := make([]model.Job, 0, 32)
	for rows.Next() {
		j, err := scanJob(rows)
		if err != nil {
			return nil, classify(err)
		}
		jobs = append(jobs, j)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, classify(err)
	}

	// แนบอะไหล่มาด้วยในคำสั่งเดียว (ไม่ยิงต่อใบงาน) เพื่อให้ผู้เรียกไม่ต้องดึงซ้ำ
	if err := s.attachParts(ctx, jobs); err != nil {
		return nil, err
	}
	return jobs, nil
}

// attachParts ดึงอะไหล่ของใบงานทั้งชุดด้วย query เดียวแล้วแจกเข้าแต่ละใบ
func (s *Store) attachParts(ctx context.Context, jobs []model.Job) error {
	if len(jobs) == 0 {
		return nil
	}

	ids := make([]string, len(jobs))
	for i, j := range jobs {
		ids[i] = j.ID
	}

	rows, err := s.pool.Query(ctx, `
		select p.job_id::text, p.id::text, p.line_no, p.name, coalesce(p.part_no, ''),
		       p.qty::float8, p.unit, p.unit_price::float8, p.discount_pct::float8,
		       p.gross_amount::float8, p.net_amount::float8, coalesce(pr.code, '')
		  from public.job_parts p
		  left join public.purchase_requests pr on pr.id = p.pr_id
		 where p.job_id = any($1::uuid[])
		 order by p.job_id, p.line_no`, ids)
	if err != nil {
		return classify(err)
	}
	defer rows.Close()

	byJob := make(map[string][]model.JobPart, len(jobs))
	for rows.Next() {
		var jobID string
		var p model.JobPart
		if err := rows.Scan(&jobID, &p.ID, &p.LineNo, &p.Name, &p.PartNo, &p.Qty, &p.Unit,
			&p.UnitPrice, &p.DiscountPct, &p.GrossAmount, &p.NetAmount, &p.PRCode); err != nil {
			return classify(err)
		}
		byJob[jobID] = append(byJob[jobID], p)
	}
	if err := rows.Err(); err != nil {
		return classify(err)
	}

	for i := range jobs {
		jobs[i].Parts = byJob[jobs[i].ID]
	}
	return nil
}

// GetJob คืนใบงานหนึ่งใบพร้อมรายการอะไหล่และไทม์ไลน์
func (s *Store) GetJob(ctx context.Context, id string) (model.Job, error) {
	job, err := scanJob(s.pool.QueryRow(ctx, jobSelect+` where j.id = $1::uuid`, id))
	if err != nil {
		return model.Job{}, classify(err)
	}

	if job.Parts, err = s.jobParts(ctx, id); err != nil {
		return model.Job{}, err
	}
	if job.Timeline, err = s.jobTimeline(ctx, id); err != nil {
		return model.Job{}, err
	}
	return job, nil
}

func (s *Store) jobParts(ctx context.Context, jobID string) ([]model.JobPart, error) {
	rows, err := s.pool.Query(ctx, `
		select p.id::text, p.line_no, p.name, coalesce(p.part_no, ''),
		       p.qty::float8, p.unit, p.unit_price::float8, p.discount_pct::float8,
		       p.gross_amount::float8, p.net_amount::float8, coalesce(pr.code, '')
		  from public.job_parts p
		  left join public.purchase_requests pr on pr.id = p.pr_id
		 where p.job_id = $1::uuid
		 order by p.line_no`, jobID)
	if err != nil {
		return nil, classify(err)
	}
	defer rows.Close()

	parts := make([]model.JobPart, 0, 8)
	for rows.Next() {
		var p model.JobPart
		if err := rows.Scan(&p.ID, &p.LineNo, &p.Name, &p.PartNo, &p.Qty, &p.Unit,
			&p.UnitPrice, &p.DiscountPct, &p.GrossAmount, &p.NetAmount, &p.PRCode); err != nil {
			return nil, classify(err)
		}
		parts = append(parts, p)
	}
	return parts, classify(rows.Err())
}

func (s *Store) jobTimeline(ctx context.Context, jobID string) ([]model.StatusEvent, error) {
	rows, err := s.pool.Query(ctx, `
		select coalesce(e.from_status, ''), e.to_status, s.label_th,
		       coalesce(e.note, ''), coalesce(e.actor, ''),
		       to_char(e.created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF')
		  from public.job_status_events e
		  join public.job_statuses s on s.code = e.to_status
		 where e.job_id = $1::uuid
		 order by e.created_at, e.id`, jobID)
	if err != nil {
		return nil, classify(err)
	}
	defer rows.Close()

	events := make([]model.StatusEvent, 0, 4)
	for rows.Next() {
		var e model.StatusEvent
		if err := rows.Scan(&e.FromStatus, &e.ToStatus, &e.Label, &e.Note, &e.Actor, &e.CreatedAt); err != nil {
			return nil, classify(err)
		}
		events = append(events, e)
	}
	return events, classify(rows.Err())
}

// CreateJob สร้างใบงาน อะไหล่ ช่าง และใบสั่งซื้อ ใน transaction เดียว
// ถ้าขั้นใดล้มเหลว จะไม่มีอะไรถูกบันทึกเลย
func (s *Store) CreateJob(ctx context.Context, in model.NewJob) (model.Job, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return model.Job{}, classify(err)
	}
	defer func() { _ = tx.Rollback(ctx) }() // ไม่มีผลถ้า commit ไปแล้ว

	var vehicleID string
	err = tx.QueryRow(ctx, `select id::text from public.vehicles where code = $1`, in.VehicleCode).Scan(&vehicleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.Job{}, fmt.Errorf("%w: ไม่พบเบอร์รถ %s", ErrNotFound, in.VehicleCode)
	}
	if err != nil {
		return model.Job{}, classify(err)
	}

	// สถานที่ซ่อมไม่บังคับ — ถ้าไม่พบชื่อก็ปล่อยว่างไว้
	var placeID *string
	if in.PlaceName != "" {
		var id string
		switch err := tx.QueryRow(ctx,
			`select id::text from public.repair_places where name = $1`, in.PlaceName).Scan(&id); {
		case err == nil:
			placeID = &id
		case errors.Is(err, pgx.ErrNoRows):
			// ข้ามไป
		default:
			return model.Job{}, classify(err)
		}
	}

	var jobID string
	err = tx.QueryRow(ctx, `
		insert into public.repair_jobs
			(vehicle_id, place_id, symptom, mileage, break_on, reporter, note, created_by)
		values
			($1::uuid, $2::uuid, $3, $4, nullif($5, '')::date, nullif($6, ''), nullif($7, ''), nullif($8, ''))
		returning id::text`,
		vehicleID, placeID, in.Symptom, in.Mileage, in.BreakOn, in.Reporter, in.Note, in.CreatedBy).Scan(&jobID)
	if err != nil {
		return model.Job{}, classify(err)
	}

	for i, p := range in.Parts {
		prID, err := ensurePurchaseRequest(ctx, tx, p.PRCode)
		if err != nil {
			return model.Job{}, err
		}
		if _, err := tx.Exec(ctx, `
			insert into public.job_parts
				(job_id, line_no, name, part_no, qty, unit, unit_price, discount_pct, pr_id)
			values
				($1::uuid, $2, $3, nullif($4, ''), $5, $6, $7, $8, $9::uuid)`,
			jobID, i+1, p.Name, p.PartNo, p.Qty, p.Unit, p.UnitPrice, p.DiscountPct, prID); err != nil {
			return model.Job{}, classify(err)
		}
	}

	if len(in.Technicians) > 0 {
		if _, err := tx.Exec(ctx, `
			insert into public.technicians (name)
			select unnest($1::text[])
			on conflict (name) do nothing`, in.Technicians); err != nil {
			return model.Job{}, classify(err)
		}
		if _, err := tx.Exec(ctx, `
			insert into public.job_technicians (job_id, technician_id)
			select $1::uuid, t.id
			  from public.technicians t
			 where t.name = any($2::text[])
			on conflict do nothing`, jobID, in.Technicians); err != nil {
			return model.Job{}, classify(err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return model.Job{}, classify(err)
	}
	return s.GetJob(ctx, jobID)
}

// UpdateJob แก้ข้อมูลใบงานทั้งชุด รวมถึงรายชื่อช่าง (แทนที่ชุดเดิม) ใน transaction เดียว
func (s *Store) UpdateJob(ctx context.Context, id string, in model.EditJob) (model.Job, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return model.Job{}, classify(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var vehicleID string
	err = tx.QueryRow(ctx, `select id::text from public.vehicles where code = $1`, in.VehicleCode).Scan(&vehicleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.Job{}, fmt.Errorf("%w: ไม่พบเบอร์รถ %s", ErrNotFound, in.VehicleCode)
	}
	if err != nil {
		return model.Job{}, classify(err)
	}

	var placeID *string
	if in.PlaceName != "" {
		var pid string
		switch err := tx.QueryRow(ctx,
			`select id::text from public.repair_places where name = $1`, in.PlaceName).Scan(&pid); {
		case err == nil:
			placeID = &pid
		case errors.Is(err, pgx.ErrNoRows):
			// ไม่พบชื่อสถานที่ — ปล่อยว่างไว้
		default:
			return model.Job{}, classify(err)
		}
	}

	// status ว่าง = คงสถานะเดิม · trigger จัดการวันที่ปิดงานและไทม์ไลน์ให้เอง
	tag, err := tx.Exec(ctx, `
		update public.repair_jobs set
		  vehicle_id = $2::uuid,
		  place_id   = $3::uuid,
		  symptom    = $4,
		  root_cause = nullif($5, ''),
		  status     = coalesce(nullif($6, ''), status),
		  mileage    = $7,
		  break_on   = nullif($8, '')::date,
		  done_on    = nullif($9, '')::date,
		  reporter   = nullif($10, ''),
		  note       = nullif($11, '')
		where id = $1::uuid`,
		id, vehicleID, placeID, in.Symptom, in.RootCause, in.Status, in.Mileage,
		in.BreakOn, in.DoneOn, in.Reporter, in.Note)
	if err != nil {
		return model.Job{}, classify(err)
	}
	if tag.RowsAffected() == 0 {
		return model.Job{}, ErrNotFound
	}

	// แทนที่รายชื่อช่างทั้งชุด
	if _, err := tx.Exec(ctx, `delete from public.job_technicians where job_id = $1::uuid`, id); err != nil {
		return model.Job{}, classify(err)
	}
	if len(in.Technicians) > 0 {
		if _, err := tx.Exec(ctx, `
			insert into public.technicians (name)
			select unnest($1::text[])
			on conflict (name) do nothing`, in.Technicians); err != nil {
			return model.Job{}, classify(err)
		}
		if _, err := tx.Exec(ctx, `
			insert into public.job_technicians (job_id, technician_id)
			select $1::uuid, t.id
			  from public.technicians t
			 where t.name = any($2::text[])
			on conflict do nothing`, id, in.Technicians); err != nil {
			return model.Job{}, classify(err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return model.Job{}, classify(err)
	}
	return s.GetJob(ctx, id)
}

// DeleteJob ลบใบงานถาวร — อะไหล่ ไทม์ไลน์ และแถวรูปถูกลบตามด้วย cascade
// คืน path ของไฟล์รูปที่ต้องไปลบในที่เก็บไฟล์ (ฐานข้อมูลลบไฟล์เองไม่ได้)
func (s *Store) DeleteJob(ctx context.Context, id string) ([]string, error) {
	rows, err := s.pool.Query(ctx,
		`select storage_path from public.job_photos where job_id = $1::uuid`, id)
	if err != nil {
		return nil, classify(err)
	}
	paths := make([]string, 0, 8)
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			rows.Close()
			return nil, classify(err)
		}
		paths = append(paths, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, classify(err)
	}

	tag, err := s.pool.Exec(ctx, `delete from public.repair_jobs where id = $1::uuid`, id)
	if err != nil {
		return nil, classify(err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return paths, nil
}

// AdvanceJob เลื่อนสถานะไปขั้นถัดไปตามผังใน job_statuses
// trigger ฝั่งฐานข้อมูลจะลงวันที่ปิดงานและบันทึกไทม์ไลน์ให้เอง
func (s *Store) AdvanceJob(ctx context.Context, id string) (model.Job, error) {
	var next string
	err := s.pool.QueryRow(ctx, `
		update public.repair_jobs j
		   set status = s.next_code
		  from public.job_statuses s
		 where s.code = j.status
		   and j.id = $1::uuid
		   and s.next_code is not null
		   and s.next_code <> j.status
		returning j.status`, id).Scan(&next)

	if errors.Is(err, pgx.ErrNoRows) {
		// ไม่มีแถวถูกอัปเดต — แยกให้ออกว่าไม่พบใบงาน หรือปิดงานไปแล้ว
		var current string
		if e := s.pool.QueryRow(ctx,
			`select status from public.repair_jobs where id = $1::uuid`, id).Scan(&current); e != nil {
			return model.Job{}, classify(e)
		}
		return model.Job{}, ErrJobClosed
	}
	if err != nil {
		return model.Job{}, classify(err)
	}
	return s.GetJob(ctx, id)
}

// SetPartPR ผูก (หรือถอด) เลข PR ของอะไหล่รายชิ้น — ส่งเลขว่างเพื่อถอด
func (s *Store) SetPartPR(ctx context.Context, partID, prCode string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return classify(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	prID, err := ensurePurchaseRequest(ctx, tx, prCode)
	if err != nil {
		return err
	}

	tag, err := tx.Exec(ctx,
		`update public.job_parts set pr_id = $2::uuid where id = $1::uuid`, partID, prID)
	if err != nil {
		return classify(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return classify(tx.Commit(ctx))
}
