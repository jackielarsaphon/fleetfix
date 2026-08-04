package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadRequiresRealDatabaseURL(t *testing.T) {
	t.Run("ไม่ได้ตั้ง DATABASE_URL", func(t *testing.T) {
		t.Chdir(t.TempDir()) // ไม่ให้เจอ .env ของโปรเจกต์จริง
		t.Setenv("DATABASE_URL", "")

		if _, err := Load(); err == nil || !strings.Contains(err.Error(), "ไม่พบ DATABASE_URL") {
			t.Errorf("ควรบอกว่าไม่พบ DATABASE_URL ได้ %v", err)
		}
	})

	t.Run("ยังเป็นค่าตัวอย่าง", func(t *testing.T) {
		t.Chdir(t.TempDir())
		t.Setenv("DATABASE_URL", "postgresql://postgres:[YOUR-PASSWORD]@db.example.supabase.com:5432/postgres")

		if _, err := Load(); err == nil || !strings.Contains(err.Error(), "ค่าตัวอย่าง") {
			t.Errorf("ควรบอกว่ายังเป็นค่าตัวอย่าง ได้ %v", err)
		}
	})

	t.Run("ค่าครบ ใช้ค่าเริ่มต้นของ ADDR", func(t *testing.T) {
		t.Chdir(t.TempDir())
		t.Setenv("DATABASE_URL", "postgresql://u:p@localhost:5432/db")
		t.Setenv("ADDR", "")
		t.Setenv("ALLOWED_ORIGINS", "")

		cfg, err := Load()
		if err != nil {
			t.Fatalf("ไม่ควร error: %v", err)
		}
		if cfg.Addr != ":8080" {
			t.Errorf("ADDR เริ่มต้นควรเป็น :8080 ได้ %q", cfg.Addr)
		}
		if len(cfg.AllowedOrigins) != 1 || cfg.AllowedOrigins[0] != "http://localhost:5173" {
			t.Errorf("origin เริ่มต้นไม่ถูก: %v", cfg.AllowedOrigins)
		}
	})
}

func TestLoadDotEnv(t *testing.T) {
	dir := t.TempDir()
	content := "# comment\n\nDATABASE_URL=\"postgresql://u:p@localhost:5432/db\"\nADDR=:9999\nALLOWED_ORIGINS=http://a,http://b\n"
	if err := os.WriteFile(filepath.Join(dir, ".env"), []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Chdir(dir)

	// ล้างค่าใน environment ให้ไฟล์ .env เป็นตัวกำหนด
	t.Setenv("DATABASE_URL", "")
	t.Setenv("ADDR", "")
	t.Setenv("ALLOWED_ORIGINS", "")
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("ADDR")
	os.Unsetenv("ALLOWED_ORIGINS")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("ไม่ควร error: %v", err)
	}
	if cfg.Addr != ":9999" {
		t.Errorf("ADDR = %q ต้องการ :9999", cfg.Addr)
	}
	if !strings.HasPrefix(cfg.DatabaseURL, "postgresql://") {
		t.Errorf("ไม่ได้ถอดเครื่องหมายคำพูด: %q", cfg.DatabaseURL)
	}
	if len(cfg.AllowedOrigins) != 2 {
		t.Errorf("ควรได้ 2 origin ได้ %v", cfg.AllowedOrigins)
	}
}
