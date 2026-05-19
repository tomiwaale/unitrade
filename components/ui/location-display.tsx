"use client";

import { MapPin } from "lucide-react";
import { useLocation } from "@/lib/hooks/use-location";

interface Props {
  /** Extra inline styles for the wrapper span */
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Renders the GPS-detected location (e.g. "📍 Akoka, Lagos") once it loads
 * from localStorage. Renders nothing until the location is available.
 */
export default function LocationDisplay({ style, className }: Props) {
  const loc = useLocation();
  if (!loc) return null;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 12.5, color: "var(--ut-ink-mute)",
        fontFamily: "var(--ut-font-mono)",
        ...style,
      }}
    >
      <MapPin size={11} style={{ color: "var(--ut-primary)", flexShrink: 0 }} />
      {loc.label}
    </span>
  );
}
