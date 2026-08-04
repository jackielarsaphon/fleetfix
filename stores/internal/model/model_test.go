package model

import "testing"

func TestNewJobValidate(t *testing.T) {
	t.Run("ตัดช่องว่างและเติมค่าเริ่มต้นของอะไหล่", func(t *testing.T) {
		in := NewJob{
			VehicleCode: "  TS-028 ",
			Symptom:     " เบรกมีเสียงดัง ",
			BreakOn:     "2026-07-31",
			Parts: []NewJobPart{
				{Name: " ผ้าเบรกหน้า ", Qty: 0, Unit: "  "},
				{Name: "   "}, // แถวว่างจากฟอร์ม ต้องถูกตัดออก
			},
			Technicians: []string{" ช่างบุญมี ", "ช่างบุญมี", "  "},
		}
		if err := in.Validate(); err != nil {
			t.Fatalf("ไม่ควร error: %v", err)
		}
		if in.VehicleCode != "TS-028" || in.Symptom != "เบรกมีเสียงดัง" {
			t.Errorf("ยังไม่ได้ตัดช่องว่าง: %q / %q", in.VehicleCode, in.Symptom)
		}
		if len(in.Parts) != 1 {
			t.Fatalf("ต้องเหลืออะไหล่ 1 รายการ ได้ %d", len(in.Parts))
		}
		if in.Parts[0].Name != "ผ้าเบรกหน้า" || in.Parts[0].Qty != 1 || in.Parts[0].Unit != "ชิ้น" {
			t.Errorf("ค่าเริ่มต้นของอะไหล่ไม่ถูก: %+v", in.Parts[0])
		}
		if len(in.Technicians) != 1 || in.Technicians[0] != "ช่างบุญมี" {
			t.Errorf("ต้องเหลือช่าง 1 คนไม่ซ้ำ ได้ %v", in.Technicians)
		}
	})

	cases := []struct {
		name string
		in   NewJob
	}{
		{"ไม่มีเบอร์รถ", NewJob{Symptom: "x"}},
		{"ไม่มีอาการ", NewJob{VehicleCode: "TS-028"}},
		{"วันที่ผิดรูปแบบ", NewJob{VehicleCode: "TS-028", Symptom: "x", BreakOn: "31/07/2026"}},
		{"ราคาติดลบ", NewJob{VehicleCode: "TS-028", Symptom: "x",
			Parts: []NewJobPart{{Name: "a", UnitPrice: -1}}}},
		{"ส่วนลดเกิน 100", NewJob{VehicleCode: "TS-028", Symptom: "x",
			Parts: []NewJobPart{{Name: "a", DiscountPct: 101}}}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			in := c.in
			if err := in.Validate(); err == nil {
				t.Error("ควร error แต่ผ่าน")
			}
		})
	}

	t.Run("เลขไมล์ติดลบ", func(t *testing.T) {
		m := -5
		in := NewJob{VehicleCode: "TS-028", Symptom: "x", Mileage: &m}
		if err := in.Validate(); err == nil {
			t.Error("ควร error แต่ผ่าน")
		}
	})
}

func TestIsISODate(t *testing.T) {
	ok := []string{"2026-07-31", "1999-01-01"}
	bad := []string{"", "2026-7-31", "31-07-2026", "2026/07/31", "2026-07-3a", "2026-07-311"}

	for _, s := range ok {
		if !isISODate(s) {
			t.Errorf("%q ควรผ่าน", s)
		}
	}
	for _, s := range bad {
		if isISODate(s) {
			t.Errorf("%q ไม่ควรผ่าน", s)
		}
	}
}

func TestVehicleAndPlaceValidate(t *testing.T) {
	v := NewVehicle{Code: "  TS-041 ", BrandModel: " ISUZU FVM "}
	if err := v.Validate(); err != nil {
		t.Fatalf("ไม่ควร error: %v", err)
	}
	if v.Code != "TS-041" || v.BrandModel != "ISUZU FVM" {
		t.Errorf("ยังไม่ได้ตัดช่องว่าง: %+v", v)
	}
	if err := (&NewVehicle{Code: "   "}).Validate(); err == nil {
		t.Error("เบอร์รถว่างควร error")
	}

	p := NewPlace{Name: " อู่ช่างเล็ก "}
	if err := p.Validate(); err != nil {
		t.Fatalf("ไม่ควร error: %v", err)
	}
	if p.Name != "อู่ช่างเล็ก" {
		t.Errorf("ยังไม่ได้ตัดช่องว่าง: %q", p.Name)
	}
	if err := (&NewPlace{}).Validate(); err == nil {
		t.Error("ชื่อสถานที่ว่างควร error")
	}
}
