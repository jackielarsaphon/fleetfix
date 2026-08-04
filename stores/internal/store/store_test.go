package store

import (
	"strings"
	"testing"
)

func TestNormalizeURL(t *testing.T) {
	cases := []struct {
		name       string
		in         string
		wantPooled bool
		wantNoParm bool // ต้องไม่มี pgbouncer ในผลลัพธ์
	}{
		{
			name:       "transaction pooler ของ Supabase",
			in:         "postgresql://postgres.abc:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
			wantPooled: true,
			wantNoParm: true,
		},
		{
			name:       "พอร์ต 6543 แต่ไม่มีพารามิเตอร์",
			in:         "postgresql://postgres.abc:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
			wantPooled: true,
		},
		{
			name:       "session pooler พอร์ต 5432",
			in:         "postgresql://postgres.abc:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
			wantPooled: false,
		},
		{
			name:       "Postgres ในเครื่อง",
			in:         "postgresql://postgres@localhost:55432/fleetfix",
			wantPooled: false,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, pooled := normalizeURL(c.in)
			if pooled != c.wantPooled {
				t.Errorf("pooled = %v ต้องการ %v", pooled, c.wantPooled)
			}
			if c.wantNoParm && strings.Contains(got, "pgbouncer") {
				t.Errorf("ยังมี pgbouncer อยู่ใน %q", got)
			}
			// ต้องไม่ทำลาย host/รหัสผ่านในสาย
			if !strings.Contains(got, "pooler.supabase.com") && !strings.Contains(got, "localhost") {
				t.Errorf("host หายไป: %q", got)
			}
		})
	}

	t.Run("สายที่ parse ไม่ได้ต้องคืนค่าเดิม", func(t *testing.T) {
		bad := "://not a url"
		got, pooled := normalizeURL(bad)
		if got != bad || pooled {
			t.Errorf("ได้ %q pooled=%v", got, pooled)
		}
	})
}
