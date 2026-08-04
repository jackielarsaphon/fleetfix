// Package config อ่านค่าตั้งจาก environment (และไฟล์ .env ถ้ามี)
package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Config struct {
	// DatabaseURL คือ connection string ของ Postgres บน Supabase
	// เอาได้จาก Dashboard → Project Settings → Database → Connection string (URI)
	DatabaseURL string

	// Addr คือ host:port ที่ API จะ listen
	Addr string

	// AllowedOrigins คือ origin ที่อนุญาตให้เรียกข้าม origin ได้ ("*" = ทุกที่)
	AllowedOrigins []string

	// RequestTimeout คือเวลาสูงสุดต่อ 1 request
	RequestTimeout time.Duration

	// PhotoDir คือโฟลเดอร์เก็บไฟล์รูปที่อัปโหลดเข้ามา
	// ฐานข้อมูลเก็บแค่ path ไม่ได้เก็บตัวไฟล์
	PhotoDir string

	// MaxPhotoBytes คือขนาดไฟล์รูปสูงสุดต่อ 1 รูป
	MaxPhotoBytes int64
}

// Load อ่านค่าตั้ง โดยลองโหลดไฟล์ .env ในโฟลเดอร์ปัจจุบันก่อน
func Load() (Config, error) {
	loadDotEnv(".env")

	cfg := Config{
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		Addr:           envOr("ADDR", ":8080"),
		AllowedOrigins: splitAndTrim(envOr("ALLOWED_ORIGINS", "http://localhost:5173")),
		RequestTimeout: 30 * time.Second, // เผื่อเวลาอัปโหลดรูป
		PhotoDir:       envOr("PHOTO_DIR", filepath.Join("data", "photos")),
		MaxPhotoBytes:  10 << 20, // 10 MB
	}

	if cfg.DatabaseURL == "" {
		return cfg, fmt.Errorf("ไม่พบ DATABASE_URL — คัดลอก .env.example เป็น .env แล้วใส่ connection string ของ Supabase")
	}
	if strings.Contains(cfg.DatabaseURL, "[YOUR-PASSWORD]") {
		return cfg, fmt.Errorf("DATABASE_URL ยังเป็นค่าตัวอย่าง — แทน [YOUR-PASSWORD] ในไฟล์ .env ด้วยรหัสผ่านฐานข้อมูลจริง " +
			"(Supabase Dashboard → Project Settings → Database)")
	}
	return cfg, nil
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func splitAndTrim(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// loadDotEnv อ่านไฟล์รูปแบบ KEY=VALUE ทีละบรรทัด
// ค่าที่ตั้งไว้ใน environment จริงมีความสำคัญกว่าไฟล์ .env
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.Trim(strings.TrimSpace(val), `"'`)
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, val)
		}
	}
}
