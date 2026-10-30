-- Move persisted preview, thumbnail, cover, and logo URLs to the allowlisting
-- Worker before disabling the bucket's broad r2.dev public endpoint.
-- Original keys are stored separately and are intentionally not rewritten.
DO $$
DECLARE
  old_base CONSTANT text := 'https://pub-cf038016ce134fa590869eba57cee58b.r2.dev';
  new_base CONSTANT text := 'https://media.lensflow.co.ke';
BEGIN
  UPDATE public.media
     SET url = new_base || substring(url FROM length(old_base) + 1),
         thumbnail_url = CASE
           WHEN thumbnail_url LIKE old_base || '/%' THEN new_base || substring(thumbnail_url FROM length(old_base) + 1)
           ELSE thumbnail_url
         END
   WHERE url LIKE old_base || '/%'
      OR thumbnail_url LIKE old_base || '/%';

  UPDATE public.galleries
     SET cover_image = new_base || substring(cover_image FROM length(old_base) + 1)
   WHERE cover_image LIKE old_base || '/%';

  UPDATE public.gallery_albums
     SET cover_image = new_base || substring(cover_image FROM length(old_base) + 1)
   WHERE cover_image LIKE old_base || '/%';

  UPDATE public.gallery_share_settings
     SET brand_logo = CASE
           WHEN brand_logo LIKE old_base || '/%' THEN new_base || substring(brand_logo FROM length(old_base) + 1)
           ELSE brand_logo
         END,
         cover_image = CASE
           WHEN cover_image LIKE old_base || '/%' THEN new_base || substring(cover_image FROM length(old_base) + 1)
           ELSE cover_image
         END
   WHERE brand_logo LIKE old_base || '/%'
      OR cover_image LIKE old_base || '/%';

  UPDATE public.studios
     SET logo_url = new_base || substring(logo_url FROM length(old_base) + 1)
   WHERE logo_url LIKE old_base || '/%';
END;
$$;
