// ────────────────────────────────────────────────────────────
// Backend ที่คุย Go API ในโฟลเดอร์ ../stores
//
// ข้อดี: การสร้างใบงานเป็น transaction เดียวจริงฝั่งเซิร์ฟเวอร์
// และไม่มีกุญแจฐานข้อมูลอยู่ในไฟล์ JS ที่ส่งให้เบราว์เซอร์
//
// ชนิดข้อมูลที่รับมา (Wire*) ต้องตรงกับ struct ใน stores/internal/model/model.go
// ────────────────────────────────────────────────────────────

import type {
  DashboardStats,
  DataSet,
  EditJobDraft,
  EditPlaceForm,
  EditVehicleForm,
  Job,
  MonthlyCost,
  NewJobDraft,
  NewPlaceForm,
  NewVehicleForm,
  Part,
  PartInput,
  Photo,
  PhotoKind,
  Place,
  Vehicle,
  WireJob,
  WireJobPart,
  WirePhoto,
  WirePlace,
  WireVehicle,
} from './types';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');

export const isConfigured = Boolean(BASE);

/** true เมื่อเรียก API ไม่ติดเลย (เซิร์ฟเวอร์ยังไม่ได้รัน / ผิด origin) */
export function isApiDown(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'ApiUnreachable';
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  let res: Response;

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
    (err as Error & { cause?: unknown }).cause = cause;
    throw err;
  }

  if (res.status === 204) return null as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error;
    throw new Error(message || `${method} ${path} ล้มเหลว (${res.status})`);
  }
  return data as T;
}

// ── แปลงข้อมูลจาก API → รูปแบบที่หน้าจอใช้ ───────────────────

/** 2026-05-06 → 06/05/2026 */
function thaiDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function mapPart(p: WireJobPart): Part {
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

function mapJob(j: WireJob): Job {
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

function mapVehicle(v: WireVehicle): Vehicle {
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

function mapPlace(p: WirePlace): Place {
  return { _id: p.id, name: p.name, kind: p.kind || 'ไม่ระบุประเภท' };
}

function mapPhoto(p: WirePhoto): Photo {
  return {
    _id: p.id,
    jobId: p.jobId,
    kind: p.kind,
    caption: p.caption || '',
    src: BASE + p.url,
  };
}

// ── อ่านข้อมูล ──────────────────────────────────────────────

export async function fetchAll(): Promise<DataSet> {
  const [jobs, vehicles, places] = await Promise.all([
    request<{ jobs: WireJob[] }>('GET', '/api/jobs'),
    request<{ vehicles: WireVehicle[] }>('GET', '/api/vehicles'),
    request<{ places: WirePlace[] }>('GET', '/api/places'),
  ]);

  return {
    jobs: (jobs?.jobs || []).map(mapJob),
    vehicles: (vehicles?.vehicles || []).map(mapVehicle),
    places: (places?.places || []).map(mapPlace),
  };
}

/** ตัวเลขแดชบอร์ด — คำนวณจากฐานข้อมูลทั้งหมด */
export async function fetchDashboard(): Promise<DashboardStats> {
  const d = await request<{
    monthly: MonthlyCost[] | null;
    avgRepairDays: number | null;
    avgRepairDaysPrev: number | null;
  }>('GET', '/api/dashboard');

  return {
    monthly: d?.monthly || [],
    avgRepairDays: d?.avgRepairDays ?? null,
    avgRepairDaysPrev: d?.avgRepairDaysPrev ?? null,
  };
}

// ── แก้ข้อมูล ───────────────────────────────────────────────

/** แจ้งซ่อมใหม่ — เซิร์ฟเวอร์สร้างใบงาน อะไหล่ ช่าง และ PR ใน transaction เดียว */
export async function createJob(draft: NewJobDraft): Promise<Job> {
  const job = await request<WireJob>('POST', '/api/jobs', {
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

/** แก้ข้อมูลใบงานทั้งชุด (เซิร์ฟเวอร์ทำใน transaction เดียว รวมรายชื่อช่าง) */
export async function updateJob(jobId: string, draft: EditJobDraft): Promise<Job> {
  const job = await request<WireJob>('PATCH', `/api/jobs/${jobId}`, {
    vehicleCode: draft.vehicleCode,
    symptom: draft.symptom,
    rootCause: draft.rootCause || '',
    status: draft.status || '',
    mileage: draft.mileage ?? null,
    breakOn: draft.breakOn || '',
    doneOn: draft.doneOn || '',
    placeName: draft.placeName || '',
    reporter: draft.reporter || '',
    note: draft.note || '',
    technicians: draft.technicians || [],
  });
  return mapJob(job);
}

/** ลบใบงานถาวร — อะไหล่ ไทม์ไลน์ และรูป (ทั้งแถวและไฟล์) ถูกลบตามไปด้วย */
export async function deleteJob(jobId: string): Promise<unknown> {
  return request('DELETE', `/api/jobs/${jobId}`);
}

/** เลื่อนสถานะไปขั้นถัดไป */
export async function advanceJob(jobId: string): Promise<Job> {
  return mapJob(await request<WireJob>('POST', `/api/jobs/${jobId}/advance`));
}

/** ย้อนสถานะกลับหนึ่งขั้น (กดเลื่อนสถานะผิด) */
export async function revertJob(jobId: string): Promise<Job> {
  return mapJob(await request<WireJob>('POST', `/api/jobs/${jobId}/revert`));
}

/** แก้เลข PR ของอะไหล่รายชิ้น (เลข PR ใหม่จะถูกสร้างให้เอง) */
export async function setPartPr(partId: string, code: string): Promise<unknown> {
  return request('PATCH', `/api/parts/${partId}/pr`, { prCode: (code || '').trim() });
}

// ── อะไหล่ในใบงาน ───────────────────────────────────────────

function partBody(input: PartInput) {
  return {
    name: input.name,
    partNo: input.partNo || '',
    qty: input.qty,
    unit: input.unit || '',
    unitPrice: input.unitPrice,
    discountPct: input.discountPct,
    prCode: input.prCode || '',
  };
}

export async function createPart(jobId: string, input: PartInput): Promise<Part> {
  return mapPart(await request<WireJobPart>('POST', `/api/jobs/${jobId}/parts`, partBody(input)));
}

export async function updatePart(partId: string, input: PartInput): Promise<Part> {
  return mapPart(await request<WireJobPart>('PATCH', `/api/parts/${partId}`, partBody(input)));
}

export async function deletePart(partId: string): Promise<unknown> {
  return request('DELETE', `/api/parts/${partId}`);
}

export async function createVehicle(form: NewVehicleForm): Promise<Vehicle> {
  return mapVehicle(
    await request<WireVehicle>('POST', '/api/vehicles', {
      code: form.code,
      plate: form.plate || '',
      brandModel: form.model || '',
      vehicleType: form.type || '',
      owner: form.owner || '',
      note: form.note || '',
    })
  );
}

export async function updateVehicle(vehicleId: string, form: EditVehicleForm): Promise<Vehicle> {
  return mapVehicle(
    await request<WireVehicle>('PATCH', `/api/vehicles/${vehicleId}`, {
      code: form.code,
      plate: form.plate || '',
      brandModel: form.model || '',
      vehicleType: form.type || '',
      owner: form.owner || '',
      note: form.note || '',
      isActive: form.isActive ?? null,
    })
  );
}

/** ลบรถถาวร — เซิร์ฟเวอร์ปฏิเสธ (409) ถ้ารถคันนั้นมีใบงานอยู่ */
export async function deleteVehicle(vehicleId: string): Promise<unknown> {
  return request('DELETE', `/api/vehicles/${vehicleId}`);
}

export async function createPlace(form: NewPlaceForm): Promise<Place> {
  return mapPlace(
    await request<WirePlace>('POST', '/api/places', {
      name: form.name,
      kind: form.kind || '',
    })
  );
}

export async function updatePlace(placeId: string, form: EditPlaceForm): Promise<Place> {
  return mapPlace(
    await request<WirePlace>('PATCH', `/api/places/${placeId}`, {
      name: form.name,
      kind: form.kind || '',
      isActive: form.isActive ?? null,
    })
  );
}

/** เลิกใช้สถานที่ซ่อม — ไม่ลบจริงเพื่อไม่ให้ประวัติใบงานเก่าเสียอ้างอิง */
export async function deactivatePlace(placeId: string): Promise<unknown> {
  return request('DELETE', `/api/places/${placeId}`);
}

// ── รูปภาพ ──────────────────────────────────────────────────
// ไฟล์เก็บที่ฝั่งเซิร์ฟเวอร์ ฐานข้อมูลเก็บแค่ path — ดึงรูปผ่าน /api/photos/{id}

export async function fetchJobPhotos(jobId: string): Promise<Photo[]> {
  const data = await request<{ photos: WirePhoto[] }>('GET', `/api/jobs/${jobId}/photos`);
  return (data?.photos || []).map(mapPhoto);
}

export async function uploadJobPhoto(
  jobId: string,
  file: File,
  kind: PhotoKind = 'before',
  caption = ''
): Promise<Photo> {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  if (caption) form.append('caption', caption);
  return mapPhoto(await request<WirePhoto>('POST', `/api/jobs/${jobId}/photos`, form));
}

export async function deleteJobPhoto(photoId: string): Promise<unknown> {
  return request('DELETE', `/api/photos/${photoId}`);
}
