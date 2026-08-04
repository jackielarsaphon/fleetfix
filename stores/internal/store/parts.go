package store

import (
	"context"

	"fleetfix/stores/internal/model"
)

const partSelect = `
select p.id::text, p.line_no, p.name, coalesce(p.part_no, ''),
       p.qty::float8, p.unit, p.unit_price::float8, p.discount_pct::float8,
       p.gross_amount::float8, p.net_amount::float8, coalesce(pr.code, '')
  from public.job_parts p
  left join public.purchase_requests pr on pr.id = p.pr_id`

func scanPart(sc scanner) (model.JobPart, error) {
	var p model.JobPart
	err := sc.Scan(&p.ID, &p.LineNo, &p.Name, &p.PartNo, &p.Qty, &p.Unit,
		&p.UnitPrice, &p.DiscountPct, &p.GrossAmount, &p.NetAmount, &p.PRCode)
	return p, err
}

// CreatePart เพิ่มอะไหล่/ค่าแรงเข้าใบงาน — line_no ต่อท้ายรายการที่มีอยู่
func (s *Store) CreatePart(ctx context.Context, jobID string, in model.PartInput) (model.JobPart, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return model.JobPart{}, classify(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	prID, err := ensurePurchaseRequest(ctx, tx, in.PRCode)
	if err != nil {
		return model.JobPart{}, err
	}

	var id string
	err = tx.QueryRow(ctx, `
		insert into public.job_parts
			(job_id, line_no, name, part_no, qty, unit, unit_price, discount_pct, pr_id)
		select $1::uuid, coalesce(max(p.line_no), 0) + 1, $2, nullif($3, ''), $4, $5, $6, $7, $8::uuid
		  from public.job_parts p
		 where p.job_id = $1::uuid
		returning id::text`,
		jobID, in.Name, in.PartNo, in.Qty, in.Unit, in.UnitPrice, in.DiscountPct, prID).Scan(&id)
	if err != nil {
		return model.JobPart{}, classify(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return model.JobPart{}, classify(err)
	}
	return s.GetPart(ctx, id)
}

// UpdatePart แก้อะไหล่รายชิ้นทั้งชุด (รวมเลข PR)
func (s *Store) UpdatePart(ctx context.Context, partID string, in model.PartInput) (model.JobPart, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return model.JobPart{}, classify(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	prID, err := ensurePurchaseRequest(ctx, tx, in.PRCode)
	if err != nil {
		return model.JobPart{}, err
	}

	tag, err := tx.Exec(ctx, `
		update public.job_parts set
		  name         = $2,
		  part_no      = nullif($3, ''),
		  qty          = $4,
		  unit         = $5,
		  unit_price   = $6,
		  discount_pct = $7,
		  pr_id        = $8::uuid
		where id = $1::uuid`,
		partID, in.Name, in.PartNo, in.Qty, in.Unit, in.UnitPrice, in.DiscountPct, prID)
	if err != nil {
		return model.JobPart{}, classify(err)
	}
	if tag.RowsAffected() == 0 {
		return model.JobPart{}, ErrNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return model.JobPart{}, classify(err)
	}
	return s.GetPart(ctx, partID)
}

// DeletePart ลบอะไหล่รายชิ้น
func (s *Store) DeletePart(ctx context.Context, partID string) error {
	tag, err := s.pool.Exec(ctx, `delete from public.job_parts where id = $1::uuid`, partID)
	if err != nil {
		return classify(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetPart คืนอะไหล่รายชิ้น (ใช้ตอบกลับหลังเพิ่ม/แก้)
func (s *Store) GetPart(ctx context.Context, partID string) (model.JobPart, error) {
	p, err := scanPart(s.pool.QueryRow(ctx, partSelect+` where p.id = $1::uuid`, partID))
	if err != nil {
		return model.JobPart{}, classify(err)
	}
	return p, nil
}
