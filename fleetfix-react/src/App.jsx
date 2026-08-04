import { useCallback, useEffect, useMemo, useState } from 'react';
import { ORDER } from './constants.js';
import { decorate, filterJobs, fmt, totals } from './utils.js';
import * as api from './lib/api';
import { backendName, isApiDown, isConfigured } from './lib/api';
import Sidebar from './components/Sidebar.jsx';
import NewJobModal from './components/NewJobModal.jsx';
import EditJobModal from './components/EditJobModal.jsx';
import Notice from './components/Notice.jsx';
import Dialog from './components/Dialog.jsx';
import Icon from './components/Icon.jsx';
import JobListScreen from './screens/JobListScreen.jsx';
import JobDetailScreen from './screens/JobDetailScreen.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';
import FleetScreen from './screens/FleetScreen.jsx';
import PlacesScreen from './screens/PlacesScreen.jsx';
import VehicleNewScreen from './screens/VehicleNewScreen.jsx';

export default function App() {
  // ── ข้อมูลจากฐานข้อมูล ───────────────────────────────────
  const [data, setData] = useState({ jobs: [], vehicles: [], places: [] });
  const [stats, setStats] = useState(null); // ตัวเลขแดชบอร์ดจากฐานข้อมูล
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ── สถานะหน้าจอ ─────────────────────────────────────────
  const [screen, setScreen] = useState('list');
  const [view, setView] = useState('table');
  const [jobIdx, setJobIdx] = useState(0);
  const [filter, setFilter] = useState('ทั้งหมด');
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [actionError, setActionError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [savedJob, setSavedJob] = useState(null); // ใบงานที่เพิ่งบันทึก — ใช้แสดง pop-up ยืนยัน
  const [editOpen, setEditOpen] = useState(false); // ฟอร์มแก้ไขใบงาน
  const [deleteTarget, setDeleteTarget] = useState(null); // ใบงานที่รอยืนยันลบ
  const [vehicleTarget, setVehicleTarget] = useState(null); // รถที่รอยืนยันลบ/เลิกใช้งาน

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // แดชบอร์ดใช้ตัวเลขที่ฐานข้อมูลคำนวณ (ค่าซ่อมรายเดือน, เวลาซ่อมเฉลี่ย)
      const [next, dash] = await Promise.all([api.fetchAll(), api.fetchDashboard()]);
      setData(next);
      setStats(dash);
      setSelectedVehicle((cur) => cur ?? next.vehicles[0]?.code ?? null);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConfigured) reload();
    else setLoading(false);
  }, [reload]);

  const { jobs, vehicles, places } = data;

  const counts = useMemo(() => {
    const c = { 'ทั้งหมด': jobs.length };
    ORDER.forEach((s) => {
      c[s] = jobs.filter((j) => j.status === s).length;
    });
    return c;
  }, [jobs]);

  const visible = useMemo(
    () => filterJobs(jobs, filter, query).map(({ job, index }) => ({ job: decorate(job), index })),
    [jobs, filter, query]
  );

  const perVehicle = useMemo(
    () =>
      vehicles.map((v) => {
        const list = jobs.filter((j) => j.vehicle === v.code);
        return { ...v, count: list.length, cost: list.reduce((a, j) => a + totals(j).grand, 0) };
      }),
    [vehicles, jobs]
  );

  // รายชื่อช่างที่เคยมีในระบบ — ใช้เป็นตัวเลือกในฟอร์มแจ้งซ่อม
  const technicianOptions = useMemo(() => {
    const names = new Set();
    jobs.forEach((j) => {
      (j.tech || '')
        .split('+')
        .map((t) => t.trim())
        .filter((t) => t && t !== '—')
        .forEach((t) => names.add(t));
    });
    return [...names].sort();
  }, [jobs]);

  const pendingCost = useMemo(
    () => fmt(jobs.filter((j) => j.status !== 'เสร็จแล้ว').reduce((a, j) => a + totals(j).grand, 0)),
    [jobs]
  );

  // ── การกระทำที่เขียนลงฐานข้อมูล ──────────────────────────
  const run = useCallback(
    async (fn) => {
      setActionError('');
      try {
        await fn();
        await reload();
        return true;
      } catch (err) {
        setActionError(err.message || String(err));
        return false;
      }
    },
    [reload]
  );

  function openJob(index) {
    setJobIdx(index);
    setScreen('detail');
  }

  const currentJob = jobs[jobIdx] || jobs[0];
  const currentJobId = screen === 'detail' ? currentJob?._id : null;

  // โหลดรูปของใบงานที่กำลังเปิดอยู่
  useEffect(() => {
    if (!currentJobId) {
      setPhotos([]);
      return;
    }
    let alive = true;
    api
      .fetchJobPhotos(currentJobId)
      .then((list) => alive && setPhotos(list))
      .catch((err) => alive && setActionError(err.message));
    return () => {
      alive = false;
    };
  }, [currentJobId]);

  const reloadPhotos = useCallback(async (jobId) => {
    setPhotos(await api.fetchJobPhotos(jobId));
  }, []);

  // ── หน้าจอพิเศษ: ตั้งค่าไม่ครบ / ยังไม่ล็อกอิน / โหลด / error ──
  if (loadError && isApiDown(loadError) && backendName === 'supabase') {
    return (
      <Notice title="ยังไม่ได้สร้างตารางในฐานข้อมูล" tone="warn" onRetry={reload}>
        ต่อ Supabase ได้แล้ว แต่ยังไม่พบตาราง/view ของระบบ — ต้อง apply migration ก่อนหนึ่งครั้ง
        <br />
        <br />
        เปิด Supabase Dashboard → SQL Editor แล้วรันไฟล์ใน <code>supabase/migrations/</code> ตามลำดับเลขหน้า
        (0100 → 0800) จากนั้น <code>supabase/seed.sql</code> ถ้าต้องการข้อมูลตัวอย่าง
        <br />
        <br />
        <span style={{ fontSize: 12, color: '#8a837a' }}>รายละเอียด: {loadError.message}</span>
      </Notice>
    );
  }

  if (loadError && isApiDown(loadError)) {
    return (
      <Notice title="ต่อ API ไม่ได้" tone="warn" onRetry={reload}>
        แอปนี้อ่าน-เขียนข้อมูลผ่าน Go API ในโฟลเดอร์ <code>stores</code> — ต้องรันเซิร์ฟเวอร์นั้นไว้ด้วย
        <br />
        <br />
        เปิดอีกหน้าต่างเทอร์มินัลแล้วสั่ง:
        <br />
        <code>cd stores</code>
        <br />
        <code>./run.ps1</code>
        <span style={{ color: '#8a837a' }}> (หรือ </span>
        <code>go run ./cmd/server</code>
        <span style={{ color: '#8a837a' }}> ถ้า Windows ไม่บล็อก)</span>
        <br />
        <br />
        ตรวจว่าขึ้นแล้วด้วย <code>curl http://localhost:8080/api/health</code>
        <br />
        ถ้า API อยู่ที่อื่น ตั้งค่า <code>VITE_API_URL</code> ใน <code>.env.local</code> แล้วรีสตาร์ท{' '}
        <code>npm run dev</code>
        <br />
        <br />
        <span style={{ fontSize: 12, color: '#8a837a' }}>รายละเอียด: {loadError.message}</span>
      </Notice>
    );
  }

  if (loadError) {
    return (
      <Notice title="โหลดข้อมูลไม่สำเร็จ" tone="error" onRetry={reload}>
        {loadError.message}
        <br />
        <br />
        <span style={{ fontSize: 12, color: '#8a837a' }}>
          ดู log ของ Go API ในเทอร์มินัลที่รัน <code>go run ./cmd/server</code> ประกอบ — ข้อความ 500
          จะมีรายละเอียดจริงอยู่ที่นั่น (API ไม่ส่งออกมาให้เบราว์เซอร์)
        </span>
      </Notice>
    );
  }

  if (loading && jobs.length === 0) {
    return <Notice title="กำลังโหลดข้อมูลงานซ่อม...">ดึงใบงาน อะไหล่ ทะเบียนรถ และสถานที่ซ่อมจาก API</Notice>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', minHeight: '100vh', alignItems: 'stretch' }}>
      <Sidebar
        screen={screen}
        openCount={counts['ทั้งหมด'] - counts['เสร็จแล้ว']}
        onNavigate={(key) => setScreen(key)}
        onReload={reload}
        busy={loading}
        sourceLabel={backendName === 'supabase' ? 'ข้อมูลจาก Supabase' : 'ข้อมูลผ่าน Go API'}
      />

      <main style={{ minWidth: 1120, display: 'flex', flexDirection: 'column' }}>
        {actionError && (
          <div
            style={{
              background: '#fdecea',
              borderBottom: '1px solid #f5c9c4',
              color: '#b3261e',
              fontSize: '12.5px',
              padding: '10px 28px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span>บันทึกไม่สำเร็จ: {actionError}</span>
            <button
              onClick={() => setActionError('')}
              style={{ background: 'none', border: 0, color: '#b3261e', cursor: 'pointer', fontSize: '12.5px' }}
            >
              ปิด
            </button>
          </div>
        )}

        {screen === 'list' && (
          <JobListScreen
            jobs={visible}
            counts={counts}
            totalJobs={jobs.length}
            pendingCost={pendingCost}
            filter={filter}
            setFilter={setFilter}
            query={query}
            setQuery={setQuery}
            view={view}
            setView={setView}
            onOpenJob={openJob}
            onNewJob={() => setFormOpen(true)}
          />
        )}

        {screen === 'detail' && currentJob && (
          <JobDetailScreen
            job={currentJob}
            photos={photos}
            onBack={() => setScreen('list')}
            onAdvance={() => run(() => api.advanceJob(currentJob._id))}
            onAddPart={(input) => run(() => api.createPart(currentJob._id, input))}
            onUpdatePart={(partId, input) => run(() => api.updatePart(partId, input))}
            onDeletePart={(partId) => run(() => api.deletePart(partId))}
            onUploadPhoto={async (file, kind) => {
              await api.uploadJobPhoto(currentJob._id, file, kind);
              await reloadPhotos(currentJob._id);
              await reload(); // ให้จำนวนรูปในรายการงานอัปเดตตาม
            }}
            onDeletePhoto={async (photoId) => {
              await api.deleteJobPhoto(photoId);
              await reloadPhotos(currentJob._id);
              await reload();
            }}
            onEdit={() => setEditOpen(true)}
            onDelete={() => setDeleteTarget(currentJob)}
          />
        )}

        {screen === 'dash' && (
          <DashboardScreen
            counts={counts}
            perVehicle={perVehicle}
            jobs={jobs}
            stats={stats}
            onOpenVehicle={(code) => {
              setSelectedVehicle(code);
              setScreen('fleet');
            }}
          />
        )}

        {screen === 'fleet' && (
          <FleetScreen
            perVehicle={perVehicle}
            selectedCode={selectedVehicle}
            onSelect={setSelectedVehicle}
            jobs={jobs}
            onOpenJob={openJob}
            onNewJob={() => setFormOpen(true)}
          />
        )}

        {screen === 'vehNew' && (
          <VehicleNewScreen
            vehicles={perVehicle}
            onAdd={async (form) => {
              const ok = await run(() => api.createVehicle(form));
              if (ok) setSelectedVehicle(form.code);
              return ok;
            }}
            onUpdate={(id, form) => run(() => api.updateVehicle(id, form))}
            onDelete={(v) => setVehicleTarget(v)}
          />
        )}

        {screen === 'places' && (
          <PlacesScreen
            places={places}
            jobs={jobs}
            onAdd={(form) => run(() => api.createPlace(form))}
            onUpdate={(id, form) => run(() => api.updatePlace(id, form))}
            onRemove={(place) => run(() => api.deactivatePlace(place._id))}
          />
        )}
      </main>

      {editOpen && currentJob && (
        <EditJobModal
          job={currentJob}
          vehicles={vehicles}
          places={places}
          technicianOptions={technicianOptions}
          onClose={() => setEditOpen(false)}
          onSave={(draft) => run(() => api.updateJob(currentJob._id, draft))}
        />
      )}

      {deleteTarget && (
        <Dialog
          title="ลบใบแจ้งซ่อมนี้?"
          tone="error"
          onClose={() => setDeleteTarget(null)}
          actions={
            <>
              <button
                className="hov-border"
                onClick={() => setDeleteTarget(null)}
                style={{
                  background: '#fff',
                  border: '1px solid #d8d1c4',
                  borderRadius: 8,
                  padding: '9px 15px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  const ok = await run(() => api.deleteJob(target._id));
                  if (ok) {
                    setScreen('list');
                    setJobIdx(0);
                  }
                }}
                style={{
                  background: '#b3261e',
                  color: '#fff',
                  border: 0,
                  borderRadius: 8,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <Icon name="trash" size={15} /> ลบถาวร
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <strong style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{deleteTarget.code}</strong> ·{' '}
              {deleteTarget.vehicle} · {deleteTarget.symptom}
            </div>
            <div style={{ color: '#b3261e' }}>
              จะลบพร้อมกันทั้ง อะไหล่ {deleteTarget.parts.length} รายการ
              {deleteTarget.photos > 0 && ` · รูป ${deleteTarget.photos} รูป`} · ไทม์ไลน์ทั้งหมด
            </div>
            <div style={{ color: '#8a837a', fontSize: 12 }}>เอาคืนไม่ได้ — ถ้าต้องการเก็บประวัติไว้ ให้เปลี่ยนสถานะเป็น "เสร็จแล้ว" แทน</div>
          </div>
        </Dialog>
      )}

      {vehicleTarget && (
        <Dialog
          title={vehicleTarget.count > 0 ? 'เลิกใช้งานรถคันนี้?' : 'ลบทะเบียนรถนี้?'}
          tone={vehicleTarget.count > 0 ? 'warn' : 'error'}
          onClose={() => setVehicleTarget(null)}
          actions={
            <>
              <button
                className="hov-border"
                onClick={() => setVehicleTarget(null)}
                style={{
                  background: '#fff',
                  border: '1px solid #d8d1c4',
                  borderRadius: 8,
                  padding: '9px 15px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  const target = vehicleTarget;
                  setVehicleTarget(null);
                  // รถที่มีใบงานลบถาวรไม่ได้ (FK on delete restrict) — เลิกใช้งานแทน
                  if (target.count > 0) {
                    await run(() =>
                      api.updateVehicle(target._id, {
                        code: target.code,
                        model: target.model === 'ไม่ระบุรุ่น' ? '' : target.model,
                        plate: target.plate,
                        type: '',
                        owner: '',
                        note: target.note,
                        isActive: false,
                      })
                    );
                  } else {
                    await run(() => api.deleteVehicle(target._id));
                  }
                }}
                style={{
                  background: vehicleTarget.count > 0 ? '#b45309' : '#b3261e',
                  color: '#fff',
                  border: 0,
                  borderRadius: 8,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <Icon name="trash" size={15} /> {vehicleTarget.count > 0 ? 'เลิกใช้งาน' : 'ลบถาวร'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <strong style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{vehicleTarget.code}</strong> ·{' '}
              {vehicleTarget.model}
              {vehicleTarget.plate ? ` · ${vehicleTarget.plate}` : ''}
            </div>
            {vehicleTarget.count > 0 ? (
              <>
                <div style={{ color: '#8a4a06' }}>
                  รถคันนี้มีใบงาน {vehicleTarget.count} ใบ · ค่าซ่อมรวม {fmt(vehicleTarget.cost)} บาท — ลบถาวรไม่ได้
                </div>
                <div style={{ color: '#8a837a', fontSize: 12 }}>
                  จะตั้งเป็น "เลิกใช้งาน" แทน — รถจะหายจากรายการและตัวเลือกในฟอร์ม แต่ประวัติซ่อมยังอยู่ครบ
                </div>
              </>
            ) : (
              <div style={{ color: '#8a837a', fontSize: 12 }}>รถคันนี้ยังไม่มีใบงาน ลบได้เลย · เอาคืนไม่ได้</div>
            )}
          </div>
        </Dialog>
      )}

      {savedJob && (
        <Dialog
          title="บันทึกใบแจ้งซ่อมแล้ว"
          onClose={() => setSavedJob(null)}
          actions={
            <>
              <button
                className="hov-border"
                onClick={() => setSavedJob(null)}
                style={{
                  background: '#fff',
                  border: '1px solid #d8d1c4',
                  borderRadius: 8,
                  padding: '9px 15px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ปิด
              </button>
              <button
                className="hov-orange"
                onClick={() => {
                  const index = jobs.findIndex((j) => j._id === savedJob.job._id);
                  setSavedJob(null);
                  if (index >= 0) openJob(index);
                }}
                style={{
                  background: '#b45309',
                  color: '#fff',
                  border: 0,
                  borderRadius: 8,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                เปิดดูใบงาน
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>
              เลขที่ใบงาน{' '}
              <strong style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{savedJob.job.code}</strong>
            </div>
            <div style={{ color: '#6f6860' }}>
              เบอร์รถ {savedJob.job.vehicle} · สถานะ {savedJob.job.status}
            </div>
            <div style={{ color: '#6f6860' }}>
              อะไหล่ {savedJob.job.parts.length} รายการ · รวม {fmt(totals(savedJob.job).grand)} บาท
              {savedJob.photoCount > 0 && ` · แนบรูป ${savedJob.photoCount} รูป`}
            </div>
            {savedJob.job.tech !== '—' && <div style={{ color: '#6f6860' }}>ช่างที่ทำ {savedJob.job.tech}</div>}
          </div>
        </Dialog>
      )}

      {formOpen && (
        <NewJobModal
          vehicles={vehicles}
          places={places}
          technicianOptions={technicianOptions}
          onClose={() => setFormOpen(false)}
          onSave={async (draft) => {
            let created = null;
            let uploaded = 0;
            const ok = await run(async () => {
              created = await api.createJob(draft);
              // ต้องมีใบงานก่อนจึงอัปโหลดรูปได้ — ทำต่อทันทีหลังสร้างสำเร็จ
              for (const file of draft.photos || []) {
                await api.uploadJobPhoto(created._id, file, 'before');
                uploaded += 1;
              }
            });
            if (ok && created) setSavedJob({ job: created, photoCount: uploaded });
            if (ok) {
              setFormOpen(false);
              setScreen('list');
              setFilter('ทั้งหมด');
              setQuery('');
              setJobIdx(0);
            }
            return ok;
          }}
        />
      )}
    </div>
  );
}
