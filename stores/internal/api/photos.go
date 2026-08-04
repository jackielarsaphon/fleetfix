package api

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"fleetfix/stores/internal/apperr"
	"fleetfix/stores/internal/model"
	"fleetfix/stores/internal/store"
)

// นามสกุลที่ยอมรับ → content type ที่จะส่งกลับตอนดึงรูป
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

	// ตรวจว่าใบงานมีอยู่ก่อน เพื่อไม่ให้เหลือไฟล์กำพร้าบนดิสก์
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
	if _, ok := allowedImageExt[ext]; !ok {
		writeError(w, r, badRequest("รับเฉพาะไฟล์รูป %s", strings.Join(imageExts(), " / ")))
		return
	}

	relPath, err := s.savePhotoFile(jobID, kind, ext, file)
	if err != nil {
		writeError(w, r, err)
		return
	}

	photo, err := s.store.CreatePhoto(r.Context(), jobID, kind, relPath, strings.TrimSpace(r.FormValue("caption")))
	if err != nil {
		// บันทึกฐานข้อมูลไม่ผ่าน — เก็บไฟล์ไว้ก็ไม่มีใครอ้างถึง ลบทิ้ง
		if rmErr := os.Remove(filepath.Join(s.cfg.PhotoDir, relPath)); rmErr != nil {
			slog.Warn("ลบไฟล์รูปที่ค้างไม่สำเร็จ", "path", relPath, "err", rmErr)
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

	relPath, err := s.store.PhotoFile(r.Context(), id)
	if err != nil {
		writeError(w, r, err)
		return
	}

	full, err := s.photoPath(relPath)
	if err != nil {
		writeError(w, r, err)
		return
	}

	f, err := os.Open(full)
	if err != nil {
		writeError(w, r, apperr.ErrNotFound)
		return
	}
	defer f.Close()

	if ct := allowedImageExt[strings.ToLower(filepath.Ext(full))]; ct != "" {
		w.Header().Set("Content-Type", ct)
	} else {
		w.Header().Set("Content-Type", mime.TypeByExtension(filepath.Ext(full)))
	}
	w.Header().Set("Cache-Control", "private, max-age=3600")

	info, err := f.Stat()
	if err != nil {
		writeError(w, r, err)
		return
	}
	http.ServeContent(w, r, filepath.Base(full), info.ModTime(), f)
}

// DELETE /api/photos/{id}
func (s *Server) deletePhoto(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, r, err)
		return
	}

	relPath, err := s.store.DeletePhoto(r.Context(), id)
	if err != nil {
		writeError(w, r, err)
		return
	}

	if full, err := s.photoPath(relPath); err == nil {
		if err := os.Remove(full); err != nil && !errors.Is(err, os.ErrNotExist) {
			slog.Warn("ลบไฟล์รูปไม่สำเร็จ", "path", relPath, "err", err)
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── ตัวช่วย ─────────────────────────────────────────────────

// savePhotoFile เขียนไฟล์ลง <PhotoDir>/<jobID>/<kind>-<random>.<ext> แล้วคืน path แบบสัมพัทธ์
func (s *Server) savePhotoFile(jobID, kind, ext string, src io.Reader) (string, error) {
	dir := filepath.Join(s.cfg.PhotoDir, jobID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	name := kind + "-" + hex.EncodeToString(buf) + ext

	dst, err := os.Create(filepath.Join(dir, name))
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, io.LimitReader(src, s.cfg.MaxPhotoBytes)); err != nil {
		_ = os.Remove(dst.Name())
		return "", err
	}
	return filepath.ToSlash(filepath.Join(jobID, name)), nil
}

// photoPath ประกอบ path จริงและกันการหลุดออกนอกโฟลเดอร์รูป (path traversal)
func (s *Server) photoPath(relPath string) (string, error) {
	root, err := filepath.Abs(s.cfg.PhotoDir)
	if err != nil {
		return "", err
	}
	full, err := filepath.Abs(filepath.Join(root, filepath.FromSlash(relPath)))
	if err != nil {
		return "", err
	}
	if full != root && !strings.HasPrefix(full, root+string(os.PathSeparator)) {
		return "", apperr.ErrNotFound
	}
	return full, nil
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
