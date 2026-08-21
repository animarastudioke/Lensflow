-- Heading font choice for a gallery's public cover (name/date text on the
-- 8 GalleryCoverPreview templates). Mirrors the layout_type/cover_template
-- pattern: a fixed enum of options the app actually has fonts loaded for
-- (next/font/google fonts are preloaded at build time in layout.tsx, so the
-- set of choices is necessarily fixed, not arbitrary).
create type public.gallery_heading_font as enum ('default', 'playfair', 'cormorant', 'archivo', 'bodoni');

alter table public.galleries
  add column heading_font public.gallery_heading_font not null default 'default';
