"use client";

import { FormEvent, useMemo, useState } from "react";

type RepairStatus = "รออะไหล่" | "กำลังซ่อม" | "ปิดงาน";
type Priority = "ด่วน" | "สูง" | "ปกติ";

type RepairItem = {
  name: string;
  qty?: number;
  unit?: string;
  sourceVehicle?: string;
};

type Repair = {
  id: string;
  vehicle: string;
  reportedAt: string;
  reportedSort: string;
  completedAt?: string;
  mileage?: number;
  symptom: string;
  status: RepairStatus;
  priority: Priority;
  technicians: string[];
  pr?: string;
  costLak?: number;
  note?: string;
  items: RepairItem[];
  photos: number;
};

const initialRepairs: Repair[] = [
  {
    id: "JOB-260622",
    vehicle: "TS-028",
    reportedAt: "22 มิ.ย. 2569",
    reportedSort: "2026-06-22",
    completedAt: "—",
    mileage: 92654,
    symptom: "ใส่เกียร์ไม่ได้",
    status: "รออะไหล่",
    priority: "ด่วน",
    technicians: ["สายสะหมอน", "ใจประเสริฐ"],
    note: "รถจอดซ่อม รอชุดเฟืองท้าย",
    items: [
      { name: "น็อตจับเฟืองวงเดือน", qty: 1, unit: "EA" },
      { name: "ชุดเฟืองท้าย", sourceVehicle: "TS-030" },
      { name: "น้ำมันเฟืองท้าย" },
      { name: "ลูกปืนล้อหลังซ้าย" },
      { name: "กระบอกเบรก" },
    ],
    photos: 7,
  },
  {
    id: "JOB-260617",
    vehicle: "TS-028",
    reportedAt: "17 มิ.ย. 2569",
    reportedSort: "2026-06-17",
    completedAt: "—",
    mileage: 256808,
    symptom: "กรองก๊าซโซลีนเข้าท้องอ่าง",
    status: "รออะไหล่",
    priority: "สูง",
    technicians: ["คำหล้า", "สมุนไท"],
    note: "รถจอดซ่อมรออะไหล่",
    items: [{ name: "ปั๊มก๊าซโซลีน", qty: 1, unit: "อัน", sourceVehicle: "TS-030" }],
    photos: 1,
  },
  {
    id: "PR26060079",
    vehicle: "TS-028",
    reportedAt: "5 มิ.ย. 2569",
    reportedSort: "2026-06-05",
    completedAt: "—",
    mileage: 119230,
    symptom: "คอหม้อน้ำและท่อต่อหม้อน้ำแตก",
    status: "รออะไหล่",
    priority: "ด่วน",
    technicians: ["น้อย"],
    pr: "PR26060079",
    note: "รออะไหล่ รถจอดซ่อม",
    items: [
      { name: "ท่อน้ำมันบน 33081-1303010", sourceVehicle: "TS-027" },
      { name: "ท่อน้ำมันล่าง 33081-1303025", sourceVehicle: "TS-027" },
      { name: "แคลมป์รัดท่อ 40–56", sourceVehicle: "TS-027" },
      { name: "แคลมป์รัดท่อ 12–22", sourceVehicle: "TS-027" },
    ],
    photos: 3,
  },
  {
    id: "PR26050226",
    vehicle: "TS-028",
    reportedAt: "23 พ.ค. 2569",
    reportedSort: "2026-05-23",
    completedAt: "23 พ.ค. 2569",
    mileage: 55426,
    symptom: "ไดสตาร์ทไหม้",
    status: "รออะไหล่",
    priority: "สูง",
    technicians: ["สุดใจ", "น้อย"],
    pr: "PR26050226",
    note: "รออะไหล่ รถจอดซ่อม",
    items: [
      { name: "ไดสตาร์ท AZJ3381", qty: 1, unit: "อัน" },
      { name: "กรองก๊าซโซลีน H6150080044", qty: 1, unit: "อัน" },
      { name: "กระบอกคลัตช์บน 66-11-1602300", qty: 1, unit: "อัน" },
    ],
    photos: 1,
  },
  {
    id: "PR26050213",
    vehicle: "TS-028",
    reportedAt: "21 พ.ค. 2569",
    reportedSort: "2026-05-21",
    completedAt: "21 พ.ค. 2569",
    mileage: 55426,
    symptom: "เร่งไม่ขึ้นและมีเสียงผิดปกติขณะเลี้ยว",
    status: "ปิดงาน",
    priority: "สูง",
    technicians: ["สุดใจ", "น้อย"],
    pr: "PR26050213",
    note: "ซ่อมเสร็จ ปล่อยรถแล้ว",
    items: [
      { name: "หัวฉีด 172-1112010", qty: 2, unit: "หัว", sourceVehicle: "TS-035" },
      { name: "สายพานไดชาร์จ 33081-13019", qty: 1, unit: "เส้น", sourceVehicle: "TS-032" },
      { name: "สายพานปั๊มลม", qty: 1, unit: "เส้น", sourceVehicle: "TS-032" },
    ],
    photos: 4,
  },
  {
    id: "PR26050168",
    vehicle: "TS-028",
    reportedAt: "18 พ.ค. 2569",
    reportedSort: "2026-05-18",
    completedAt: "18 พ.ค. 2569",
    mileage: 55426,
    symptom: "ปั๊มคลัตช์บนรั่ว",
    status: "ปิดงาน",
    priority: "ปกติ",
    technicians: ["สมุนไท", "คำหล้า"],
    pr: "PR26050168",
    note: "ซ่อมเสร็จ ปล่อยรถแล้ว",
    items: [
      {
        name: "ปั๊มคลัตช์บน 66-11-1602300",
        qty: 1,
        unit: "อัน",
        sourceVehicle: "TS-029",
      },
    ],
    photos: 3,
  },
  {
    id: "JOB-260511-B",
    vehicle: "TS-028",
    reportedAt: "11 พ.ค. 2569",
    reportedSort: "2026-05-11",
    completedAt: "11 พ.ค. 2569",
    mileage: 100340,
    symptom: "สายแป๊บน้ำมันแตก",
    status: "ปิดงาน",
    priority: "สูง",
    technicians: ["ใจประเสริฐ", "สายสะหมอน"],
    note: "ช่างแก้ไขและปิดงานแล้ว",
    items: [{ name: "สายแป๊บน้ำมัน", sourceVehicle: "TS-027" }],
    photos: 1,
  },
  {
    id: "PR26050099",
    vehicle: "TS-028",
    reportedAt: "11 พ.ค. 2569",
    reportedSort: "2026-05-11",
    completedAt: "16 พ.ค. 2569",
    mileage: 99911,
    symptom: "สตาร์ทไม่ติด",
    status: "ปิดงาน",
    priority: "ด่วน",
    technicians: ["สุดใจ"],
    pr: "PR26050099",
    costLak: 4800000,
    note: "เปลี่ยนไดสตาร์ทและปิดงาน",
    items: [{ name: "ไดสตาร์ทใหม่", qty: 1, unit: "อัน", sourceVehicle: "TS-027" }],
    photos: 2,
  },
  {
    id: "PR26050061",
    vehicle: "TS-028",
    reportedAt: "6 พ.ค. 2569",
    reportedSort: "2026-05-06",
    completedAt: "6 พ.ค. 2569",
    symptom: "กากบาทขาด เข้าเกียร์ยาก",
    status: "กำลังซ่อม",
    priority: "สูง",
    technicians: ["คำหล้า", "สมุนไท"],
    pr: "PR26050061",
    note: "อะไหล่มาถึงแล้ว อยู่ระหว่างตรวจรับ",
    items: [
      { name: "ชุดปั๊มคลัตช์ตัวล่าง 4301-1602512", qty: 1, unit: "ชุด", sourceVehicle: "TS-031" },
      { name: "ชุดปั๊มคลัตช์ตัวบน 66-11-1602300", qty: 1, unit: "ชุด", sourceVehicle: "TS-031" },
    ],
    photos: 3,
  },
  {
    id: "PR26040126",
    vehicle: "TS-028",
    reportedAt: "2 เม.ย. 2569",
    reportedSort: "2026-04-02",
    completedAt: "15 พ.ค. 2569",
    mileage: 55426,
    symptom: "กรองก๊าซโซลีนซึม",
    status: "ปิดงาน",
    priority: "ปกติ",
    technicians: ["สมุนไท"],
    pr: "PR26040126",
    note: "ซ่อมเสร็จ 15 พ.ค. 2569",
    items: [
      { name: "กรองก๊าซโซลีน FT020-1117010", qty: 1, unit: "อัน" },
      { name: "ปั๊มคลัตช์ล่าง 4301-1602510", qty: 1, unit: "อัน" },
      { name: "ผ้าเบรกหลัง 3308-3502090", qty: 4, unit: "ชิ้น" },
      { name: "ผ้าเบรกหน้า 3308-3501090", qty: 4, unit: "ชิ้น" },
      { name: "ยาง 12.00R18", qty: 4, unit: "เส้น" },
    ],
    photos: 2,
  },
  {
    id: "JOB-260325",
    vehicle: "TS-028",
    reportedAt: "25 มี.ค. 2569",
    reportedSort: "2026-03-25",
    completedAt: "25 มี.ค. 2569",
    mileage: 55426,
    symptom: "น้ำมันก๊าซโซลีนรั่วซึม",
    status: "ปิดงาน",
    priority: "สูง",
    technicians: ["สมุนไท"],
    note: "ซ่อมเสร็จ ปล่อยรถแล้ว",
    items: [{ name: "ตรวจและแก้ไขระบบน้ำมัน" }],
    photos: 5,
  },
  {
    id: "JOB-260322",
    vehicle: "TS-028",
    reportedAt: "22 มี.ค. 2569",
    reportedSort: "2026-03-22",
    completedAt: "23 มี.ค. 2569",
    mileage: 55428,
    symptom: "ยางรั่ว",
    status: "ปิดงาน",
    priority: "ปกติ",
    technicians: [],
    note: "ยางเก่ารั่ว ซ่อมเสร็จและปล่อยรถแล้ว",
    items: [{ name: "ยางรถบรรทุก", qty: 1, unit: "เส้น", sourceVehicle: "TS-035" }],
    photos: 3,
  },
  {
    id: "JOB-260304",
    vehicle: "TS-028",
    reportedAt: "4 มี.ค. 2569",
    reportedSort: "2026-03-04",
    completedAt: "4 มี.ค. 2569",
    mileage: 55425,
    symptom: "สตาร์ทเครื่องไม่ได้",
    status: "ปิดงาน",
    priority: "ด่วน",
    technicians: ["คำหล้า"],
    note: "ซ่อมเสร็จ ปล่อยรถแล้ว",
    items: [{ name: "ตรวจระบบสตาร์ท" }],
    photos: 2,
  },
  {
    id: "JOB-260303-A",
    vehicle: "TS-028",
    reportedAt: "3 มี.ค. 2569",
    reportedSort: "2026-03-03",
    completedAt: "3 มี.ค. 2569",
    symptom: "ไส้กรองอากาศอุดตัน",
    status: "ปิดงาน",
    priority: "ปกติ",
    technicians: [],
    note: "เปลี่ยนแล้ว ปล่อยรถ",
    items: [{ name: "กรองอากาศ", qty: 1, unit: "อัน", sourceVehicle: "TS-035" }],
    photos: 1,
  },
  {
    id: "JOB-260303",
    vehicle: "TS-028",
    reportedAt: "3 มี.ค. 2569",
    reportedSort: "2026-03-03",
    completedAt: "3 มี.ค. 2569",
    symptom: "น้ำมันก๊าซโซลีนรั่วซึม",
    status: "ปิดงาน",
    priority: "สูง",
    technicians: ["คำหล้า"],
    note: "ซ่อมเสร็จ ปล่อยรถแล้ว",
    items: [{ name: "กรองน้ำมันก๊าซโซลีน", sourceVehicle: "TS-033" }],
    photos: 1,
  },
];

const statusOrder: RepairStatus[] = ["รออะไหล่", "กำลังซ่อม", "ปิดงาน"];

function formatLak(value?: number) {
  if (!value) return "ยังไม่ระบุ";
  return `${new Intl.NumberFormat("th-TH").format(value)} ₭`;
}

function StatusBadge({ status }: { status: RepairStatus }) {
  return <span className={`status status-${status}`}>{status}</span>;
}

function Icon({ children }: { children: string }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

export default function Home() {
  const [repairs, setRepairs] = useState(initialRepairs);
  const [activeStatus, setActiveStatus] = useState<RepairStatus | "ทั้งหมด">("ทั้งหมด");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Repair | null>(initialRepairs[0]);
  const [formOpen, setFormOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  const stats = useMemo(() => {
    const waiting = repairs.filter((repair) => repair.status === "รออะไหล่").length;
    const active = repairs.filter((repair) => repair.status === "กำลังซ่อม").length;
    const closed = repairs.filter((repair) => repair.status === "ปิดงาน").length;
    const cost = repairs.reduce((sum, repair) => sum + (repair.costLak || 0), 0);
    return { waiting, active, closed, cost };
  }, [repairs]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return repairs
      .filter((repair) => activeStatus === "ทั้งหมด" || repair.status === activeStatus)
      .filter((repair) => {
        if (!term) return true;
        return [
          repair.id,
          repair.vehicle,
          repair.symptom,
          repair.pr,
          repair.note,
          ...repair.technicians,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => b.reportedSort.localeCompare(a.reportedSort));
  }, [activeStatus, repairs, search]);

  function createRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const symptom = String(form.get("symptom") || "งานซ่อมใหม่");
    const mileage = Number(form.get("mileage")) || undefined;
    const priority = String(form.get("priority") || "ปกติ") as Priority;
    const newRepair: Repair = {
      id: `JOB-${String(repairs.length + 1).padStart(4, "0")}`,
      vehicle: "TS-028",
      reportedAt: "วันนี้",
      reportedSort: "2026-07-30",
      mileage,
      symptom,
      status: "กำลังซ่อม",
      priority,
      technicians: [],
      note: "สร้างจากแบบฟอร์มแจ้งซ่อม",
      items: [],
      photos: 0,
    };
    setRepairs((current) => [newRepair, ...current]);
    setSelected(newRepair);
    setActiveStatus("ทั้งหมด");
    setFormOpen(false);
    setToast(`สร้างใบงาน ${newRepair.id} แล้ว`);
    window.setTimeout(() => setToast(""), 3200);
    event.currentTarget.reset();
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>FLEET FIX</strong>
            <span>ระบบงานซ่อมรถบริการ</span>
          </div>
        </div>
        <nav aria-label="เมนูหลัก">
          <a className="nav-item active" href="#dashboard" onClick={() => setMenuOpen(false)}>
            <Icon>⌂</Icon> ภาพรวม
          </a>
          <a className="nav-item" href="#repairs" onClick={() => setMenuOpen(false)}>
            <Icon>≡</Icon> งานซ่อม
            <span className="nav-count">{stats.waiting + stats.active}</span>
          </a>
          <a className="nav-item" href="#vehicles" onClick={() => setMenuOpen(false)}>
            <Icon>▣</Icon> รถบริการ
          </a>
          <a className="nav-item" href="#parts" onClick={() => setMenuOpen(false)}>
            <Icon>◇</Icon> อะไหล่และ PR
          </a>
          <a className="nav-item" href="#reports" onClick={() => setMenuOpen(false)}>
            <Icon>↗</Icon> รายงาน
          </a>
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" />
          <div>
            <strong>ข้อมูลจาก Excel</strong>
            <span>TS-028 · 15 งานซ่อม</span>
          </div>
        </div>
        <div className="profile">
          <div className="avatar">จ</div>
          <div>
            <strong>ผู้ดูแลรถบริการ</strong>
            <span>ฝ่ายซ่อมบำรุง</span>
          </div>
          <button aria-label="ตัวเลือกบัญชี">•••</button>
        </div>
      </aside>

      {menuOpen && <button className="menu-backdrop" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} />}

      <main>
        <header className="topbar">
          <button className="menu-button" aria-label="เปิดเมนู" onClick={() => setMenuOpen(true)}>☰</button>
          <label className="global-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาเลขรถ อาการ ช่าง หรือ PR..."
              aria-label="ค้นหางานซ่อม"
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="top-actions">
            <button className="icon-button" aria-label="การแจ้งเตือน">♢<span className="notification-dot" /></button>
            <button className="primary-button" onClick={() => setFormOpen(true)}>
              <span>＋</span> แจ้งซ่อมใหม่
            </button>
          </div>
        </header>

        <section className="content" id="dashboard">
          <div className="page-heading">
            <div>
              <p className="eyebrow">ศูนย์ควบคุมงานซ่อม</p>
              <h1>รถทุกคัน พร้อมใช้งานเมื่อคุณต้องการ</h1>
              <p>ติดตามอาการ อะไหล่ ช่าง และเวลาจอดซ่อมในที่เดียว</p>
            </div>
            <div className="updated">
              <span className="live-dot" />
              อัปเดตล่าสุด วันนี้ 13:10
            </div>
          </div>

          <div className="summary-grid">
            <article className="summary-card urgent">
              <div className="summary-icon">!</div>
              <div>
                <span>รออะไหล่</span>
                <strong>{stats.waiting}</strong>
                <small>คัน/ใบงานที่ต้องติดตาม</small>
              </div>
              <span className="trend trend-warn">ต้องเร่ง 3</span>
            </article>
            <article className="summary-card">
              <div className="summary-icon dark">↻</div>
              <div>
                <span>กำลังซ่อม</span>
                <strong>{stats.active}</strong>
                <small>งานอยู่ระหว่างดำเนินการ</small>
              </div>
              <span className="trend">ภายในแผน</span>
            </article>
            <article className="summary-card">
              <div className="summary-icon green">✓</div>
              <div>
                <span>ปิดงานแล้ว</span>
                <strong>{stats.closed}</strong>
                <small>จากทั้งหมด {repairs.length} ใบงาน</small>
              </div>
              <span className="trend trend-good">{Math.round((stats.closed / repairs.length) * 100)}%</span>
            </article>
            <article className="summary-card cost-card">
              <div className="summary-icon light">₭</div>
              <div>
                <span>ค่าใช้จ่ายที่บันทึก</span>
                <strong>{formatLak(stats.cost)}</strong>
                <small>เฉพาะรายการที่มีราคาใน Excel</small>
              </div>
            </article>
          </div>

          <section className="vehicle-strip" id="vehicles">
            <div className="vehicle-identity">
              <div className="truck-visual" aria-hidden="true">
                <div className="truck-cab" />
                <div className="truck-bed" />
                <i className="wheel wheel-a" />
                <i className="wheel wheel-b" />
              </div>
              <div>
                <span className="vehicle-label">รถบริการที่เลือก</span>
                <h2>TS-028</h2>
                <p>รถบรรทุกบริการ · ประวัติ {repairs.length} งานซ่อม</p>
              </div>
            </div>
            <div className="vehicle-metrics">
              <div><span>เลขไมล์ล่าสุด</span><strong>256,808 กม.</strong></div>
              <div><span>สถานะรถ</span><strong className="vehicle-down"><i /> จอดซ่อม</strong></div>
              <div><span>งานเปิด</span><strong>{stats.waiting + stats.active} รายการ</strong></div>
            </div>
            <button className="text-button">ดูประวัติรถ <span>→</span></button>
          </section>

          <section className="workspace" id="repairs">
            <div className="repair-panel">
              <div className="panel-header">
                <div>
                  <h2>คิวงานซ่อม</h2>
                  <p>เรียงจากรายการล่าสุด</p>
                </div>
                <button className="filter-button" aria-label="ตัวกรองเพิ่มเติม">☷ <span>ตัวกรอง</span></button>
              </div>
              <div className="tabs" role="tablist" aria-label="กรองตามสถานะ">
                {(["ทั้งหมด", ...statusOrder] as const).map((status) => {
                  const count =
                    status === "ทั้งหมด"
                      ? repairs.length
                      : repairs.filter((repair) => repair.status === status).length;
                  return (
                    <button
                      key={status}
                      role="tab"
                      aria-selected={activeStatus === status}
                      className={activeStatus === status ? "active" : ""}
                      onClick={() => setActiveStatus(status)}
                    >
                      {status} <span>{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="repair-list">
                {filtered.length === 0 ? (
                  <div className="empty-state">
                    <span>⌕</span>
                    <strong>ไม่พบงานซ่อมที่ค้นหา</strong>
                    <p>ลองเปลี่ยนคำค้นหาหรือเลือกสถานะอื่น</p>
                  </div>
                ) : (
                  filtered.map((repair) => (
                    <button
                      key={repair.id}
                      className={`repair-row ${selected?.id === repair.id ? "selected" : ""}`}
                      onClick={() => setSelected(repair)}
                    >
                      <span className={`priority priority-${repair.priority}`}>{repair.priority}</span>
                      <span className="repair-main">
                        <strong>{repair.symptom}</strong>
                        <small>{repair.id} · {repair.vehicle}</small>
                      </span>
                      <span className="repair-meta hide-mobile">
                        <small>วันที่แจ้ง</small>
                        <strong>{repair.reportedAt}</strong>
                      </span>
                      <span className="repair-meta hide-tablet">
                        <small>ช่างรับผิดชอบ</small>
                        <strong>{repair.technicians.join(", ") || "ยังไม่มอบหมาย"}</strong>
                      </span>
                      <span className="repair-status-cell">
                        <StatusBadge status={repair.status} />
                        <small>{repair.photos ? `▧ ${repair.photos} รูป` : "ยังไม่มีรูป"}</small>
                      </span>
                      <span className="row-arrow">›</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <aside className="detail-panel" aria-live="polite">
              {selected ? (
                <>
                  <div className="detail-head">
                    <div>
                      <span className={`priority priority-${selected.priority}`}>{selected.priority}</span>
                      <StatusBadge status={selected.status} />
                    </div>
                    <button aria-label="ตัวเลือกใบงาน">•••</button>
                  </div>
                  <span className="detail-id">{selected.id}</span>
                  <h2>{selected.symptom}</h2>
                  <p className="detail-note">{selected.note || "—"}</p>

                  <div className="detail-facts">
                    <div><span>รถ</span><strong>{selected.vehicle}</strong></div>
                    <div><span>เลขไมล์</span><strong>{selected.mileage ? `${new Intl.NumberFormat("th-TH").format(selected.mileage)} กม.` : "—"}</strong></div>
                    <div><span>วันที่แจ้ง</span><strong>{selected.reportedAt}</strong></div>
                    <div><span>วันที่เสร็จ</span><strong>{selected.completedAt || "—"}</strong></div>
                  </div>

                  <div className="detail-section">
                    <div className="detail-title">
                      <h3>อะไหล่และรายการซ่อม</h3>
                      <span>{selected.items.length}</span>
                    </div>
                    <ul className="parts-list">
                      {selected.items.length ? selected.items.map((item, index) => (
                        <li key={`${item.name}-${index}`}>
                          <span>{index + 1}</span>
                          <div>
                            <strong>{item.name}</strong>
                            <small>
                              {item.qty ? `${item.qty} ${item.unit || ""}` : "ไม่ระบุจำนวน"}
                              {item.sourceVehicle ? ` · เบิกจาก ${item.sourceVehicle}` : ""}
                            </small>
                          </div>
                        </li>
                      )) : <li className="no-parts">ยังไม่มีรายการอะไหล่</li>}
                    </ul>
                  </div>

                  <div className="detail-section">
                    <h3>ผู้รับผิดชอบ</h3>
                    <div className="technicians">
                      {selected.technicians.length ? selected.technicians.map((name) => (
                        <span key={name}><i>{name.slice(0, 1)}</i>{name}</span>
                      )) : <span className="muted">ยังไม่มอบหมายช่าง</span>}
                    </div>
                  </div>

                  <div className="detail-footer">
                    <div>
                      <span>เลข PR</span>
                      <strong>{selected.pr || "ยังไม่มี PR"}</strong>
                    </div>
                    <button>อัปเดตสถานะ</button>
                  </div>
                </>
              ) : (
                <div className="empty-detail">เลือกใบงานเพื่อดูรายละเอียด</div>
              )}
            </aside>
          </section>
        </section>
      </main>

      {formOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setFormOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-repair-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">สร้างใบงาน</p>
                <h2 id="new-repair-title">แจ้งซ่อมรถบริการ</h2>
              </div>
              <button aria-label="ปิดแบบฟอร์ม" onClick={() => setFormOpen(false)}>×</button>
            </div>
            <form onSubmit={createRepair}>
              <div className="form-row">
                <label>
                  <span>รถบริการ</span>
                  <select name="vehicle" defaultValue="TS-028">
                    <option>TS-028</option>
                  </select>
                </label>
                <label>
                  <span>เลขไมล์ปัจจุบัน</span>
                  <input name="mileage" inputMode="numeric" placeholder="เช่น 256808" />
                </label>
              </div>
              <label>
                <span>อาการที่พบ <b>*</b></span>
                <textarea name="symptom" required rows={3} placeholder="อธิบายอาการ ตำแหน่ง และเวลาที่เริ่มพบ..." />
              </label>
              <div className="form-row">
                <label>
                  <span>ความเร่งด่วน</span>
                  <select name="priority" defaultValue="ปกติ">
                    <option>ปกติ</option>
                    <option>สูง</option>
                    <option>ด่วน</option>
                  </select>
                </label>
                <label>
                  <span>ผู้แจ้ง</span>
                  <input name="reporter" defaultValue="ผู้ดูแลรถบริการ" />
                </label>
              </div>
              <label className="upload-zone">
                <input type="file" accept="image/*" multiple />
                <span className="upload-icon">▧</span>
                <strong>แนบรูปอาการหรือจุดเสียหาย</strong>
                <small>ลากไฟล์มาวาง หรือกดเพื่อเลือกภาพ</small>
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>ยกเลิก</button>
                <button type="submit" className="primary-button">สร้างใบแจ้งซ่อม</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  );
}
