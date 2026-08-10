create type public.gallery_cover_template as enum (
  'novel', 'vintage', 'frame', 'stripe', 'divider', 'journal', 'stamp', 'outline'
);

alter table public.galleries
  add column cover_template public.gallery_cover_template not null default 'novel';

update public.galleries set cover_template = (case homepage_design
  when 'classic' then 'novel'
  when 'minimal' then 'outline'
  when 'fullscreen' then 'journal'
  when 'magazine' then 'divider'
  else 'novel'
end)::public.gallery_cover_template;

alter table public.galleries drop column homepage_design;
drop type public.gallery_homepage_design;
