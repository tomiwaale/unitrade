-- swap_offers had no indexes beyond its primary key, so every load of the
-- swaps screen (app/swaps/page.tsx, mobile SwapRepository) forced a
-- sequential scan for both the buyer_id/seller_id filter and the RLS
-- policy check ("Participants can view swap offers", 010_swap_offers.sql).
CREATE INDEX IF NOT EXISTS swap_offers_seller_id_idx ON swap_offers(seller_id);
CREATE INDEX IF NOT EXISTS swap_offers_buyer_id_idx ON swap_offers(buyer_id);
CREATE INDEX IF NOT EXISTS swap_offers_wanted_product_id_idx ON swap_offers(wanted_product_id);
CREATE INDEX IF NOT EXISTS swap_offers_offered_product_id_idx ON swap_offers(offered_product_id);
