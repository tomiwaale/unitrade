"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, AlertTriangle, Users, Package, ArrowLeft, Images } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle, exact: false },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/slides", label: "Hero Slides", icon: Images, exact: false },
];

export default function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 220, minWidth: 220,
      background: "var(--ut-bg-card)",
      borderRight: "1px solid var(--ut-line)",
      display: "flex", flexDirection: "column",
      position: "sticky", top: 0, height: "100vh",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--ut-line)" }}>
        <p style={{ margin: "0 0 2px", fontWeight: 800, color: "var(--ut-ink)", fontSize: 15 }}>
          CampSwap
          <span style={{ color: "var(--ut-accent)", marginLeft: 2 }}>·</span>
          {" "}Admin
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>{adminName}</p>
      </div>

      <nav style={{ flex: 1, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 9, fontSize: 13.5,
                fontWeight: active ? 700 : 500,
                color: active ? "var(--ut-primary-ink)" : "var(--ut-ink-soft)",
                background: active ? "var(--ut-primary-tint)" : "transparent",
                textDecoration: "none", transition: "background 0.15s, color 0.15s",
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "14px 20px", borderTop: "1px solid var(--ut-line)" }}>
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12, color: "var(--ut-ink-mute)", textDecoration: "none",
        }}>
          <ArrowLeft size={12} /> Back to app
        </Link>
      </div>
    </aside>
  );
}
