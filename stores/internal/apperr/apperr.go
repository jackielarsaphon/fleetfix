// Package apperr คือ error กลางที่ทุกชั้นใช้ร่วมกัน
// ชั้น api แปลง error เหล่านี้เป็น HTTP status โดยไม่ต้องรู้ว่าเบื้องหลังเป็น Postgres หรือ Data API
package apperr

import "errors"

var (
	ErrNotFound  = errors.New("ไม่พบข้อมูล")
	ErrConflict  = errors.New("ข้อมูลซ้ำกับที่มีอยู่")
	ErrJobClosed = errors.New("ใบงานนี้ปิดแล้ว ไม่มีขั้นถัดไป")
)
