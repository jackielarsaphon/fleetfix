// ────────────────────────────────────────────────────────────
// เลือก backend ตามค่าใน .env — หน้าจอเรียกใช้ผ่านไฟล์นี้ไฟล์เดียว
//
//   ตั้ง VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY → คุย Supabase ตรง
//        (ใช้กับ GitHub Pages ที่รันเซิร์ฟเวอร์ไม่ได้)
//   ไม่ตั้ง                                              → คุย Go API ที่ ../stores
//        (ค่าเริ่มต้นตอนพัฒนา — ได้ transaction จริง ไม่มีกุญแจในเบราว์เซอร์)
// ────────────────────────────────────────────────────────────

import * as goBackend from './backend-go.js';
import * as supabaseBackend from './backend-supabase.js';

const backend = supabaseBackend.isConfigured ? supabaseBackend : goBackend;

/** 'supabase' | 'go' — ใช้แสดงข้อความช่วยเหลือให้ตรงโหมด */
export const backendName = supabaseBackend.isConfigured ? 'supabase' : 'go';

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
