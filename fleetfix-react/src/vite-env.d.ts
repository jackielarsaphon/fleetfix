/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL ของ Go API (ค่าเริ่มต้น http://localhost:8080) */
  readonly VITE_API_URL?: string;
  /** ตั้งคู่กับ VITE_SUPABASE_PUBLISHABLE_KEY เพื่อสลับไปคุย Supabase ตรง */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
