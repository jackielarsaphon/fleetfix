package api

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"log/slog"
	"net/http"
	"path/filepath"
	"strings"

	"fleetfix/stores/internal/model"
	"fleetfix/stores/internal/store"
)

// นามสกุลที่ยอมรับ → content type ที่ส่งกลับตอนดึงรูป
var allowedImageExt = map[string]string{
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".webp": "image/webp",
	".heic": "image/heic",
}

// GET /api/jobs/{id}/photos
func (s *Server) listPhotos(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, r, err)
		return
	}
	photos, err := s.store.ListPhotos(r.Context(), id)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": len(photos), "photos": withURLs(photos)})
}

// POST /api/jobs/{id}/photos   (multipart/form-data: file, kind, caption)
func (s *Server) uploadPhoto(w http.ResponseWriter, r *http.Request) {
	jobID, err := pathID(r)
	if err != nil {
		writeError(w, r, err)
		return
	}

	// ตรวจว่าใบงานมีอยู่ก่อน เพื่อไม่ให้เหลือไฟล์กำพร้าในที่เก็บ
	if err := s.store.JobExists(r.Context(), jobID); err != nil {
		writeError(w, r, err)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, s.cfg.MaxPhotoBytes+1<<20)
	if err := r.ParseMultipartForm(s.cfg.MaxPhotoBytes); err != nil {
		writeError(w, r, badRequest("อ่านไฟล์ที่อัปโหลดไม่ได้ (%v)", err))
		return
	}
	defer func() { _ = r.MultipartForm.RemoveAll() }()

	kind := strings.TrimSpace(r.FormValue("kind"))
	if kind == "" {
		kind = "before"
	}
	if !store.ValidPhotoKind(kind) {
		writeError(w, r, badRequest("kind ต้องเป็น %s", strings.Join(store.PhotoKinds, " / ")))
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, r, badRequest("ต้องแนบไฟล์ในฟิลด์ file"))
		return
	}
	defer file.Close()

	if header.Size > s.cfg.MaxPhotoBytes {
		writeError(w, r, badRequest("ไฟล์ใหญ่เกิน %d MB", s.cfg.MaxPhotoBytes>>20))
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	contentType, ok := allowedImageExt[ext]
	if !ok {
		writeError(w, r, badRequest("รับเฉพาะไฟล์รูป %s", strings.Join(imageExts(), " / ")))
		return
	}

	// path เดียวกับที่หน้าเว็บใช้ตอนอัปตรงเข้า Supabase Storage
	path := jobID + "/" + kind + "-" + randomHex(8) + ext

	if err := s.photos.Put(r.Context(), path, io.LimitReader(file, s.cfg.MaxPhotoBytes), contentType); err != nil {
		writeError(w, r, err)
		return
	}

	photo, err := s.store.CreatePhoto(r.Context(), jobID, kind, path, strings.TrimSpace(r.FormValue("caption")))
	if err != nil {
		// บันทึกฐานข้อมูลไม่ผ่าน — ลบไฟล์ทิ้ง ไม่ให้เหลือไฟล์ที่ไม่มีใครอ้างถึง
		if rmErr := s.photos.Delete(r.Context(), path); rmErr != nil {
			slog.Warn("ลบไฟล์รูปที่ค้างไม่สำเร็จ", "path", path, "err", rmErr)
		}
		writeError(w, r, err)
		return
	}

	photo.URL = photoURL(photo.ID)
	w.Header().Set("Location", photo.URL)
	writeJSON(w, http.StatusCreated, photo)
}

// GET /api/photos/{id}  — ส่งตัวไฟล์รูปกลับ
func (s *Server) servePhoto(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, r, err)
		return
	}

	path, err := s.store.PhotoFile(r.Context(), id)
	if err != nil {
		writeError(w, r, err)
		return
	}

	body, contentType, err := s.photos.Get(r.Context(), path)
	if err != nil {
		writeError(w, r, err)
		return
	}
	defer body.Close()

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=3600")
	if _, err := io.Copy(w, body); err != nil {
		slog.Warn("ส่งไฟล์รูปไม่ครบ", "photo", id, "err", err)
	}
}

// DELETE /api/photos/{id}
func (s *Server) deletePhoto(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, r, err)
		return
	}

	path, err := s.store.DeletePhoto(r.Context(), id)
	if err != nil {
		writeError(w, r, err)
		return
	}

	if err := s.photos.Delete(r.Context(), path); err != nil {
		slog.Warn("ลบไฟล์รูปไม่สำเร็จ", "path", path, "err", err)
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── ตัวช่วย ─────────────────────────────────────────────────

func randomHex(n int) string {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand ไม่ควรพลาด แต่ถ้าพลาดก็ยังต้องได้ชื่อไฟล์ที่ใช้ได้
		return "fallback"
	}
	return hex.EncodeToString(buf)
}

func photoURL(id string) string { return "/api/photos/" + id }

func withURLs(photos []model.Photo) []model.Photo {
	for i := range photos {
		photos[i].URL = photoURL(photos[i].ID)
	}
	return photos
}

func imageExts() []string {
	out := make([]string, 0, len(allowedImageExt))
	for ext := range allowedImageExt {
		out = append(out, ext)
	}
	return out
}
