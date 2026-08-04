package store

import (
	"context"

	"fleetfix/stores/internal/model"
)

const placeSelect = `
select
  p.id::text,
  p.name,
  coalesce(p.kind, ''),
  coalesce(p.contact, ''),
  coalesce(p.phone, ''),
  coalesce(p.address, ''),
  (select count(*) from public.repair_jobs j where j.place_id = p.id)::int,
  p.is_active
from public.repair_places p`

func scanPlace(sc scanner) (model.Place, error) {
	var p model.Place
	err := sc.Scan(&p.ID, &p.Name, &p.Kind, &p.Contact, &p.Phone, &p.Address, &p.UsedBy, &p.IsActive)
	return p, err
}

// ListPlaces คืนสถานที่ซ่อม — includeInactive=true จะรวมที่เลิกใช้แล้วด้วย
func (s *Store) ListPlaces(ctx context.Context, includeInactive bool) ([]model.Place, error) {
	rows, err := s.pool.Query(ctx, placeSelect+` where ($1 or p.is_active) order by p.name`, includeInactive)
	if err != nil {
		return nil, classify(err)
	}
	defer rows.Close()

	list := make([]model.Place, 0, 8)
	for rows.Next() {
		p, err := scanPlace(rows)
		if err != nil {
			return nil, classify(err)
		}
		list = append(list, p)
	}
	return list, classify(rows.Err())
}

// CreatePlace เพิ่มสถานที่ซ่อมใหม่
func (s *Store) CreatePlace(ctx context.Context, in model.NewPlace) (model.Place, error) {
	var id string
	err := s.pool.QueryRow(ctx, `
		insert into public.repair_places (name, kind, contact, phone, address)
		values ($1, nullif($2, ''), nullif($3, ''), nullif($4, ''), nullif($5, ''))
		returning id::text`,
		in.Name, in.Kind, in.Contact, in.Phone, in.Address).Scan(&id)
	if err != nil {
		return model.Place{}, classify(err)
	}

	p, err := scanPlace(s.pool.QueryRow(ctx, placeSelect+` where p.id = $1::uuid`, id))
	if err != nil {
		return model.Place{}, classify(err)
	}
	return p, nil
}

// UpdatePlace แก้ชื่อและประเภทสถานที่ซ่อม (IsActive = nil คงค่าเดิม)
func (s *Store) UpdatePlace(ctx context.Context, id string, in model.EditPlace) (model.Place, error) {
	tag, err := s.pool.Exec(ctx, `
		update public.repair_places set
		  name      = $2,
		  kind      = nullif($3, ''),
		  is_active = coalesce($4, is_active)
		where id = $1::uuid`, id, in.Name, in.Kind, in.IsActive)
	if err != nil {
		return model.Place{}, classify(err)
	}
	if tag.RowsAffected() == 0 {
		return model.Place{}, ErrNotFound
	}

	p, err := scanPlace(s.pool.QueryRow(ctx, placeSelect+` where p.id = $1::uuid`, id))
	if err != nil {
		return model.Place{}, classify(err)
	}
	return p, nil
}

// DeactivatePlace เลิกใช้สถานที่ซ่อม (ไม่ลบจริง เพื่อไม่ให้ประวัติใบงานเก่าเสียอ้างอิง)
func (s *Store) DeactivatePlace(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx,
		`update public.repair_places set is_active = false where id = $1::uuid`, id)
	if err != nil {
		return classify(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
