package api

import (
	"net/http"
	"strings"

	"fleetfix/stores/internal/model"
)

// ── สุขภาพระบบ ──────────────────────────────────────────────

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.store.Ping(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "down",
			"error":  "เชื่อมต่อฐานข้อมูลไม่ได้",
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "database": "connected"})
}

// ── ใบงานซ่อม ───────────────────────────────────────────────

func (s *Server) listJobs(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	q := strings.TrimSpace(r.URL.Query().Get("q"))

	jobs, err := s.store.ListJobs(r.Context(), status, q)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": len(jobs), "jobs": jobs})
}

func (s *Server) getJob(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, r, err)
		return
	}
	job, err := s.store.GetJob(r.Context(), id)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, job)
}

func (s *Server) createJob(w http.ResponseWriter, r *http.Request) {
	var in model.NewJob
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, r, err)
		return
	}
	if err := in.Validate(); err != nil {
		writeError(w, r, badRequest("%v", err))
		return
	}
	job, err := s.store.CreateJob(r.Context(), in)
	if err != nil {
		writeError(w, r, err)
		return
	}
	w.Header().Set("Location", "/api/jobs/"+job.ID)
	writeJSON(w, http.StatusCreated, job)
}

func (s *Server) advanceJob(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, r, err)
		return
	}
	job, err := s.store.AdvanceJob(r.Context(), id)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, job)
}

func (s *Server) setPartPR(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, r, err)
		return
	}
	var in model.PartPR
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, r, err)
		return
	}
	if err := s.store.SetPartPR(r.Context(), id, strings.TrimSpace(in.PRCode)); err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "prCode": strings.TrimSpace(in.PRCode)})
}

// ── ทะเบียนรถ ───────────────────────────────────────────────

func (s *Server) listVehicles(w http.ResponseWriter, r *http.Request) {
	list, err := s.store.ListVehicles(r.Context())
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": len(list), "vehicles": list})
}

func (s *Server) createVehicle(w http.ResponseWriter, r *http.Request) {
	var in model.NewVehicle
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, r, err)
		return
	}
	if err := in.Validate(); err != nil {
		writeError(w, r, badRequest("%v", err))
		return
	}
	v, err := s.store.CreateVehicle(r.Context(), in)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, v)
}

// ── สถานที่ซ่อม ─────────────────────────────────────────────

func (s *Server) listPlaces(w http.ResponseWriter, r *http.Request) {
	includeInactive := r.URL.Query().Get("includeInactive") == "true"

	list, err := s.store.ListPlaces(r.Context(), includeInactive)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": len(list), "places": list})
}

func (s *Server) createPlace(w http.ResponseWriter, r *http.Request) {
	var in model.NewPlace
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, r, err)
		return
	}
	if err := in.Validate(); err != nil {
		writeError(w, r, badRequest("%v", err))
		return
	}
	p, err := s.store.CreatePlace(r.Context(), in)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (s *Server) deactivatePlace(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, r, err)
		return
	}
	if err := s.store.DeactivatePlace(r.Context(), id); err != nil {
		writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── แดชบอร์ด ────────────────────────────────────────────────

func (s *Server) dashboard(w http.ResponseWriter, r *http.Request) {
	d, err := s.store.Dashboard(r.Context())
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, d)
}
