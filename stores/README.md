# stores — HTTP API (Go) ของระบบแจ้งซ่อมรถบริการ

บริการ Go ที่ต่อ Postgres ของ Supabase **โดยตรง** (ไม่ผ่าน PostgREST) เพื่อรับ-ส่งข้อมูลงานซ่อม
ใช้แทนหรือใช้ร่วมกับการที่แอป React เรียก Supabase เองก็ได้

ชื่อโฟลเดอร์ `stores` มาจาก store pattern — ทุก SQL อยู่ในแพ็กเกจ `internal/store` ชั้น HTTP ไม่แตะ SQL เอง

## ทำไมต้องมีชั้นนี้

| เรื่อง | เรียก Supabase จากเบราว์เซอร์ | ผ่าน API ตัวนี้ |
| --- | --- | --- |
| สร้างใบงาน + อะไหล่ + PR | หลาย request ไม่เป็น transaction | **transaction เดียว** ล้มก็ไม่บันทึกอะไรเลย |
| กุญแจฐานข้อมูล | publishable key อยู่ในไฟล์ JS ที่ใครก็อ่านได้ | รหัสผ่านอยู่ฝั่งเซิร์ฟเวอร์เท่านั้น |
| ตรวจความถูกต้องของข้อมูล | ทำที่ฝั่งหน้าเว็บ ข้ามได้ | บังคับที่เซิร์ฟเวอร์ ข้ามไม่ได้ |
| ควบคุมสิทธิ์ | ต้องพึ่ง RLS ล้วน ๆ | เพิ่ม auth/rate limit ที่ชั้นนี้ได้ |

## Connection string ของ Supabase

เอาจาก Dashboard → ปุ่ม **Connect** (แถบด้านบน ไม่ใช่ในเมนู Settings) → แท็บ **ORMs**

- **พอร์ต 6543** = transaction pooler — โค้ดตรวจจับให้เองแล้วว่าต้องปิด prepared statement
  (`normalizeURL` ใน `internal/store/store.go` ตัดพารามิเตอร์ `pgbouncer=true` ที่ pgx ไม่รู้จัก
  และตั้ง `QueryExecModeExec` ให้ ไม่งั้นจะพังเป็นระยะเพราะ pooler สลับ connection ทุก statement)
- **พอร์ต 5432** = session pooler — ใช้ตอนรัน migration ที่ต้องการ prepared statement
- ต้องแทน `[YOUR-PASSWORD]` ด้วยรหัสผ่านจริง **และลบวงเล็บเหลี่ยมออก**
  ถ้ารหัสผ่านมีอักขระพิเศษ (`+ @ / : ?`) ให้เข้ารหัสแบบ URL เช่น `+` → `%2B`
- ดูรหัสผ่านย้อนหลังไม่ได้ — reset ได้ที่ Project Settings → Database

## เตรียมและรัน

ต้องมี Go 1.23 ขึ้นไป (`scoop install go` หรือ https://go.dev/dl)

```bash
cd stores
cp .env.example .env        # ใส่ DATABASE_URL ให้ครบ
go mod tidy                 # ดึง pgx (ต้องต่อเน็ตครั้งแรก)
./run.ps1                   # API ขึ้นที่ http://localhost:8080
```

`run.ps1` คือ `go build` แล้วรันไฟล์ที่ได้ — ใช้แทน `go run ./cmd/server` เพราะบางเครื่อง
Windows Application Control / Smart App Control บล็อกไฟล์ `.exe` ที่ `go run` สร้างในโฟลเดอร์ temp
(อาการ: `An Application Control policy has blocked this file`) ถ้าเครื่องไม่บล็อกก็ใช้ `go run` ได้ตามปกติ

ตรวจสอบ:
```bash
curl http://localhost:8080/api/health
curl "http://localhost:8080/api/jobs?q=TS-028"
```

คำสั่งอื่น:
```bash
go vet ./...        # ตรวจโค้ด
go test ./...       # รันเทสต์
go build -o bin/server.exe ./cmd/server
```

## เส้นทาง API

| Method | Path | ทำอะไร |
| --- | --- | --- |
| GET | `/api/health` | ตรวจว่าเซิร์ฟเวอร์และฐานข้อมูลปกติ |
| GET | `/api/jobs?status=&q=` | รายการใบงาน กรองสถานะ (`new`, `waiting_parts`, `in_progress`, `done`) และคำค้น |
| GET | `/api/jobs/{id}` | ใบงานหนึ่งใบ พร้อมอะไหล่และไทม์ไลน์ |
| POST | `/api/jobs` | แจ้งซ่อมใหม่ (สร้างใบงาน + อะไหล่ + ช่าง + PR ใน transaction เดียว) |
| PATCH | `/api/jobs/{id}` | แก้ข้อมูลใบงานทั้งชุด รวมรายชื่อช่าง (transaction เดียว) |
| DELETE | `/api/jobs/{id}` | ลบใบงานถาวร — อะไหล่/ไทม์ไลน์/แถวรูป cascade และลบไฟล์รูปตามด้วย |
| POST | `/api/jobs/{id}/advance` | เลื่อนสถานะไปขั้นถัดไป |
| GET | `/api/jobs/{id}/photos` | รูปของใบงาน (`before` / `after` / `report`) |
| POST | `/api/jobs/{id}/photos` | อัปโหลดรูป — `multipart/form-data`: `file`, `kind`, `caption` |
| GET | `/api/photos/{id}` | ตัวไฟล์รูป (ส่ง content-type ตามนามสกุล) |
| DELETE | `/api/photos/{id}` | ลบรูป (ลบทั้งแถวและไฟล์บนดิสก์) |
| PATCH | `/api/parts/{id}/pr` | ผูก/ถอดเลข PR ของอะไหล่รายชิ้น |
| GET | `/api/vehicles` | ทะเบียนรถ + สรุปจำนวนครั้งและค่าซ่อมต่อคัน |
| POST | `/api/vehicles` | เพิ่มทะเบียนรถ |
| GET | `/api/places?includeInactive=true` | สถานที่ซ่อม |
| POST | `/api/places` | เพิ่มสถานที่ซ่อม |
| DELETE | `/api/places/{id}` | เลิกใช้สถานที่ (ตั้ง `is_active=false` ไม่ลบจริง) |
| GET | `/api/dashboard` | KPI + ค่าซ่อมรายเดือน + รถที่ซ่อมบ่อย + ค่าซ่อมค้าง |

คำค้น (`q`) ครอบ: เบอร์รถ / อาการ / เลขที่ใบงาน / อาการหลัก / ชื่อช่าง / เลข PR / ชื่อและรหัสอะไหล่

### ตัวอย่าง — แจ้งซ่อมใหม่

```bash
curl -X POST http://localhost:8080/api/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "vehicleCode": "TS-028",
    "symptom": "เบรกมีเสียงดัง",
    "breakOn": "2026-07-31",
    "mileage": 183000,
    "placeName": "ศูนย์ซ่อมภายใน",
    "reporter": "พนักงานขับรถ สมชาย พ.",
    "createdBy": "ธุรการ",
    "parts": [
      { "name": "ผ้าเบรกหน้า", "partNo": "BP-2214", "qty": 2,
        "unit": "ชุด", "unitPrice": 1850, "discountPct": 10, "prCode": "PR2607001" }
    ],
    "technicians": ["ช่างบุญมี"]
  }'
```

ตอบ `201 Created` พร้อมใบงานเต็มใบ (มี `code` ที่ระบบออกให้ เช่น `JR26-0162`, ยอดเงิน, ไทม์ไลน์)

### ไฟล์รูปเก็บที่ไหน

เลือกได้ 2 แบบผ่าน `.env` — ฐานข้อมูลเก็บแค่ path ในคอลัมน์ `job_photos.storage_path`
ทั้งสองแบบ และรูปถูกเสิร์ฟผ่าน `/api/photos/{id}` เท่านั้น (ไม่เปิด path จริงให้เห็น)

| ตั้งค่า | เก็บที่ |
| --- | --- |
| ตั้ง `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` | **Supabase Storage** bucket `job-photos` |
| ไม่ตั้ง | ดิสก์ของเซิร์ฟเวอร์ที่ `PHOTO_DIR` (ค่าเริ่มต้น `data/photos`) |

**แนะนำให้ตั้งค่า Supabase Storage** เพราะหน้าเว็บที่ deploy บน GitHub Pages อ่านรูปจากที่นั่น
ถ้าเก็บลงดิสก์อย่างเดียว รูปที่อัปจากเครื่องคุณจะไม่ขึ้นบนเว็บสาธารณะ (แถวในฐานข้อมูลมี แต่หาไฟล์ไม่เจอ)
ใช้ publishable key ได้เลย ไม่ต้องใช้ secret key เพราะ policy ของ bucket อนุญาต role `anon` อยู่แล้ว

path ของไฟล์เป็น `<job_id>/<kind>-<random>.<ext>` เหมือนกันทั้งสองฝั่ง ทำให้ย้ายไปมาได้โดยไม่ต้องแก้ฐานข้อมูล

- รับเฉพาะ `.jpg .jpeg .png .webp .heic` ขนาดไม่เกิน 10 MB (ตั้งได้ที่ `MaxPhotoBytes`)
- ถ้าบันทึกฐานข้อมูลไม่ผ่าน ไฟล์ที่เพิ่งอัปจะถูกลบทิ้ง ไม่เหลือไฟล์กำพร้า
- ลบรูปจะลบทั้งแถวและไฟล์ · ลบใบงานจะ cascade ลบแถวรูป (ตัวไฟล์ยังค้าง — ถ้าต้องการเก็บกวาดให้เพิ่มงานล้างไฟล์ที่ไม่มีแถวอ้างอิงภายหลัง)

โค้ดส่วนนี้อยู่ใน `internal/storage/` — `Disk` กับ `Supabase` ทำตาม interface `Store` ตัวเดียวกัน

### รูปแบบ error

```json
{ "error": "ไม่พบข้อมูล: ไม่พบเบอร์รถ TS-999" }
```

| สถานะ | เมื่อไร |
| --- | --- |
| 400 | JSON ผิดรูป, ข้อมูลไม่ครบ, id ไม่ใช่ uuid |
| 404 | ไม่พบใบงาน/รถ/สถานที่ |
| 409 | ข้อมูลซ้ำ (เบอร์รถ/ชื่อสถานที่ซ้ำ) หรือใบงานปิดแล้วแต่สั่ง advance |
| 500 | ข้อผิดพลาดภายใน (รายละเอียดจริงอยู่ใน log ไม่ส่งออกให้ client) |

## โครงสร้าง

```
stores/
├─ cmd/server/main.go          # จุดเริ่มต้น + graceful shutdown
└─ internal/
   ├─ config/config.go         # อ่าน env / .env
   ├─ model/model.go           # รูปแบบ JSON เข้า-ออก + การตรวจความถูกต้อง
   ├─ storage/                 # ที่เก็บไฟล์รูป (Supabase Storage หรือดิสก์)
   ├─ store/                   # SQL ทั้งหมดอยู่ที่นี่
   │  ├─ store.go              # pool, error กลาง, helper เลข PR
   │  ├─ jobs.go               # ใบงาน อะไหล่ ไทม์ไลน์ (CreateJob = transaction)
   │  ├─ vehicles.go
   │  ├─ places.go
   │  └─ dashboard.go
   └─ api/                     # ชั้น HTTP
      ├─ router.go             # เส้นทาง (net/http ServeMux ของ Go 1.22+)
      ├─ handlers.go
      ├─ middleware.go         # recover, log, CORS, timeout
      └─ respond.go            # JSON + แปลง error เป็น status
```

พึ่งพาแพ็กเกจภายนอกตัวเดียว: [`pgx/v5`](https://github.com/jackc/pgx) — routing, JSON, log ใช้ stdlib ทั้งหมด

## ต้องมี schema ก่อน

API นี้อ่านจาก view และตารางที่สร้างโดย migration ใน [`../fleetfix-react/supabase/migrations`](../fleetfix-react/supabase/migrations)
(`jobs_list`, `job_totals`, `vehicle_summary`, `job_status_counts`, `monthly_repair_cost`, `repair_jobs`, `job_parts` ฯลฯ)

เชื่อมต่อด้วยรหัสผ่านฐานข้อมูลจึงข้าม RLS — สิทธิ์ควรคุมที่ชั้น API นี้แทนเมื่อเปิดใช้จริง
