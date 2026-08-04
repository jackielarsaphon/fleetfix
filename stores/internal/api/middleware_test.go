package api

import "testing"

func TestOriginAllowed(t *testing.T) {
	cases := []struct {
		name    string
		allowed []string
		origin  string
		want    bool
	}{
		{"ตรงตัว", []string{"http://localhost:5173"}, "http://localhost:5173", true},
		{"ไม่ตรง", []string{"http://localhost:5173"}, "http://localhost:5199", false},
		{"อนุญาตทุก origin", []string{"*"}, "https://evil.example", true},

		// รูปแบบ wildcard พอร์ต — vite เปลี่ยนพอร์ตเองเมื่อพอร์ตเดิมไม่ว่าง
		{"ทุกพอร์ตของ localhost", []string{"http://localhost:*"}, "http://localhost:5199", true},
		{"พอร์ตอื่นก็ผ่าน", []string{"http://localhost:*"}, "http://localhost:4173", true},
		{"คนละ host ไม่ผ่าน", []string{"http://localhost:*"}, "http://evil.example:5173", false},
		{"คนละ scheme ไม่ผ่าน", []string{"http://localhost:*"}, "https://localhost:5173", false},
		{"ไม่มีพอร์ตไม่ผ่าน", []string{"http://localhost:*"}, "http://localhost:", false},
		{"พอร์ตไม่ใช่ตัวเลขไม่ผ่าน", []string{"http://localhost:*"}, "http://localhost:abc", false},
		// กันเคสที่ prefix ไม่ได้ลงท้ายด้วย ':' เช่น http://localhost* จะต้องไม่ผ่าน
		{"wildcard ที่ไม่มี : ไม่นับ", []string{"http://localhost*"}, "http://localhost.evil.com", false},

		{"หลายรายการ", []string{"https://example.com", "http://localhost:*"}, "http://localhost:3000", true},
		{"ไม่มีรายการเลย", nil, "http://localhost:5173", false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := originAllowed(c.allowed, c.origin); got != c.want {
				t.Errorf("originAllowed(%v, %q) = %v ต้องการ %v", c.allowed, c.origin, got, c.want)
			}
		})
	}
}
