// Package model คือรูปแบบข้อมูลที่ API รับเข้าและส่งออก (JSON)
package model

import (
	"fmt"
	"strings"
)

// ── ส่งออก ──────────────────────────────────────────────────

type Job struct {
	ID              string   `json:"id"`
	Code            string   `json:"code"`
	Status          string   `json:"status"`      // รหัสสถานะ เช่น waiting_parts
	StatusLabel     string   `json:"statusLabel"` // ชื่อไทย เช่น รออะไหล่
	StatusOrder     int      `json:"statusOrder"`
	IsClosed        bool     `json:"isClosed"`
	NextActionLabel string   `json:"nextActionLabel"`
	ChipFg          string   `json:"chipFg"`
	ChipBg          string   `json:"chipBg"`
	DotColor        string   `json:"dotColor"`
	Symptom         string   `json:"symptom"`
	RootCause       string   `json:"rootCause"`
	Mileage         int      `json:"mileage"`
	ReportedOn      string   `json:"reportedOn"` // YYYY-MM-DD
	BreakOn         string   `json:"breakOn"`
	DoneOn          string   `json:"doneOn"`
	Reporter        string   `json:"reporter"`
	Note            string   `json:"note"`
	VehicleID       string   `json:"vehicleId"`
	VehicleCode     string   `json:"vehicleCode"`
	BrandModel      string   `json:"brandModel"`
	Plate           string   `json:"plate"`
	PlaceName       string   `json:"placeName"`
	Technicians     string   `json:"technicians"`
	PRCodes         []string `json:"prCodes"`
	PhotoCount      int      `json:"photoCount"`
	PartsCount      int      `json:"partsCount"`
	Subtotal        float64  `json:"subtotal"`
	DiscountTotal   float64  `json:"discountTotal"`
	GrandTotal      float64  `json:"grandTotal"`
	AgeDays         *int     `json:"ageDays"` // null เมื่อปิดงานแล้ว

	Parts    []JobPart     `json:"parts,omitempty"`
	Timeline []StatusEvent `json:"timeline,omitempty"`
}

type JobPart struct {
	ID          string  `json:"id"`
	LineNo      int     `json:"lineNo"`
	Name        string  `json:"name"`
	PartNo      string  `json:"partNo"`
	Qty         float64 `json:"qty"`
	Unit        string  `json:"unit"`
	UnitPrice   float64 `json:"unitPrice"`
	DiscountPct float64 `json:"discountPct"`
	GrossAmount float64 `json:"grossAmount"`
	NetAmount   float64 `json:"netAmount"`
	PRCode      string  `json:"prCode"`
}

type StatusEvent struct {
	FromStatus string `json:"fromStatus"`
	ToStatus   string `json:"toStatus"`
	Label      string `json:"label"`
	Note       string `json:"note"`
	Actor      string `json:"actor"`
	CreatedAt  string `json:"createdAt"` // RFC3339
}

type Photo struct {
	ID        string `json:"id"`
	JobID     string `json:"jobId"`
	Kind      string `json:"kind"` // before | after | report
	Caption   string `json:"caption"`
	SortOrder int    `json:"sortOrder"`
	CreatedAt string `json:"createdAt"`
	// URL สำหรับดึงไฟล์รูป (ผ่าน API ไม่ได้เปิด path จริงให้เห็น)
	URL string `json:"url"`
}

type Vehicle struct {
	ID           string  `json:"id"`
	Code         string  `json:"code"`
	Plate        string  `json:"plate"`
	BrandModel   string  `json:"brandModel"`
	VehicleType  string  `json:"vehicleType"`
	Note         string  `json:"note"`
	Mileage      int     `json:"mileage"`
	JobCount     int     `json:"jobCount"`
	OpenJobCount int     `json:"openJobCount"`
	RepairCost   float64 `json:"repairCost"`
	LastRepairOn string  `json:"lastRepairOn"`
}

type Place struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Kind     string `json:"kind"`
	Contact  string `json:"contact"`
	Phone    string `json:"phone"`
	Address  string `json:"address"`
	UsedBy   int    `json:"usedBy"` // จำนวนใบงานที่อ้างสถานที่นี้
	IsActive bool   `json:"isActive"`
}

type StatusCount struct {
	Code      string  `json:"code"`
	Label     string  `json:"label"`
	Order     int     `json:"order"`
	JobCount  int     `json:"jobCount"`
	TotalCost float64 `json:"totalCost"`
}

type MonthlyCost struct {
	Month     string  `json:"month"` // YYYY-MM
	JobCount  int     `json:"jobCount"`
	TotalCost float64 `json:"totalCost"`
}

type Dashboard struct {
	StatusCounts []StatusCount `json:"statusCounts"`
	Monthly      []MonthlyCost `json:"monthly"`
	Frequent     []Vehicle     `json:"frequent"`
	OpenCost     float64       `json:"openCost"`
}

// ── รับเข้า ─────────────────────────────────────────────────

type NewJob struct {
	VehicleCode string       `json:"vehicleCode"`
	Symptom     string       `json:"symptom"`
	BreakOn     string       `json:"breakOn"` // YYYY-MM-DD
	Mileage     *int         `json:"mileage"`
	PlaceName   string       `json:"placeName"`
	Reporter    string       `json:"reporter"`
	Note        string       `json:"note"`
	CreatedBy   string       `json:"createdBy"`
	Parts       []NewJobPart `json:"parts"`
	Technicians []string     `json:"technicians"`
}

type NewJobPart struct {
	Name        string  `json:"name"`
	PartNo      string  `json:"partNo"`
	Qty         float64 `json:"qty"`
	Unit        string  `json:"unit"`
	UnitPrice   float64 `json:"unitPrice"`
	DiscountPct float64 `json:"discountPct"`
	PRCode      string  `json:"prCode"`
}

// EditJob คือข้อมูลใบงานที่แก้ได้ — ส่งมาทั้งชุด (ไม่ใช่แก้ทีละฟิลด์)
type EditJob struct {
	VehicleCode string   `json:"vehicleCode"`
	Symptom     string   `json:"symptom"`
	RootCause   string   `json:"rootCause"`
	Status      string   `json:"status"` // ว่าง = คงสถานะเดิม
	Mileage     *int     `json:"mileage"`
	BreakOn     string   `json:"breakOn"`
	DoneOn      string   `json:"doneOn"`
	PlaceName   string   `json:"placeName"`
	Reporter    string   `json:"reporter"`
	Note        string   `json:"note"`
	Technicians []string `json:"technicians"`
}

type NewVehicle struct {
	Code        string `json:"code"`
	Plate       string `json:"plate"`
	BrandModel  string `json:"brandModel"`
	VehicleType string `json:"vehicleType"`
	Owner       string `json:"owner"`
	Note        string `json:"note"`
}

// EditVehicle คือข้อมูลรถที่แก้ได้ — ส่งมาทั้งชุด
// IsActive เป็น pointer เพื่อแยก "ไม่ได้ส่งมา" (คงค่าเดิม) จาก false (เลิกใช้งาน)
type EditVehicle struct {
	Code        string `json:"code"`
	Plate       string `json:"plate"`
	BrandModel  string `json:"brandModel"`
	VehicleType string `json:"vehicleType"`
	Owner       string `json:"owner"`
	Note        string `json:"note"`
	IsActive    *bool  `json:"isActive"`
}

type NewPlace struct {
	Name    string `json:"name"`
	Kind    string `json:"kind"`
	Contact string `json:"contact"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
}

type PartPR struct {
	PRCode string `json:"prCode"`
}

// ── ตรวจความถูกต้อง ─────────────────────────────────────────

// Validate ตัดช่องว่างและตรวจว่าข้อมูลที่จำเป็นครบ
func (n *NewJob) Validate() error {
	n.VehicleCode = strings.TrimSpace(n.VehicleCode)
	n.Symptom = strings.TrimSpace(n.Symptom)
	n.BreakOn = strings.TrimSpace(n.BreakOn)
	n.PlaceName = strings.TrimSpace(n.PlaceName)
	n.Reporter = strings.TrimSpace(n.Reporter)
	n.Note = strings.TrimSpace(n.Note)
	n.CreatedBy = strings.TrimSpace(n.CreatedBy)

	if n.VehicleCode == "" {
		return fmt.Errorf("ต้องระบุ vehicleCode (เบอร์รถ)")
	}
	if n.Symptom == "" {
		return fmt.Errorf("ต้องระบุ symptom (อาการแจ้งซ่อม)")
	}
	if n.BreakOn != "" && !isISODate(n.BreakOn) {
		return fmt.Errorf("breakOn ต้องอยู่ในรูปแบบ YYYY-MM-DD")
	}
	if n.Mileage != nil && *n.Mileage < 0 {
		return fmt.Errorf("mileage ต้องไม่เป็นค่าลบ")
	}

	cleaned := make([]NewJobPart, 0, len(n.Parts))
	for i := range n.Parts {
		p := n.Parts[i]
		p.Name = strings.TrimSpace(p.Name)
		p.PartNo = strings.TrimSpace(p.PartNo)
		p.Unit = strings.TrimSpace(p.Unit)
		p.PRCode = strings.TrimSpace(p.PRCode)
		if p.Name == "" {
			continue // แถวว่างจากฟอร์ม — ข้ามไป
		}
		if p.Qty <= 0 {
			p.Qty = 1
		}
		if p.Unit == "" {
			p.Unit = "ชิ้น"
		}
		if p.UnitPrice < 0 {
			return fmt.Errorf("อะไหล่ %q: unitPrice ต้องไม่เป็นค่าลบ", p.Name)
		}
		if p.DiscountPct < 0 || p.DiscountPct > 100 {
			return fmt.Errorf("อะไหล่ %q: discountPct ต้องอยู่ระหว่าง 0–100", p.Name)
		}
		cleaned = append(cleaned, p)
	}
	n.Parts = cleaned

	techs := make([]string, 0, len(n.Technicians))
	seen := map[string]bool{}
	for _, t := range n.Technicians {
		t = strings.TrimSpace(t)
		if t == "" || seen[t] {
			continue
		}
		seen[t] = true
		techs = append(techs, t)
	}
	n.Technicians = techs

	return nil
}

// Validate ตัดช่องว่างและตรวจว่าข้อมูลที่จำเป็นครบ
func (e *EditJob) Validate() error {
	e.VehicleCode = strings.TrimSpace(e.VehicleCode)
	e.Symptom = strings.TrimSpace(e.Symptom)
	e.RootCause = strings.TrimSpace(e.RootCause)
	e.Status = strings.TrimSpace(e.Status)
	e.BreakOn = strings.TrimSpace(e.BreakOn)
	e.DoneOn = strings.TrimSpace(e.DoneOn)
	e.PlaceName = strings.TrimSpace(e.PlaceName)
	e.Reporter = strings.TrimSpace(e.Reporter)
	e.Note = strings.TrimSpace(e.Note)

	if e.VehicleCode == "" {
		return fmt.Errorf("ต้องระบุ vehicleCode (เบอร์รถ)")
	}
	if e.Symptom == "" {
		return fmt.Errorf("ต้องระบุ symptom (อาการแจ้งซ่อม)")
	}
	for _, d := range [][2]string{{"breakOn", e.BreakOn}, {"doneOn", e.DoneOn}} {
		if d[1] != "" && !isISODate(d[1]) {
			return fmt.Errorf("%s ต้องอยู่ในรูปแบบ YYYY-MM-DD", d[0])
		}
	}
	if e.Mileage != nil && *e.Mileage < 0 {
		return fmt.Errorf("mileage ต้องไม่เป็นค่าลบ")
	}

	techs := make([]string, 0, len(e.Technicians))
	seen := map[string]bool{}
	for _, t := range e.Technicians {
		t = strings.TrimSpace(t)
		if t == "" || seen[t] {
			continue
		}
		seen[t] = true
		techs = append(techs, t)
	}
	e.Technicians = techs

	return nil
}

func (n *NewVehicle) Validate() error {
	n.Code = strings.TrimSpace(n.Code)
	n.Plate = strings.TrimSpace(n.Plate)
	n.BrandModel = strings.TrimSpace(n.BrandModel)
	n.VehicleType = strings.TrimSpace(n.VehicleType)
	n.Owner = strings.TrimSpace(n.Owner)
	n.Note = strings.TrimSpace(n.Note)

	if n.Code == "" {
		return fmt.Errorf("ต้องระบุ code (เบอร์รถ)")
	}
	return nil
}

func (e *EditVehicle) Validate() error {
	e.Code = strings.TrimSpace(e.Code)
	e.Plate = strings.TrimSpace(e.Plate)
	e.BrandModel = strings.TrimSpace(e.BrandModel)
	e.VehicleType = strings.TrimSpace(e.VehicleType)
	e.Owner = strings.TrimSpace(e.Owner)
	e.Note = strings.TrimSpace(e.Note)

	if e.Code == "" {
		return fmt.Errorf("ต้องระบุ code (เบอร์รถ)")
	}
	return nil
}

func (n *NewPlace) Validate() error {
	n.Name = strings.TrimSpace(n.Name)
	n.Kind = strings.TrimSpace(n.Kind)
	n.Contact = strings.TrimSpace(n.Contact)
	n.Phone = strings.TrimSpace(n.Phone)
	n.Address = strings.TrimSpace(n.Address)

	if n.Name == "" {
		return fmt.Errorf("ต้องระบุ name (ชื่อสถานที่ซ่อม)")
	}
	return nil
}

// isISODate ตรวจรูปแบบ YYYY-MM-DD อย่างหยาบ (Postgres จะตรวจค่าจริงให้อีกชั้น)
func isISODate(s string) bool {
	if len(s) != 10 || s[4] != '-' || s[7] != '-' {
		return false
	}
	for i, r := range s {
		if i == 4 || i == 7 {
			continue
		}
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
