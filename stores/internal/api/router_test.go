package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"fleetfix/stores/internal/config"
)

// router ที่ยังไม่ต่อฐานข้อมูล — ใช้ทดสอบเฉพาะเส้นทางที่ไม่แตะ store
func testRouter() http.Handler {
	return NewRouter(nil, config.Config{
		AllowedOrigins: []string{"http://localhost:5173"},
		RequestTimeout: 5 * time.Second,
	})
}

func TestRoutingMatchesMethodAndPath(t *testing.T) {
	cases := []struct {
		name   string
		method string
		path   string
		want   int
	}{
		// id ไม่ใช่ uuid → handler ตอบ 400 ก่อนแตะฐานข้อมูล
		{"ดึงใบงาน id ผิดรูป", http.MethodGet, "/api/jobs/not-a-uuid", http.StatusBadRequest},
		{"เลื่อนสถานะ id ผิดรูป", http.MethodPost, "/api/jobs/not-a-uuid/advance", http.StatusBadRequest},
		{"แก้ PR id ผิดรูป", http.MethodPatch, "/api/parts/not-a-uuid/pr", http.StatusBadRequest},
		{"ลบสถานที่ id ผิดรูป", http.MethodDelete, "/api/places/not-a-uuid", http.StatusBadRequest},

		// method ไม่ตรงกับที่ลงทะเบียน
		{"ลบใบงานไม่รองรับ", http.MethodDelete, "/api/jobs/cfabd633-4cc7-4db0-9d23-e91e65d87d5f", http.StatusMethodNotAllowed},
		{"PUT รถไม่รองรับ", http.MethodPut, "/api/vehicles", http.StatusMethodNotAllowed},

		// path ที่ไม่มีอยู่
		{"path ไม่รู้จัก", http.MethodGet, "/api/unknown", http.StatusNotFound},
	}

	router := testRouter()
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, httptest.NewRequest(c.method, c.path, nil))
			if rec.Code != c.want {
				t.Errorf("%s %s → ได้ %d ต้องการ %d (body: %s)", c.method, c.path, rec.Code, c.want, rec.Body.String())
			}
		})
	}
}

func TestCORS(t *testing.T) {
	router := testRouter()

	t.Run("preflight จบที่ middleware", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/jobs", nil)
		req.Header.Set("Origin", "http://localhost:5173")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Errorf("ได้ %d ต้องการ 204", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
			t.Errorf("Allow-Origin = %q", got)
		}
		if got := rec.Header().Get("Access-Control-Allow-Methods"); got == "" {
			t.Error("ไม่ได้ตั้ง Allow-Methods")
		}
	})

	t.Run("origin ที่ไม่อนุญาตไม่ได้ header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/jobs/not-a-uuid", nil)
		req.Header.Set("Origin", "https://evil.example")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("ไม่ควรมี Allow-Origin แต่ได้ %q", got)
		}
	})
}

func TestRecovererCatchesNilStore(t *testing.T) {
	// /api/health เรียก store.Ping — store เป็น nil จึง panic
	// recoverer ต้องจับไว้และตอบ 500 ไม่ใช่ทำให้เซิร์ฟเวอร์ล้ม
	rec := httptest.NewRecorder()
	testRouter().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("ได้ %d ต้องการ 500", rec.Code)
	}
}
