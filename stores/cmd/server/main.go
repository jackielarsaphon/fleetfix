// Command server คือ HTTP API ของระบบแจ้งซ่อมรถบริการ
// อ่าน/เขียนข้อมูลใน Postgres ของ Supabase โดยตรง (ไม่ผ่าน PostgREST)
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"fleetfix/stores/internal/api"
	"fleetfix/stores/internal/config"
	"fleetfix/stores/internal/store"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	if err := run(); err != nil {
		slog.Error("เซิร์ฟเวอร์หยุดทำงาน", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	// context ที่ถูกยกเลิกเมื่อได้รับ Ctrl+C หรือสัญญาณปิดจากระบบ
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	connectCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	st, err := store.New(connectCtx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer st.Close()
	slog.Info("เชื่อมต่อฐานข้อมูลสำเร็จ")

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           api.NewRouter(st, cfg),
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("API พร้อมใช้งาน", "addr", cfg.Addr, "origins", cfg.AllowedOrigins)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		slog.Info("กำลังปิดเซิร์ฟเวอร์...")
	}

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	slog.Info("ปิดเรียบร้อย")
	return nil
}
