create table hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text not null default '',
  image_url text not null,
  cta_label text not null default 'Browse listings',
  cta_href text not null default '/catalog',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table hero_slides enable row level security;

-- Anyone can read active slides (for the public homepage)
create policy "public read active slides"
  on hero_slides for select
  using (active = true);

-- Admins can do everything via service role (admin client bypasses RLS)
