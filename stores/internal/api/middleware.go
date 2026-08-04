package api

import (
	"log/slog"
	"net/http"
	"slices"
	"time"
)

type middleware func(http.Handler) http.Handler

// chain ครอบ handler ด้วย middleware โดยตัวแรกในลิสต์อยู่ชั้นนอกสุด
func chain(h http.Handler, mw ...middleware) http.Handler {
	for i := len(mw) - 1; i >= 0; i-- {
		h = mw[i](h)
	}
	return h
}

// recoverer กัน panic ใน handler ไม่ให้ล้มทั้งเซิร์ฟเวอร์
func recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("panic ใน handler", "method", r.Method, "path", r.URL.Path, "panic", rec)
				writeJSON(w, http.StatusInternalServerError, errorBody{Error: "เกิดข้อผิดพลาดภายในระบบ"})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// statusRecorder จำ status code ไว้เพื่อเขียน log
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"ms", time.Since(start).Milliseconds())
	})
}

// cors อนุญาต origin ตามที่ตั้งค่าไว้ และตอบ preflight ให้จบที่ middleware นี้
func cors(allowed []string) middleware {
	allowAll := slices.Contains(allowed, "*")
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && (allowAll || slices.Contains(allowed, origin)) {
				if allowAll {
					w.Header().Set("Access-Control-Allow-Origin", "*")
				} else {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Add("Vary", "Origin")
				}
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				w.Header().Set("Access-Control-Max-Age", "600")
			}
			// preflight ไม่ต้องเข้า mux (pattern ผูกกับ method จริงเท่านั้น)
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// timeout จำกัดเวลาต่อ 1 request
func timeout(d time.Duration) middleware {
	return func(next http.Handler) http.Handler {
		return http.TimeoutHandler(next, d, `{"error":"คำขอใช้เวลานานเกินกำหนด"}`)
	}
}
