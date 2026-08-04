// ────────────────────────────────────────────────────────────
// เลือก backend ตามค่าใน .env — หน้าจอเรียกใช้ผ่านไฟล์นี้ไฟล์เดียว
//
//   ตั้ง VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY → คุย Supabase ตรง
//        (ใช้กับ GitHub Pages ที่รันเซิร์ฟเวอร์ไม่ได้)
//   ไม่ตั้ง                                              → คุย Go API ที่ ../stores
//        (ค่าเริ่มต้นตอนพัฒนา — ได้ transaction จริง ไม่มีกุญแจในเบราว์เซอร์)
// ────────────────────────────────────────────────────────────

import * as goBackend from './backend-go';
import * as supabaseBackend from './backend-supabase';
import type { Backend } from './types';

// บรรทัดสองบรรทัดนี้คือหัวใจของการใช้ TS ที่ชั้นนี้:
// ถ้า backend ตัวใดตัวหนึ่งขาดฟังก์ชัน หรือชนิดข้อมูลไม่ตรงกัน จะคอมไพล์ไม่ผ่าน
// (เดิมเป็น JS จะรู้ตัวก็ต่อเมื่อผู้ใช้กดใช้ฟีเจอร์นั้นในโหมดนั้น)
const goApi: Backend = goBackend;
const supabaseApi: Backend = supabaseBackend;

const backend: Backend = supabaseApi.isConfigured ? supabaseApi : goApi;

/** 'supabase' | 'go' — ใช้แสดงข้อความช่วยเหลือให้ตรงโหมด */
export const backendName: 'supabase' | 'go' = supabaseApi.isConfigured ? 'supabase' : 'go';

export const isConfigured = backend.isConfigured;
export const isApiDown = backend.isApiDown;

export const fetchAll = backend.fetchAll;
export const createJob = backend.createJob;
export const advanceJob = backend.advanceJob;
export const setPartPr = backend.setPartPr;
export const createVehicle = backend.createVehicle;
export const createPlace = backend.createPlace;
export const deactivatePlace = backend.deactivatePlace;
export const fetchJobPhotos = backend.fetchJobPhotos;
export const uploadJobPhoto = backend.uploadJobPhoto;
export const deleteJobPhoto = backend.deleteJobPhoto;

export type {
  Backend,
  DataSet,
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
