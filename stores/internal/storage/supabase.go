package storage

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Supabase เก็บไฟล์ใน Supabase Storage ผ่าน HTTP API
//
// ใช้ publishable key ได้เลย ไม่ต้องใช้ secret key เพราะ policy ของ bucket
// (migration 0600/0700) อนุญาตให้ role anon อ่าน-เขียน-ลบ ได้อยู่แล้ว
type Supabase struct {
	baseURL string
	key     string
	bucket  string
	hc      *http.Client
}

func NewSupabase(projectURL, key, bucket string) *Supabase {
	return &Supabase{
		baseURL: strings.TrimRight(projectURL, "/") + "/storage/v1/object",
		key:     key,
		bucket:  bucket,
		hc:      &http.Client{Timeout: 60 * time.Second},
	}
}

func (s *Supabase) Kind() string { return "Supabase Storage (bucket " + s.bucket + ")" }

func (s *Supabase) objectURL(path string) string {
	// เข้ารหัสแต่ละส่วนของ path แยกกัน เพื่อไม่ให้ / ถูกแปลง
	parts := strings.Split(path, "/")
	for i, p := range parts {
		parts[i] = url.PathEscape(p)
	}
	return s.baseURL + "/" + s.bucket + "/" + strings.Join(parts, "/")
}

func (s *Supabase) newRequest(ctx context.Context, method, path string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, s.objectURL(path), body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", s.key)
	req.Header.Set("Authorization", "Bearer "+s.key)
	return req, nil
}

func (s *Supabase) Put(ctx context.Context, path string, r io.Reader, contentType string) error {
	req, err := s.newRequest(ctx, http.MethodPost, path, r)
	if err != nil {
		return err
	}
	if contentType == "" {
		contentType = contentTypeOf(path)
	}
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-upsert", "true") // เขียนทับได้ ไม่ต้องลบก่อน

	res, err := s.hc.Do(req)
	if err != nil {
		return fmt.Errorf("อัปโหลดไป Supabase Storage ไม่สำเร็จ: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode >= 300 {
		msg, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		return fmt.Errorf("Supabase Storage ตอบ %d: %s", res.StatusCode, strings.TrimSpace(string(msg)))
	}
	return nil
}

func (s *Supabase) Get(ctx context.Context, path string) (io.ReadCloser, string, error) {
	req, err := s.newRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, "", err
	}

	res, err := s.hc.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("ดึงไฟล์จาก Supabase Storage ไม่สำเร็จ: %w", err)
	}
	if res.StatusCode >= 300 {
		msg, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		res.Body.Close()
		return nil, "", fmt.Errorf("Supabase Storage ตอบ %d: %s", res.StatusCode, strings.TrimSpace(string(msg)))
	}

	ct := res.Header.Get("Content-Type")
	if ct == "" {
		ct = contentTypeOf(path)
	}
	return res.Body, ct, nil
}

func (s *Supabase) Delete(ctx context.Context, path string) error {
	req, err := s.newRequest(ctx, http.MethodDelete, path, nil)
	if err != nil {
		return err
	}

	res, err := s.hc.Do(req)
	if err != nil {
		return fmt.Errorf("ลบไฟล์ใน Supabase Storage ไม่สำเร็จ: %w", err)
	}
	defer res.Body.Close()

	// 404 = ไฟล์ไม่อยู่แล้ว ถือว่าลบสำเร็จ
	if res.StatusCode >= 300 && res.StatusCode != http.StatusNotFound {
		msg, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		return fmt.Errorf("Supabase Storage ตอบ %d: %s", res.StatusCode, strings.TrimSpace(string(msg)))
	}
	return nil
}
