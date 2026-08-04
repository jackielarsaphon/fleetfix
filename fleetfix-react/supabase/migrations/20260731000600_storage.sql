-- ============================================================
-- 0600 · Storage สำหรับรูปภาพ (โหมดไม่มีระบบล็อกอิน)
-- job-photos      : รูปก่อน/หลังซ่อม  → path: <job_id>/<before|after|report>/<uuid>.<ext>
-- vehicle-photos  : รูปประจำรถ        → path: <vehicle_id>/<uuid>.<ext>
-- bucket เป็น private — ดึงรูปด้วย createSignedUrl() เพื่อไม่ให้ URL หลุดไปถูก index
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('job-photos',     'job-photos',     false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('vehicle-photos', 'vehicle-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('job-photos', 'vehicle-photos'));

drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id in ('job-photos', 'vehicle-photos'));

drop policy if exists photos_update on storage.objects;
create policy photos_update on storage.objects
  for update to anon, authenticated
  using (bucket_id in ('job-photos', 'vehicle-photos'))
  with check (bucket_id in ('job-photos', 'vehicle-photos'));

drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects
  for delete to anon, authenticated
  using (bucket_id in ('job-photos', 'vehicle-photos'));
