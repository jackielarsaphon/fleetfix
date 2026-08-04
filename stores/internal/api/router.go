// Package api คือชั้น HTTP: routing, แปลง JSON, แปลง error เป็น status code
package api

import (
	"net/http"

	"fleetfix/stores/internal/config"
	"fleetfix/stores/internal/store"
)

type Server struct {
	store *store.Store
	cfg   config.Config
}

// NewRouter ประกอบเส้นทางทั้งหมดของ API
//
//	GET    /api/health
//	GET    /api/jobs?status=&q=
//	POST   /api/jobs
//	GET    /api/jobs/{id}
//	POST   /api/jobs/{id}/advance
//	GET    /api/jobs/{id}/photos
//	POST   /api/jobs/{id}/photos   (multipart: file, kind, caption)
//	GET    /api/photos/{id}        (ตัวไฟล์รูป)
//	DELETE /api/photos/{id}
//	PATCH  /api/parts/{id}/pr
//	GET    /api/vehicles
//	POST   /api/vehicles
//	GET    /api/places?includeInactive=true
//	POST   /api/places
//	DELETE /api/places/{id}
//	GET    /api/dashboard
func NewRouter(st *store.Store, cfg config.Config) http.Handler {
	s := &Server{store: st, cfg: cfg}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", s.health)

	mux.HandleFunc("GET /api/jobs", s.listJobs)
	mux.HandleFunc("POST /api/jobs", s.createJob)
	mux.HandleFunc("GET /api/jobs/{id}", s.getJob)
	mux.HandleFunc("POST /api/jobs/{id}/advance", s.advanceJob)

	mux.HandleFunc("GET /api/jobs/{id}/photos", s.listPhotos)
	mux.HandleFunc("POST /api/jobs/{id}/photos", s.uploadPhoto)
	mux.HandleFunc("GET /api/photos/{id}", s.servePhoto)
	mux.HandleFunc("DELETE /api/photos/{id}", s.deletePhoto)

	mux.HandleFunc("PATCH /api/parts/{id}/pr", s.setPartPR)

	mux.HandleFunc("GET /api/vehicles", s.listVehicles)
	mux.HandleFunc("POST /api/vehicles", s.createVehicle)

	mux.HandleFunc("GET /api/places", s.listPlaces)
	mux.HandleFunc("POST /api/places", s.createPlace)
	mux.HandleFunc("DELETE /api/places/{id}", s.deactivatePlace)

	mux.HandleFunc("GET /api/dashboard", s.dashboard)

	return chain(mux,
		recoverer,
		requestLogger,
		cors(cfg.AllowedOrigins),
		timeout(cfg.RequestTimeout),
	)
}
