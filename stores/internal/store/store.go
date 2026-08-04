// Package store คือชั้นเข้าถึงฐานข้อมูล Postgres (Supabase) ทั้งหมดของบริการนี้
// ทุก query อยู่ในแพ็กเกจนี้ ชั้น api ไม่แตะ SQL เอง
package store

import (
	"context"
	"errors"
	"fmt"
	"net/url"

	"fleetfix/stores/internal/apperr"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// error กลางอยู่ในแพ็กเกจ apperr — ประกาศชื่อย่อไว้ให้ไฟล์ในแพ็กเกจนี้ใช้สะดวก
var (
	ErrNotFound  = apperr.ErrNotFound
	ErrConflict  = apperr.ErrConflict
	ErrJobClosed = apperr.ErrJobClosed
)

type Store struct {
	pool *pgxpool.Pool
}

// querier ครอบทั้ง pool และ transaction เพื่อให้ helper ใช้ร่วมกันได้
type querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// scanner ครอบทั้ง pgx.Row และ pgx.Rows
type scanner interface {
	Scan(dest ...any) error
}

func New(ctx context.Context, databaseURL string) (*Store, error) {
	cleanURL, pooled := normalizeURL(databaseURL)

	cfg, err := pgxpool.ParseConfig(cleanURL)
	if err != nil {
		return nil, fmt.Errorf("อ่าน DATABASE_URL ไม่ได้: %w", err)
	}
	cfg.MaxConns = 8
	cfg.MinConns = 1

	if pooled {
		// Supabase transaction pooler (พอร์ต 6543) จับคู่ connection ใหม่ทุก statement
		// prepared statement ที่ pgx เตรียมไว้จะหาไม่เจอ → ต้องส่ง SQL ตรงและปิด cache
		cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec
		cfg.ConnConfig.StatementCacheCapacity = 0
		cfg.ConnConfig.DescriptionCacheCapacity = 0
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("สร้าง connection pool ไม่ได้: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("เชื่อมต่อฐานข้อมูลไม่สำเร็จ: %w", err)
	}
	return &Store{pool: pool}, nil
}

// normalizeURL เตรียม connection string ให้ pgx ใช้ได้กับ pooler ของ Supabase
//
// คืนค่า pooled = true เมื่อเป็น transaction pooler ซึ่งใช้ prepared statement ไม่ได้
// ตรวจจากพารามิเตอร์ pgbouncer=true หรือพอร์ต 6543
// และตัด pgbouncer=true ออก เพราะเป็นพารามิเตอร์ของ Prisma — pgx จะส่งต่อไปให้เซิร์ฟเวอร์
// เป็น runtime setting ที่ไม่มีอยู่จริงแล้วถูกปฏิเสธ
func normalizeURL(raw string) (string, bool) {
	u, err := url.Parse(raw)
	if err != nil {
		return raw, false
	}

	q := u.Query()
	pooled := q.Get("pgbouncer") == "true" || u.Port() == "6543"
	if q.Has("pgbouncer") {
		q.Del("pgbouncer")
		u.RawQuery = q.Encode()
	}
	return u.String(), pooled
}

func (s *Store) Close() { s.pool.Close() }

func (s *Store) Ping(ctx context.Context) error { return s.pool.Ping(ctx) }

// classify แปลง error จาก Postgres ให้เป็น error กลางของแพ็กเกจนี้
func classify(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505": // unique_violation
			return fmt.Errorf("%w (%s)", ErrConflict, pgErr.ConstraintName)
		case "23503": // foreign_key_violation
			return fmt.Errorf("%w: อ้างอิงข้อมูลที่ไม่มีอยู่ (%s)", ErrNotFound, pgErr.ConstraintName)
		case "23514": // check_violation
			return fmt.Errorf("ข้อมูลไม่ผ่านเงื่อนไข %s", pgErr.ConstraintName)
		}
	}
	return err
}

// ensurePurchaseRequest คืน id ของใบสั่งซื้อตามเลข PR — สร้างให้ถ้ายังไม่มี
// คืน nil เมื่อไม่ได้ระบุเลข PR (อะไหล่ที่ยังไม่ออก PR)
func ensurePurchaseRequest(ctx context.Context, q querier, code string) (*string, error) {
	if code == "" {
		return nil, nil
	}
	var id string
	// on conflict do update ทำให้ได้ id กลับมาทั้งกรณีสร้างใหม่และกรณีมีอยู่แล้ว
	err := q.QueryRow(ctx, `
		insert into public.purchase_requests (code)
		values ($1)
		on conflict (code) do update set code = excluded.code
		returning id::text`, code).Scan(&id)
	if err != nil {
		return nil, classify(err)
	}
	return &id, nil
}
