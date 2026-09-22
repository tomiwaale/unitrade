import { Shield, PlusCircle, ArrowLeftRight, Tag, Truck, GraduationCap, Star, Gift, Megaphone, Wallet } from "lucide-react";

// Fixed icon set shared with the mobile app — keys must match
// promoIconMap in mobile/lib/features/catalog/data/promo_slide.dart.
export const PROMO_ICONS = {
  shield:    { label: "Shield",    Icon: Shield },
  sell:      { label: "Sell",      Icon: PlusCircle },
  swap:      { label: "Swap",      Icon: ArrowLeftRight },
  tag:       { label: "Discount",  Icon: Tag },
  delivery:  { label: "Delivery",  Icon: Truck },
  school:    { label: "Campus",    Icon: GraduationCap },
  star:      { label: "Featured",  Icon: Star },
  gift:      { label: "Gift",      Icon: Gift },
  megaphone: { label: "Announce",  Icon: Megaphone },
  wallet:    { label: "Wallet",    Icon: Wallet },
} as const;

export type PromoIconKey = keyof typeof PROMO_ICONS;
export const PROMO_ICON_KEYS = Object.keys(PROMO_ICONS) as PromoIconKey[];
