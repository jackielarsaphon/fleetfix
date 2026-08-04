package store

import (
	"context"
	"fmt"

	"fleetfix/stores/internal/model"
)

// PhotoKinds คือค่าที่ใช้ได้ของคอลัมน์ kind (ตรงกับ enum photo_kind ในฐานข้อมูล)
var PhotoKinds = []string{"before", "after", "report"}

func ValidPhotoKind(kind string) bool {
	for _, k := range PhotoKinds {
		if k == kind {
			return true
		}
	}
	return false
}

const photoSelect = `
select ph.id::text, ph.job_id::text, ph.kind::text,
       coalesce(ph.caption, ''), ph.sort_order,
       to_char(ph.created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF')
  from public.job_photos ph`

func scanPhoto(sc scanner) (model.Photo, error) {
	var p model.Photo
	err := sc.Scan(&p.ID, &p.JobID, &p.Kind, &p.Caption, &p.SortOrder, &p.CreatedAt)
	return p, err
}

// ListPhotos คืนรูปของใบงานหนึ่งใบ เรียงตามประเภทและลำดับ
func (s *Store) ListPhotos(ctx context.Context, jobID string) ([]model.Photo, error) {
	rows, err := s.pool.Query(ctx, photoSelect+`
		 where ph.job_id = $1::uuid
		 order by ph.kind, ph.sort_order, ph.created_at`, jobID)
	if err != nil {
		return nil, classify(err)
	}
	defer rows.Close()

	list := make([]model.Photo, 0, 8)
	for rows.Next() {
		p, err := scanPhoto(rows)
		if err != nil {
			return nil, classify(err)
		}
		list = append(list, p)
	}
	return list, classify(rows.Err())
}

// CreatePhoto บันทึกข้อมูลรูปหนึ่งรูป (ตัวไฟล์ถูกเขียนลงดิสก์โดยชั้น api แล้ว)
// sort_order ต่อท้ายรูปที่มีอยู่ของประเภทเดียวกัน
func (s *Store) CreatePhoto(ctx context.Context, jobID, kind, storagePath, caption string) (model.Photo, error) {
	if !ValidPhotoKind(kind) {
		return model.Photo{}, fmt.Errorf("ประเภทรูปไม่ถูกต้อง: %s", kind)
	}

	var id string
	err := s.pool.QueryRow(ctx, `
		insert into public.job_photos (job_id, kind, storage_path, caption, sort_order)
		select $1::uuid, $2::public.photo_kind, $3, nullif($4, ''),
		       coalesce(max(ph.sort_order) + 1, 0)
		  from public.job_photos ph
		 where ph.job_id = $1::uuid and ph.kind = $2::public.photo_kind
		returning id::text`, jobID, kind, storagePath, caption).Scan(&id)
	if err != nil {
		return model.Photo{}, classify(err)
	}

	p, err := scanPhoto(s.pool.QueryRow(ctx, photoSelect+` where ph.id = $1::uuid`, id))
	if err != nil {
		return model.Photo{}, classify(err)
	}
	return p, nil
}

// PhotoFile คืน path ของไฟล์บนดิสก์สำหรับส่งรูปกลับให้ผู้เรียก
func (s *Store) PhotoFile(ctx context.Context, photoID string) (string, error) {
	var path string
	err := s.pool.QueryRow(ctx,
		`select storage_path from public.job_photos where id = $1::uuid`, photoID).Scan(&path)
	if err != nil {
		return "", classify(err)
	}
	return path, nil
}

// DeletePhoto ลบแถวในฐานข้อมูลแล้วคืน path เพื่อให้ชั้น api ลบไฟล์ตาม
func (s *Store) DeletePhoto(ctx context.Context, photoID string) (string, error) {
	var path string
	err := s.pool.QueryRow(ctx,
		`delete from public.job_photos where id = $1::uuid returning storage_path`, photoID).Scan(&path)
	if err != nil {
		return "", classify(err)
	}
	return path, nil
}

// JobExists ใช้ตรวจก่อนรับไฟล์อัปโหลด เพื่อไม่ให้เขียนไฟล์ทิ้งไว้เปล่า ๆ
func (s *Store) JobExists(ctx context.Context, jobID string) error {
	var exists bool
	err := s.pool.QueryRow(ctx,
		`select true from public.repair_jobs where id = $1::uuid`, jobID).Scan(&exists)
	return classify(err)
}
