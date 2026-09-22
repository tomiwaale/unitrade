-- Optional banner image for promo_slides. When set, the mobile app renders
-- this image as the card background instead of the color_start/color_end
-- gradient (icon/gradient stay as the fallback for cards without an image).
alter table promo_slides add column image_url text;
