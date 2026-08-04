package api

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"fleetfix/stores/internal/store"
)

func TestValidUUID(t *testing.T) {
	ok := []string{
		"cfabd633-4cc7-4db0-9d23-e91e65d87d5f",
		"CFABD633-4CC7-4DB0-9D23-E91E65D87D5F",
	}
	bad := []string{
		"",
		"1234",
		"cfabd633-4cc7-4db0-9d23-e91e65d87d5",  // สั้นไป 1 ตัว
		"cfabd6334cc74db09d23e91e65d87d5f0000", // ไม่มีขีด
		"zfabd633-4cc7-4db0-9d23-e91e65d87d5f", // z ไม่ใช่เลขฐานสิบหก
	}

	for _, s := range ok {
		if !validUUID(s) {
			t.Errorf("%q ควรผ่าน", s)
		}
	}
	for _, s := range bad {
		if validUUID(s) {
			t.Errorf("%q ไม่ควรผ่าน", s)
		}
	}
}

func TestWriteErrorStatus(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want int
	}{
		{"คำขอไม่ถูกต้อง", badRequest("ต้องระบุ code"), http.StatusBadRequest},
		{"ไม่พบข้อมูล", store.ErrNotFound, http.StatusNotFound},
		{"ข้อมูลซ้ำ", store.ErrConflict, http.StatusConflict},
		{"ปิดงานแล้ว", store.ErrJobClosed, http.StatusConflict},
		{"error อื่น", errors.New("boom"), http.StatusInternalServerError},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/api/jobs", nil)
			writeError(rec, req, c.err)
			if rec.Code != c.want {
				t.Errorf("ได้ %d ต้องการ %d", rec.Code, c.want)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json; charset=utf-8" {
				t.Errorf("Content-Type ไม่ถูก: %q", ct)
			}
		})
	}
}

func TestDecodeJSONRejectsGarbage(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/jobs", http.NoBody)
	var dst struct{ A string }
	if err := decodeJSON(req, &dst); !errors.Is(err, errBadRequest) {
		t.Errorf("body ว่างควรเป็น errBadRequest ได้ %v", err)
	}
}
