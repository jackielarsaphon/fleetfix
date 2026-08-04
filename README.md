# ระบบแจ้งซ่อมรถบริการ (Fleet Fix)

ระบบบันทึกงานซ่อมรถของฝ่ายบริการยานยนต์ — แจ้งซ่อม ติดตามสถานะ คุมค่าอะไหล่ และเก็บรูปก่อน/หลังซ่อม

**เดโมออนไลน์:** https://jackielarsaphon.github.io/fleetfix/

## โครงสร้าง

| โฟลเดอร์ | คืออะไร |
| --- | --- |
| [fleetfix-react](fleetfix-react/) | หน้าเว็บ React (Vite) — 6 หน้าจอ พร้อมชุดไอคอน SVG ของตัวเอง |
| [stores](stores/) | HTTP API ภาษา Go ต่อ Postgres ตรงด้วย pgx — ได้ transaction จริงตอนสร้างใบงาน |
| [fleetfix-react/supabase](fleetfix-react/supabase/) | migration + seed ของฐานข้อมูล (12 ตาราง, 6 view, trigger, RLS) |

## เลือก backend ได้ 2 แบบ

หน้าเว็บอ่าน/เขียนข้อมูลได้ 2 ทาง สลับด้วยค่าใน `.env` โดยไม่ต้องแก้โค้ดหน้าจอ

```
โหมดพัฒนา   เบราว์เซอร์ → React → HTTP → Go API → Postgres (Supabase)
โหมด Pages  เบราว์เซอร์ → React ─────────────────→ Supabase (publishable key)
```

- **ผ่าน Go API** (ค่าเริ่มต้น) — รหัสผ่านฐานข้อมูลอยู่ฝั่งเซิร์ฟเวอร์เท่านั้น
  และการสร้างใบงาน + อะไหล่ + ช่าง + PR เป็น transaction เดียว
- **ต่อ Supabase ตรง** — ใช้ตอน deploy ขึ้น GitHub Pages ที่รันเซิร์ฟเวอร์ไม่ได้
  ตั้ง `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` แล้วแอปจะสลับให้เอง

> ⚠️ เดโมบน Pages เปิดให้ทุกคนแก้ข้อมูลได้ เพราะ RLS ของระบบนี้ตั้งให้ role `anon` เขียนได้
> และไม่มีระบบล็อกอิน — ใช้กับข้อมูลจริงที่สำคัญควรใช้โหมด Go API และเพิ่ม auth ก่อน

## เริ่มใช้งานในเครื่อง

```bash
# 1) ฐานข้อมูล — รัน migration ครั้งเดียว (ดู fleetfix-react/supabase/README.md)

# 2) API
cd stores
cp .env.example .env      # ใส่ DATABASE_URL จาก Supabase → ปุ่ม Connect → แท็บ ORMs
./run.ps1                 # http://localhost:8080

# 3) หน้าเว็บ
cd fleetfix-react
npm install
npm run dev               # http://localhost:5173
```

## สิ่งที่ทำได้

- รายการงานซ่อม 3 มุมมอง (ตาราง / การ์ด / คิวตามสถานะ) พร้อมค้นหาและกรองสถานะ
- ใบงานเลื่อนสถานะตามผังใน `job_statuses` — ไทม์ไลน์บันทึกอัตโนมัติด้วย trigger
- คิดยอดอะไหล่และค่าแรง หักส่วนลด (ฐานข้อมูลคำนวณด้วย generated column ตรงกับที่หน้าเว็บคำนวณ)
- แนบรูปก่อน/หลังซ่อม คลิกดูเต็มจอ เลื่อนดูรูปอื่นได้
- ทะเบียนรถพร้อมประวัติซ่อมรายคัน · สถานที่ซ่อม · แดชบอร์ด KPI และกราฟค่าซ่อมรายเดือน

รายละเอียดของแต่ละส่วนอยู่ใน README ของโฟลเดอร์นั้น ๆ
