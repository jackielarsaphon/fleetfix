// ────────────────────────────────────────────────────────────
// Backend ที่คุย Supabase ตรงจากเบราว์เซอร์ (ใช้กับ GitHub Pages)
//
// ⚠️ publishable key อยู่ในไฟล์ JS ที่ทุกคนอ่านได้ และ RLS ของระบบนี้เปิดให้
//    role anon แก้ข้อมูลได้ → ใครเปิดเว็บก็แก้ข้อมูลได้ทั้งฐาน
//    เหมาะกับงานเดโม/วงปิด ถ้าใช้จริงกับข้อมูลสำคัญให้ใช้ backend-go.ts
//
// ไม่มี transaction ข้าม request — createJob ลบใบงานที่สร้างค้างให้เอง
// ถ้าขั้นบันทึกอะไหล่ล้มเหลว
// ────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type {
  DataSet,
  EditJobDraft,
  Job,
  NewJobDraft,
  NewPlaceForm,
  NewVehicleForm,
  Part,
  Photo,
  PhotoKind,
  Place,
  Vehicle,
} from './types';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isConfigured = Boolean(url && key);

// ตัวแปรนี้ถูกใช้ก็ต่อเมื่อ isConfigured เป็น true (api.ts เป็นคนเลือก backend)
const db = (
  isConfigured
    ? createClient(url as string, key as string, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null
) as SupabaseClient;

const PHOTO_BUCKET = 'job-photos';
const SIGNED_URL_TTL = 3600; // วินาที

/** true เมื่อยังไม่ได้ apply migration (ไม่พบตาราง/view) */
export function isApiDown(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'PGRST205' || code === 'PGRST202' || code === '42P01';
}

function unwrap<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

/** 2026-05-06 → 06/05/2026 */
function thaiDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── รูปแบบแถวที่อ่านจากฐานข้อมูล (snake_case) ────────────────

interface JobRow {
  id: string;
  code: string;
  status: string;
  status_label: string;
  symptom: string;
  root_cause: string | null;
  mileage: number | null;
  reported_on: string | null;
  break_on: string | null;
  done_on: string | null;
  reporter: string | null;
  note: string | null;
  vehicle_code: string;
  place_name: string | null;
  technicians: string | null;
  pr_codes: string[] | null;
  photo_count: number | null;
  age_days: number | null;
}

interface PartRow {
  id: string;
  job_id: string;
  name: string;
  part_no: string | null;
  qty: number;
  unit: string;
  unit_price: number;
  discount_pct: number;
  purchase_requests: { code: string } | null;
}

interface VehicleRow {
  id: string;
  code: string;
  brand_model: string | null;
  vehicle_type: string | null;
  plate: string | null;
  note: string | null;
  mileage: number | null;
  last_reported_on: string | null;
}

interface PlaceRow {
  id: string;
  name: string;
  kind: string | null;
}

interface PhotoRow {
  id: string;
  job_id: string;
  kind: PhotoKind;
  caption: string | null;
  sort_order: number;
  storage_path: string;
}

const PART_COLUMNS = 'id, job_id, line_no, name, part_no, qty, unit, unit_price, discount_pct, purchase_requests(code)';

// ── แปลงแถว → รูปแบบที่หน้าจอใช้ ────────────────────────────

function mapPart(row: PartRow): Part {
  return {
    _id: row.id,
    name: row.name,
    partNo: row.part_no || '—',
    qty: Number(row.qty),
    unit: row.unit,
    unitPrice: Number(row.unit_price),
    disc: Number(row.discount_pct),
    pr: row.purchase_requests?.code || '',
  };
}

function mapJob(row: JobRow, parts: Part[]): Job {
  return {
    _id: row.id,
    code: row.code,
    statusCode: row.status,
    vehicle: row.vehicle_code,
    mileage: row.mileage ?? 0,
    symptom: row.symptom,
    rootCause: row.root_cause || '—',
    status: row.status_label,
    tech: row.technicians || '—',
    pr: row.pr_codes?.[0] || '',
    reportedAt: thaiDate(row.reported_on),
    breakDate: thaiDate(row.break_on),
    doneDate: thaiDate(row.done_on),
    reporter: row.reporter || '—',
    place: row.place_name || '—',
    note: row.note || '—',
    photos: row.photo_count ?? 0,
    age: row.age_days ?? 0,
    parts,
  };
}

function mapVehicle(row: VehicleRow): Vehicle {
  return {
    _id: row.id,
    code: row.code,
    model: row.brand_model || row.vehicle_type || 'ไม่ระบุรุ่น',
    plate: row.plate || '',
    note: row.note || '',
    mileage: row.mileage ?? 0,
    lastDate: thaiDate(row.last_reported_on),
  };
}

function mapPlace(row: PlaceRow): Place {
  return { _id: row.id, name: row.name, kind: row.kind || 'ไม่ระบุประเภท' };
}

// ── อ่านข้อมูล ──────────────────────────────────────────────

export async function fetchAll(): Promise<DataSet> {
  const [jobRows, partRows, vehicleRows, placeRows] = await Promise.all([
    db.from('jobs_list').select('*').order('reported_on', { ascending: false }).order('code', { ascending: false }).then(unwrap) as Promise<JobRow[]>,
    db.from('job_parts').select(PART_COLUMNS).order('line_no', { ascending: true }).then(unwrap) as Promise<PartRow[]>,
    db.from('vehicle_summary').select('*').eq('is_active', true).order('code', { ascending: true }).then(unwrap) as Promise<VehicleRow[]>,
    db.from('repair_places').select('id, name, kind').eq('is_active', true).order('name', { ascending: true }).then(unwrap) as Promise<PlaceRow[]>,
  ]);

  const partsByJob = new Map<string, Part[]>();
  for (const row of partRows) {
    const list = partsByJob.get(row.job_id);
    if (list) list.push(mapPart(row));
    else partsByJob.set(row.job_id, [mapPart(row)]);
  }

  return {
    jobs: jobRows.map((row) => mapJob(row, partsByJob.get(row.id) || [])),
    vehicles: vehicleRows.map(mapVehicle),
    places: placeRows.map(mapPlace),
  };
}

// ── แก้ข้อมูล ───────────────────────────────────────────────

async function findId(table: string, column: string, value: string): Promise<string | null> {
  if (!value) return null;
  const rows = (await db.from(table).select('id').eq(column, value).limit(1).then(unwrap)) as { id: string }[];
  return rows[0]?.id ?? null;
}

/** หา (หรือสร้าง) ใบสั่งซื้อจากเลข PR */
async function ensurePurchaseRequest(code: string): Promise<string | null> {
  const clean = (code || '').trim();
  if (!clean) return null;

  const existing = await findId('purchase_requests', 'code', clean);
  if (existing) return existing;

  try {
    const rows = (await db.from('purchase_requests').insert({ code: clean }).select('id').then(unwrap)) as { id: string }[];
    return rows[0]?.id ?? null;
  } catch (err) {
    if ((err as { code?: string }).code === '23505') return findId('purchase_requests', 'code', clean);
    throw err;
  }
}

export async function createJob(draft: NewJobDraft): Promise<Job> {
  const vehicleId = await findId('vehicles', 'code', draft.vehicleCode);
  if (!vehicleId) throw new Error(`ไม่พบเบอร์รถ ${draft.vehicleCode}`);

  const placeId = draft.placeName ? await findId('repair_places', 'name', draft.placeName) : null;

  const created = (await db
    .from('repair_jobs')
    .insert({
      vehicle_id: vehicleId,
      place_id: placeId,
      symptom: draft.symptom,
      mileage: draft.mileage ?? null,
      break_on: draft.breakOn || null,
      reporter: draft.reporter || null,
      note: draft.note || null,
      created_by: draft.createdBy || 'ธุรการ',
    })
    .select('id')
    .then(unwrap)) as { id: string }[];

  const jobId = created[0]?.id;
  if (!jobId) throw new Error('สร้างใบงานไม่สำเร็จ');

  try {
    const parts = draft.parts ?? [];
    if (parts.length) {
      const prIds = new Map<string, string | null>();
      for (const p of parts) {
        const code = (p.pr_code || '').trim();
        if (code && !prIds.has(code)) prIds.set(code, await ensurePurchaseRequest(code));
      }
      await db
        .from('job_parts')
        .insert(
          parts.map((p, i) => ({
            job_id: jobId,
            line_no: i + 1,
            name: p.name,
            part_no: p.part_no || null,
            qty: p.qty ?? 1,
            unit: p.unit || 'ชิ้น',
            unit_price: p.unit_price ?? 0,
            discount_pct: p.discount_pct ?? 0,
            pr_id: prIds.get((p.pr_code || '').trim()) ?? null,
          }))
        )
        .then(unwrap);
    }

    const techs = [...new Set((draft.technicians ?? []).map((t) => (t || '').trim()).filter(Boolean))];
    if (techs.length) {
      await db
        .from('technicians')
        .upsert(techs.map((name) => ({ name })), { onConflict: 'name', ignoreDuplicates: true })
        .then(unwrap);
      const rows = (await db.from('technicians').select('id').in('name', techs).then(unwrap)) as { id: string }[];
      await db
        .from('job_technicians')
        .insert(rows.map((t) => ({ job_id: jobId, technician_id: t.id })))
        .then(unwrap);
    }
  } catch (err) {
    await db.from('repair_jobs').delete().eq('id', jobId);
    throw err;
  }

  return readJob(jobId);
}

/** อ่านใบงานหนึ่งใบกลับมาในรูปแบบเดียวกับ backend อื่น */
async function readJob(jobId: string): Promise<Job> {
  const rows = (await db.from('jobs_list').select('*').eq('id', jobId).limit(1).then(unwrap)) as JobRow[];
  const row = rows[0];
  if (!row) throw new Error('ไม่พบใบงานนี้ในระบบ');

  const partRows = (await db.from('job_parts').select(PART_COLUMNS).eq('job_id', jobId).order('line_no').then(unwrap)) as PartRow[];
  return mapJob(row, partRows.map(mapPart));
}

export async function updateJob(jobId: string, draft: EditJobDraft): Promise<Job> {
  const vehicleId = await findId('vehicles', 'code', draft.vehicleCode);
  if (!vehicleId) throw new Error(`ไม่พบเบอร์รถ ${draft.vehicleCode}`);

  const placeId = draft.placeName ? await findId('repair_places', 'name', draft.placeName) : null;

  // status ว่าง = คงสถานะเดิม (จึงไม่ใส่คีย์นี้ลงไป)
  const patch: Record<string, unknown> = {
    vehicle_id: vehicleId,
    place_id: placeId,
    symptom: draft.symptom,
    root_cause: draft.rootCause || null,
    mileage: draft.mileage ?? null,
    break_on: draft.breakOn || null,
    done_on: draft.doneOn || null,
    reporter: draft.reporter || null,
    note: draft.note || null,
  };
  if (draft.status) patch.status = draft.status;

  await db.from('repair_jobs').update(patch).eq('id', jobId).then(unwrap);

  // แทนที่รายชื่อช่างทั้งชุด
  await db.from('job_technicians').delete().eq('job_id', jobId).then(unwrap);
  const techs = [...new Set((draft.technicians ?? []).map((t) => (t || '').trim()).filter(Boolean))];
  if (techs.length) {
    await db
      .from('technicians')
      .upsert(techs.map((name) => ({ name })), { onConflict: 'name', ignoreDuplicates: true })
      .then(unwrap);
    const rows = (await db.from('technicians').select('id').in('name', techs).then(unwrap)) as { id: string }[];
    await db
      .from('job_technicians')
      .insert(rows.map((t) => ({ job_id: jobId, technician_id: t.id })))
      .then(unwrap);
  }

  return readJob(jobId);
}

export async function deleteJob(jobId: string): Promise<unknown> {
  // ลบไฟล์รูปใน Storage ก่อน เพราะพออ่านแถวหลังลบใบงานจะไม่เหลือ path ให้ตามลบ
  const photos = (await db.from('job_photos').select('storage_path').eq('job_id', jobId).then(unwrap)) as {
    storage_path: string;
  }[];
  if (photos.length) {
    await db.storage.from(PHOTO_BUCKET).remove(photos.map((p) => p.storage_path));
  }
  return db.from('repair_jobs').delete().eq('id', jobId).then(unwrap);
}

export async function advanceJob(jobId: string): Promise<Job | null> {
  const jobs = (await db.from('repair_jobs').select('status').eq('id', jobId).limit(1).then(unwrap)) as { status: string }[];
  const status = jobs[0]?.status;
  if (!status) throw new Error('ไม่พบใบงานนี้ในระบบ');

  const statuses = (await db.from('job_statuses').select('next_code').eq('code', status).limit(1).then(unwrap)) as {
    next_code: string | null;
  }[];
  const next = statuses[0]?.next_code;
  if (!next || next === status) return null; // ปิดงานแล้ว ไม่มีขั้นถัดไป

  await db.from('repair_jobs').update({ status: next }).eq('id', jobId).then(unwrap);
  return readJob(jobId);
}

export async function setPartPr(partId: string, code: string): Promise<unknown> {
  const prId = await ensurePurchaseRequest(code);
  return db.from('job_parts').update({ pr_id: prId }).eq('id', partId).then(unwrap);
}

export async function createVehicle(form: NewVehicleForm): Promise<Vehicle> {
  const rows = (await db
    .from('vehicles')
    .insert({
      code: form.code,
      brand_model: form.model || null,
      vehicle_type: form.type || null,
      owner: form.owner || null,
      plate: form.plate || null,
      note: form.note || null,
    })
    .select('id')
    .then(unwrap)) as { id: string }[];

  const summary = (await db.from('vehicle_summary').select('*').eq('id', rows[0]?.id).limit(1).then(unwrap)) as VehicleRow[];
  const row = summary[0];
  if (!row) throw new Error('เพิ่มทะเบียนรถไม่สำเร็จ');
  return mapVehicle(row);
}

export async function createPlace(form: NewPlaceForm): Promise<Place> {
  const rows = (await db
    .from('repair_places')
    .insert({ name: form.name, kind: form.kind || null })
    .select('id, name, kind')
    .then(unwrap)) as PlaceRow[];
  const row = rows[0];
  if (!row) throw new Error('เพิ่มสถานที่ซ่อมไม่สำเร็จ');
  return mapPlace(row);
}

export async function deactivatePlace(placeId: string): Promise<unknown> {
  return db.from('repair_places').update({ is_active: false }).eq('id', placeId).then(unwrap);
}

// ── รูปภาพ (Supabase Storage) ───────────────────────────────
// ไฟล์อยู่ใน bucket job-photos แบบ private — ดึงด้วย signed URL อายุ 1 ชั่วโมง

export async function fetchJobPhotos(jobId: string): Promise<Photo[]> {
  const rows = (await db
    .from('job_photos')
    .select('id, job_id, kind, caption, sort_order, storage_path')
    .eq('job_id', jobId)
    .order('kind')
    .order('sort_order')
    .then(unwrap)) as PhotoRow[];

  if (!rows.length) return [];

  const signed = await db.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), SIGNED_URL_TTL)
    .then(unwrap);

  return rows.map((row, i) => ({
    _id: row.id,
    jobId: row.job_id,
    kind: row.kind,
    caption: row.caption || '',
    src: signed?.[i]?.signedUrl || '',
  }));
}

export async function uploadJobPhoto(
  jobId: string,
  file: File,
  kind: PhotoKind = 'before',
  caption = ''
): Promise<Photo> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const rand = Math.random().toString(16).slice(2, 10);
  const path = `${jobId}/${kind}-${rand}.${ext}`;

  await db.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type }).then(unwrap);

  try {
    // sort_order ต่อท้ายรูปที่มีอยู่ของประเภทเดียวกัน
    const existing = (await db
      .from('job_photos')
      .select('sort_order')
      .eq('job_id', jobId)
      .eq('kind', kind)
      .order('sort_order', { ascending: false })
      .limit(1)
      .then(unwrap)) as { sort_order: number }[];

    const rows = (await db
      .from('job_photos')
      .insert({
        job_id: jobId,
        kind,
        storage_path: path,
        caption: caption || null,
        sort_order: (existing[0]?.sort_order ?? -1) + 1,
      })
      .select('id, job_id, kind, caption')
      .then(unwrap)) as { id: string; job_id: string; kind: PhotoKind; caption: string | null }[];

    const row = rows[0];
    if (!row) throw new Error('บันทึกรูปไม่สำเร็จ');

    const signed = await db.storage.from(PHOTO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL).then(unwrap);

    return {
      _id: row.id,
      jobId: row.job_id,
      kind: row.kind,
      caption: row.caption || '',
      src: signed?.signedUrl || '',
    };
  } catch (err) {
    // บันทึกฐานข้อมูลไม่ผ่าน — ลบไฟล์ที่เพิ่งอัปทิ้ง ไม่ให้เหลือไฟล์กำพร้า
    await db.storage.from(PHOTO_BUCKET).remove([path]);
    throw err;
  }
}

export async function deleteJobPhoto(photoId: string): Promise<unknown> {
  const rows = (await db.from('job_photos').select('storage_path').eq('id', photoId).limit(1).then(unwrap)) as {
    storage_path: string;
  }[];
  const path = rows[0]?.storage_path;

  await db.from('job_photos').delete().eq('id', photoId).then(unwrap);
  if (path) await db.storage.from(PHOTO_BUCKET).remove([path]);
  return null;
}
