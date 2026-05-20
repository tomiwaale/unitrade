create table site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

-- Public homepage can read settings
create policy "public read site settings"
  on site_settings for select
  using (true);

-- Seed defaults
insert into site_settings (key, value) values
  ('hero_slide_interval', '10')
on conflict (key) do nothing;
