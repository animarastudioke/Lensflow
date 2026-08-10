-- Photo layout and homepage design preferences per gallery
create type public.gallery_layout_type as enum ('grid', 'masonry', 'justified');
create type public.gallery_homepage_design as enum ('classic', 'minimal', 'fullscreen', 'magazine');

alter table public.galleries
  add column layout_type public.gallery_layout_type not null default 'grid',
  add column homepage_design public.gallery_homepage_design not null default 'classic';

-- Storage bucket for gallery media uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery-media', 'gallery-media', true, 26214400, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "Public read access to gallery media"
on storage.objects for select
using (bucket_id = 'gallery-media');

create policy "Studio managers can upload gallery media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'gallery-media'
  and is_studio_manager((storage.foldername(name))[1]::uuid)
);

create policy "Studio managers can update gallery media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'gallery-media'
  and is_studio_manager((storage.foldername(name))[1]::uuid)
);

create policy "Studio managers can delete gallery media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'gallery-media'
  and is_studio_manager((storage.foldername(name))[1]::uuid)
);
