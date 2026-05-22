"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HelpCircle } from "lucide-react";

export default function SupportButton() {
  const [show, setShow]         = useState(false);
  const pathname                = usePathname();
  const router                  = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setShow(!!data.session?.user);
    });
  }, []);

  // Hide on admin pages, support pages, and auth pages
  const hidden =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  if (!show || hidden) return null;

  return (
    <button
      onClick={() => router.push("/support")}
      aria-label="Help & Support"
      title="Help & Support"
      style={{
        position: "fixed", bottom: 80, right: 20, zIndex: 200,
        width: 44, height: 44, borderRadius: "50%",
        background: "var(--ut-primary)", color: "white",
        border: "none", cursor: "pointer",
        display: "grid", placeItems: "center",
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.22)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.18)";
      }}
    >
      <HelpCircle size={20} />
    </button>
  );
}
