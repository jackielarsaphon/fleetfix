package store

import (
	"context"
	"fmt"

	"fleetfix/stores/internal/model"
)

const vehicleSelect = `
select
  v.id::text,
  v.code,
  coalesce(v.plate, ''),
  coalesce(v.brand_model, ''),
  coalesce(v.vehicle_type, ''),
  coalesce(v.note, ''),
  coalesce(v.mileage, 0),
  coalesce(v.job_count, 0)::int,
  coalesce(v.open_job_count, 0)::int,
  coalesce(v.repair_cost, 0)::float8,
  coalesce(to_char(v.last_reported_on, 'YYYY-MM-DD'), '')
from public.vehicle_summary v`

func scanVehicle(sc scanner) (model.Vehicle, error) {
	var v model.Vehicle
	err := sc.Scan(&v.ID, &v.Code, &v.Plate, &v.BrandModel, &v.VehicleType, &v.Note,
		&v.Mileage, &v.JobCount, &v.OpenJobCount, &v.RepairCost, &v.LastRepairOn)
	return v, err
}

func (s *Store) queryVehicles(ctx context.Context, sql string, args ...any) ([]model.Vehicle, error) {
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, classify(err)
	}
	defer rows.Close()

	list := make([]model.Vehicle, 0, 16)
	for rows.Next() {
		v, err := scanVehicle(rows)
		if err != nil {
			return nil, classify(err)
		}
		list = append(list, v)
	}
	return list, classify(rows.Err())
}

// ListVehicles คืนทะเบียนรถทั้งหมดพร้อมสรุปจำนวนครั้งและค่าซ่อมรวมต่อคัน
func (s *Store) ListVehicles(ctx context.Context) ([]model.Vehicle, error) {
	return s.queryVehicles(ctx, vehicleSelect+` where v.is_active order by v.code`)
}

// FrequentVehicles คืนรถที่ซ่อมบ่อยที่สุด (ใช้ในแดชบอร์ด)
func (s *Store) FrequentVehicles(ctx context.Context, limit int) ([]model.Vehicle, error) {
	if limit <= 0 {
		limit = 5
	}
	return s.queryVehicles(ctx,
		vehicleSelect+` order by v.job_count desc, v.repair_cost desc limit $1`, limit)
}

// GetVehicle คืนรถหนึ่งคันตามเบอร์รถ
func (s *Store) GetVehicle(ctx context.Context, code string) (model.Vehicle, error) {
	v, err := scanVehicle(s.pool.QueryRow(ctx, vehicleSelect+` where v.code = $1`, code))
	if err != nil {
		return model.Vehicle{}, classify(err)
	}
	return v, nil
}

// UpdateVehicle แก้ข้อมูลรถทั้งชุด (IsActive = nil คงค่าเดิม)
func (s *Store) UpdateVehicle(ctx context.Context, id string, in model.EditVehicle) (model.Vehicle, error) {
	var code string
	err := s.pool.QueryRow(ctx, `
		update public.vehicles set
		  code         = $2,
		  plate        = nullif($3, ''),
		  brand_model  = nullif($4, ''),
		  vehicle_type = nullif($5, ''),
		  owner        = nullif($6, ''),
		  note         = nullif($7, ''),
		  is_active    = coalesce($8, is_active)
		where id = $1::uuid
		returning code`,
		id, in.Code, in.Plate, in.BrandModel, in.VehicleType, in.Owner, in.Note, in.IsActive).Scan(&code)
	if err != nil {
		return model.Vehicle{}, classify(err)
	}
	return s.GetVehicle(ctx, code)
}

// DeleteVehicle ลบรถถาวร — ทำได้เฉพาะเมื่อไม่มีใบงานอ้างถึง
// (FK เป็น on delete restrict อยู่แล้ว แต่เช็คก่อนเพื่อบอกเหตุผลให้ชัด)
func (s *Store) DeleteVehicle(ctx context.Context, id string) error {
	var jobs int
	if err := s.pool.QueryRow(ctx,
		`select count(*) from public.repair_jobs where vehicle_id = $1::uuid`, id).Scan(&jobs); err != nil {
		return classify(err)
	}
	if jobs > 0 {
		return fmt.Errorf("%w: รถคันนี้มีใบงาน %d ใบอยู่ในระบบ ลบถาวรไม่ได้ — ใช้ \"เลิกใช้งาน\" แทนเพื่อเก็บประวัติซ่อมไว้",
			ErrConflict, jobs)
	}

	tag, err := s.pool.Exec(ctx, `delete from public.vehicles where id = $1::uuid`, id)
	if err != nil {
		return classify(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// CreateVehicle เพิ่มทะเบียนรถใหม่
func (s *Store) CreateVehicle(ctx context.Context, in model.NewVehicle) (model.Vehicle, error) {
	var code string
	err := s.pool.QueryRow(ctx, `
		insert into public.vehicles (code, plate, brand_model, vehicle_type, owner, note)
		values ($1, nullif($2, ''), nullif($3, ''), nullif($4, ''), nullif($5, ''), nullif($6, ''))
		returning code`,
		in.Code, in.Plate, in.BrandModel, in.VehicleType, in.Owner, in.Note).Scan(&code)
	if err != nil {
		return model.Vehicle{}, classify(err)
	}
	return s.GetVehicle(ctx, code)
}
