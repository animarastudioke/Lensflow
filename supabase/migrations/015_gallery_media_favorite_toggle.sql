-- Lets an anonymous gallery visitor toggle is_favorite on a single media row,
-- scoped strictly to the gallery matching their share token (and only when
-- that gallery has favorites enabled) so the write surface can't reach
-- media in any other gallery.
create or replace function public.toggle_gallery_media_favorite(
  token text,
  media_id uuid,
  new_value boolean
)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  update public.media
  set is_favorite = new_value
  where media.id = media_id
    and media.gallery_id = (
      select galleries.id
      from public.galleries
      where galleries.share_token = token
        and galleries.allow_favorites = true
    );
end;
$$;
