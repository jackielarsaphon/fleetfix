// ────────────────────────────────────────────────────────────
// ชนิดข้อมูลกลางของชั้นเชื่อมต่อ
//
// แบ่งเป็น 2 กลุ่ม
//   1. Wire*  — รูปแบบ JSON ที่ Go API ส่งมา (ตรงกับ struct ใน
//              stores/internal/model/model.go — แก้ฝั่งไหนต้องแก้อีกฝั่ง)
//   2. ที่เหลือ — รูปแบบที่หน้าจอ React ใช้ (ชื่อฟิลด์แบบเดิมของแอป)
// ────────────────────────────────────────────────────────────

export type PhotoKind = 'before' | 'after' | 'report';

// ── 1. รูปแบบจาก Go API ─────────────────────────────────────

/** ตรงกับ model.JobPart */
export interface WireJobPart {
  id: string;
  lineNo: number;
  name: string;
  partNo: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discountPct: number;
  grossAmount: number;
  netAmount: number;
  prCode: string;
}

/** ตรงกับ model.Job */
export interface WireJob {
  id: string;
  code: string;
  status: string;
  statusLabel: string;
  statusOrder: number;
  isClosed: boolean;
  nextActionLabel: string;
  chipFg: string;
  chipBg: string;
  dotColor: string;
  symptom: string;
  rootCause: string;
  mileage: number;
  reportedOn: string;
  breakOn: string;
  doneOn: string;
  reporter: string;
  note: string;
  vehicleId: string;
  vehicleCode: string;
  brandModel: string;
  plate: string;
  placeName: string;
  technicians: string;
  prCodes: string[] | null;
  photoCount: number;
  partsCount: number;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  ageDays: number | null;
  parts?: WireJobPart[];
}

/** ตรงกับ model.Vehicle */
export interface WireVehicle {
  id: string;
  code: string;
  plate: string;
  brandModel: string;
  vehicleType: string;
  note: string;
  mileage: number;
  jobCount: number;
  openJobCount: number;
  repairCost: number;
  lastRepairOn: string;
}

/** ตรงกับ model.Place */
export interface WirePlace {
  id: string;
  name: string;
  kind: string;
  usedBy: number;
  isActive: boolean;
}

/** ตรงกับ model.Photo */
export interface WirePhoto {
  id: string;
  jobId: string;
  kind: PhotoKind;
  caption: string;
  sortOrder: number;
  createdAt: string;
  url: string;
}

// ── 2. รูปแบบที่หน้าจอใช้ ───────────────────────────────────
// `_id` คือ uuid จริงในฐานข้อมูล ใช้ตอนสั่งแก้ข้อมูล

export interface Part {
  _id: string;
  name: string;
  partNo: string;
  qty: number;
  unit: string;
  unitPrice: number;
  /** เปอร์เซ็นต์ส่วนลด (ชื่อเดิมของแอป) */
  disc: number;
  /** เลข PR ('' = ยังไม่ออก) */
  pr: string;
}

export interface Job {
  _id: string;
  code: string;
  statusCode: string;
  vehicle: string;
  mileage: number;
  symptom: string;
  rootCause: string;
  /** ชื่อสถานะภาษาไทย เช่น 'รออะไหล่' */
  status: string;
  tech: string;
  pr: string;
  reportedAt: string;
  breakDate: string;
  doneDate: string;
  reporter: string;
  place: string;
  note: string;
  photos: number;
  age: number;
  parts: Part[];
}

export interface Vehicle {
  _id: string;
  code: string;
  model: string;
  plate: string;
  note: string;
  mileage: number;
  lastDate: string;
}

export interface Place {
  _id: string;
  name: string;
  kind: string;
}

export interface Photo {
  _id: string;
  jobId: string;
  kind: PhotoKind;
  caption: string;
  src: string;
}

// ── 3. ข้อมูลที่ฟอร์มส่งเข้ามา ──────────────────────────────

/** อะไหล่จากฟอร์มแจ้งซ่อม (ชื่อคีย์แบบ snake_case ตามที่ NewJobModal ส่ง) */
export interface DraftPart {
  name: string;
  part_no: string;
  qty: number;
  unit: string;
  unit_price: number;
  discount_pct: number;
  pr_code: string;
}

export interface NewJobDraft {
  vehicleCode: string;
  symptom: string;
  breakOn: string;
  mileage: number | null;
  placeName: string;
  reporter: string | null;
  note: string | null;
  createdBy?: string;
  parts: DraftPart[];
  technicians: string[];
  /** รูปที่เลือกไว้ในฟอร์ม — App อัปโหลดให้หลังใบงานถูกสร้าง */
  photos?: File[];
}

/** ข้อมูลใบงานที่แก้ได้ — ส่งมาทั้งชุด (ตรงกับ model.EditJob ฝั่ง Go) */
export interface EditJobDraft {
  vehicleCode: string;
  symptom: string;
  rootCause: string;
  /** รหัสสถานะ เช่น waiting_parts — ว่าง = คงสถานะเดิม */
  status: string;
  mileage: number | null;
  breakOn: string;
  doneOn: string;
  placeName: string;
  reporter: string;
  note: string;
  technicians: string[];
}

export interface NewVehicleForm {
  code: string;
  model: string;
  type: string;
  owner: string;
  plate: string;
  note: string;
}

export interface NewPlaceForm {
  name: string;
  kind: string;
}

// ── 4. สัญญาที่ backend ทุกตัวต้องทำตาม ─────────────────────

export interface DataSet {
  jobs: Job[];
  vehicles: Vehicle[];
  places: Place[];
}

/**
 * backend-go.ts และ backend-supabase.ts ต้องมีครบทุกอย่างในนี้และชนิดตรงกัน
 * (api.ts บังคับด้วยการ assign ทั้งสองโมดูลเข้ากับ interface นี้)
 */
export interface Backend {
  isConfigured: boolean;
  isApiDown(error: unknown): boolean;

  fetchAll(): Promise<DataSet>;

  createJob(draft: NewJobDraft): Promise<Job>;
  updateJob(jobId: string, draft: EditJobDraft): Promise<Job>;
  deleteJob(jobId: string): Promise<unknown>;
  advanceJob(jobId: string): Promise<Job | null>;
  setPartPr(partId: string, code: string): Promise<unknown>;

  createVehicle(form: NewVehicleForm): Promise<Vehicle>;
  createPlace(form: NewPlaceForm): Promise<Place>;
  deactivatePlace(placeId: string): Promise<unknown>;

  fetchJobPhotos(jobId: string): Promise<Photo[]>;
  uploadJobPhoto(jobId: string, file: File, kind?: PhotoKind, caption?: string): Promise<Photo>;
  deleteJobPhoto(photoId: string): Promise<unknown>;
}
