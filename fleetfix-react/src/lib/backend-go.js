// ────────────────────────────────────────────────────────────
// เรียก Go API ในโฟลเดอร์ ../stores (ไม่ได้ต่อ Supabase ตรงแล้ว)
//
// ข้อดีของการผ่าน API: การสร้างใบงานเป็น transaction เดียวจริง ๆ ฝั่งเซิร์ฟเวอร์
// และไม่มีกุญแจฐานข้อมูลอยู่ในไฟล์ JS ที่ส่งให้เบราว์เซอร์
//
// ชั้นนี้แปลงข้อมูลให้อยู่ในรูปแบบเดิมที่หน้าจอใช้ (status เป็นชื่อไทย,
// วันที่แบบ dd/mm/yyyy, ชื่อคีย์อะไหล่แบบเดิม) หน้าจอจึงไม่ต้องแก้
// ฟิลด์ `_id` คือ uuid จริงในฐานข้อมูล ใช้เวลาสั่งแก้ข้อมูล
// ────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');

export const isConfigured = Boolean(BASE);

/** true เมื่อเรียก API ไม่ติดเลย (เซิร์ฟเวอร์ยังไม่ได้รัน / ผิด origin) */
export function isApiDown(error) {
  return error?.name === 'ApiUnreachable';
}

async function request(method, path, body) {
  const isForm = body instanceof FormData;
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      // FormData ต้องให้เบราว์เซอร์ใส่ Content-Type เอง (มี boundary ต่อท้าย)
      headers: body === undefined || isForm ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (cause) {
    const err = new Error(`ติดต่อ API ที่ ${BASE} ไม่ได้`);
    err.name = 'ApiUnreachable';
    err.cause = cause;
    throw err;
  }

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || `${method} ${path} ล้มเหลว (${res.status})`);
  }
  return data;
}

// ── แปลงข้อมูลจาก API → รูปแบบที่หน้าจอใช้ ───────────────────

/** 2026-05-06 → 06/05/2026 */
function thaiDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function mapPart(p) {
  return {
    _id: p.id,
    name: p.name,
    partNo: p.partNo || '—',
    qty: p.qty,
    unit: p.unit,
    unitPrice: p.unitPrice,
    disc: p.discountPct,
    pr: p.prCode || '',
  };
}

function mapJob(j) {
  return {
    _id: j.id,
    code: j.code,
    statusCode: j.status,
    vehicle: j.vehicleCode,
    mileage: j.mileage ?? 0,
    symptom: j.symptom,
    rootCause: j.rootCause || '—',
    status: j.statusLabel,
    tech: j.technicians || '—',
    pr: j.prCodes?.[0] || '',
    reportedAt: thaiDate(j.reportedOn),
    breakDate: thaiDate(j.breakOn),
    doneDate: thaiDate(j.doneOn),
    reporter: j.reporter || '—',
    place: j.placeName || '—',
    note: j.note || '—',
    photos: j.photoCount ?? 0,
    age: j.ageDays ?? 0,
    parts: (j.parts || []).map(mapPart),
  };
}

function mapVehicle(v) {
  return {
    _id: v.id,
    code: v.code,
    model: v.brandModel || v.vehicleType || 'ไม่ระบุรุ่น',
    plate: v.plate || '',
    note: v.note || '',
    mileage: v.mileage ?? 0,
    lastDate: thaiDate(v.lastRepairOn),
  };
}

function mapPlace(p) {
  return {
    _id: p.id,
    name: p.name,
    kind: p.kind || 'ไม่ระบุประเภท',
  };
}

// ── อ่านข้อมูล ──────────────────────────────────────────────

export async function fetchAll() {
  const [jobs, vehicles, places] = await Promise.all([
    request('GET', '/api/jobs'),
    request('GET', '/api/vehicles'),
    request('GET', '/api/places'),
  ]);

  return {
    jobs: (jobs?.jobs || []).map(mapJob),
    vehicles: (vehicles?.vehicles || []).map(mapVehicle),
    places: (places?.places || []).map(mapPlace),
  };
}

// ── แก้ข้อมูล ───────────────────────────────────────────────

/** แจ้งซ่อมใหม่ — เซิร์ฟเวอร์สร้างใบงาน อะไหล่ ช่าง และ PR ใน transaction เดียว */
export async function createJob(draft) {
  const job = await request('POST', '/api/jobs', {
    vehicleCode: draft.vehicleCode,
    symptom: draft.symptom,
    breakOn: draft.breakOn || '',
    mileage: draft.mileage ?? null,
    placeName: draft.placeName || '',
    reporter: draft.reporter || '',
    note: draft.note || '',
    createdBy: draft.createdBy || 'ธุรการ',
    parts: (draft.parts || []).map((p) => ({
      name: p.name,
      partNo: p.part_no || '',
      qty: p.qty,
      unit: p.unit || '',
      unitPrice: p.unit_price ?? 0,
      discountPct: p.discount_pct ?? 0,
      prCode: p.pr_code || '',
    })),
    technicians: draft.technicians || [],
  });
  return mapJob(job);
}

/** เลื่อนสถานะไปขั้นถัดไป */
export async function advanceJob(jobId) {
  return mapJob(await request('POST', `/api/jobs/${jobId}/advance`));
}

/** แก้เลข PR ของอะไหล่รายชิ้น (เลข PR ใหม่จะถูกสร้างให้เอง) */
export async function setPartPr(partId, code) {
  return request('PATCH', `/api/parts/${partId}/pr`, { prCode: (code || '').trim() });
}

export async function createVehicle(form) {
  return mapVehicle(
    await request('POST', '/api/vehicles', {
      code: form.code,
      plate: form.plate || '',
      brandModel: form.model || '',
      vehicleType: form.type || '',
      owner: form.owner || '',
      note: form.note || '',
    })
  );
}

export async function createPlace(form) {
  return mapPlace(
    await request('POST', '/api/places', {
      name: form.name,
      kind: form.kind || '',
    })
  );
}

/** เลิกใช้สถานที่ซ่อม — ไม่ลบจริงเพื่อไม่ให้ประวัติใบงานเก่าเสียอ้างอิง */
export async function deactivatePlace(placeId) {
  return request('DELETE', `/api/places/${placeId}`);
}

// ── รูปภาพ ──────────────────────────────────────────────────
// ไฟล์เก็บที่ฝั่งเซิร์ฟเวอร์ ฐานข้อมูลเก็บแค่ path — ดึงรูปผ่าน /api/photos/{id}

function mapPhoto(p) {
  return {
    _id: p.id,
    jobId: p.jobId,
    kind: p.kind,
    caption: p.caption || '',
    src: BASE + p.url,
  };
}

export async function fetchJobPhotos(jobId) {
  const data = await request('GET', `/api/jobs/${jobId}/photos`);
  return (data?.photos || []).map(mapPhoto);
}

/** อัปโหลดรูปเข้าใบงาน — kind: 'before' | 'after' | 'report' */
export async function uploadJobPhoto(jobId, file, kind = 'before', caption = '') {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  if (caption) form.append('caption', caption);
  return mapPhoto(await request('POST', `/api/jobs/${jobId}/photos`, form));
}

export async function deleteJobPhoto(photoId) {
  return request('DELETE', `/api/photos/${photoId}`);
}
