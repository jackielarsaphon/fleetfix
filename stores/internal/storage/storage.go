// Package storage เก็บไฟล์รูปภาพ — มี 2 แบบให้เลือกผ่านค่าตั้ง
//
//	Supabase Storage : ใช้เมื่อกำหนด SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY
//	                   ไฟล์อยู่ที่เดียวกับที่หน้าเว็บบน GitHub Pages อ่าน
//	ดิสก์ในเครื่อง    : ใช้เมื่อไม่ได้กำหนดค่าข้างบน (ทำงานได้โดยไม่ต้องต่อเน็ต)
package storage

import (
	"context"
	"io"
	"mime"
	"path/filepath"
	"strings"
)

// Store คือที่เก็บไฟล์รูป — path เป็นแบบสัมพัทธ์ เช่น "<job_id>/before-abc123.png"
type Store interface {
	Put(ctx context.Context, path string, r io.Reader, contentType string) error
	Get(ctx context.Context, path string) (io.ReadCloser, string, error)
	Delete(ctx context.Context, path string) error
	// Kind คืนชื่อชนิดที่เก็บ ใช้เขียน log ตอนเริ่มเซิร์ฟเวอร์
	Kind() string
}

// contentTypeOf เดา content type จากนามสกุลไฟล์
func contentTypeOf(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".heic":
		return "image/heic"
	}
	if ct := mime.TypeByExtension(filepath.Ext(path)); ct != "" {
		return ct
	}
	return "application/octet-stream"
}
