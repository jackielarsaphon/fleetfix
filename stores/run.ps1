# รัน API — build เป็นไฟล์ก่อนแล้วค่อยรัน
#
# ใช้แทน `go run ./cmd/server` เพราะบางเครื่อง Windows Application Control /
# Smart App Control บล็อกไฟล์ .exe ที่ go run สร้างไว้ในโฟลเดอร์ temp
#
#   cd stores
#   ./run.ps1

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path '.env')) {
    Write-Host 'ไม่พบไฟล์ .env — คัดลอกจาก .env.example แล้วใส่ DATABASE_URL ก่อน' -ForegroundColor Yellow
    exit 1
}

Write-Host 'กำลัง build...' -ForegroundColor DarkGray
go build -o server.exe ./cmd/server
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'เริ่มเซิร์ฟเวอร์ (Ctrl+C เพื่อหยุด)' -ForegroundColor DarkGray
& .\server.exe
