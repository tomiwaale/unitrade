-- Cards shown in the mobile app's auto-advancing promo carousel
-- (mobile/lib/features/catalog/presentation/promo_carousel.dart).
-- `icon` is a key into a fixed icon set shared by the admin UI and the
-- Flutter app — see PROMO_ICONS in app/admin/promo-slides and
-- promoIconMap in mobile/lib/features/catalog/data/promo_slide.dart.
create table promo_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text not null default '',
  icon text not null default 'megaphone',
  color_start text not null default '#0F8A4F',
  color_end text not null default '#073B22',
  route text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table promo_slides enable row level security;

-- Anyone can read active slides (the mobile app reads with the anon key)
create policy "public read active promo slides"
  on promo_slides for select
  using (active = true);

-- Admins manage rows via service role (admin client bypasses RLS)

-- Seed with the cards the mobile app previously hardcoded
insert into promo_slides (title, subtitle, icon, color_start, color_end, route, sort_order) values
  ('Escrow-protected', 'Every order stays in escrow until you confirm delivery.', 'shield', '#0F8A4F', '#073B22', null, 0),
  ('Got something to sell?', 'List it in minutes and reach students on your campus.', 'sell', '#FF5A1F', '#C8420F', '/sell', 1),
  ('Prefer to swap?', 'Trade items with students near you instead of paying cash.', 'swap', '#14A25E', '#073B22', '/swaps', 2);
