package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	"fleetfix/stores/internal/apperr"
)

// ขนาด body สูงสุดที่ยอมรับต่อ 1 request
const maxBodyBytes = 1 << 20 // 1 MB

var errBadRequest = errors.New("คำขอไม่ถูกต้อง")

func badRequest(format string, args ...any) error {
	return fmt.Errorf("%w: %s", errBadRequest, fmt.Sprintf(format, args...))
}

type errorBody struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("เขียน response ไม่สำเร็จ", "err", err)
	}
}

// writeError แปลง error ของชั้น store/model เป็น HTTP status ที่เหมาะสม
func writeError(w http.ResponseWriter, r *http.Request, err error) {
	status := http.StatusInternalServerError
	switch {
	case errors.Is(err, errBadRequest):
		status = http.StatusBadRequest
	case errors.Is(err, apperr.ErrNotFound):
		status = http.StatusNotFound
	case errors.Is(err, apperr.ErrConflict), errors.Is(err, apperr.ErrJobClosed):
		status = http.StatusConflict
	}

	if status == http.StatusInternalServerError {
		slog.Error("จัดการคำขอไม่สำเร็จ", "method", r.Method, "path", r.URL.Path, "err", err)
		writeJSON(w, status, errorBody{Error: "เกิดข้อผิดพลาดภายในระบบ"})
		return
	}
	writeJSON(w, status, errorBody{Error: err.Error()})
}

func decodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(io.LimitReader(r.Body, maxBodyBytes))
	if err := dec.Decode(dst); err != nil {
		return badRequest("อ่าน JSON ไม่ได้ (%v)", err)
	}
	return nil
}

// pathID อ่าน {id} จาก path และตรวจว่าเป็น uuid
func pathID(r *http.Request) (string, error) {
	id := r.PathValue("id")
	if !validUUID(id) {
		return "", badRequest("id ต้องเป็น uuid")
	}
	return id, nil
}

// validUUID ตรวจรูปแบบ 8-4-4-4-12 ตัวอักษรฐานสิบหก
func validUUID(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if c != '-' {
				return false
			}
			continue
		}
		isHex := (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')
		if !isHex {
			return false
		}
	}
	return true
}
