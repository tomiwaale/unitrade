"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingBag, AlertTriangle,
  Users, Package, ArrowLeft, Images, Menu, X, GraduationCap, MessageCircle,
} from "lucide-react";

const NAV = [
  { href: "/admin",          label: "Overview",    icon: LayoutDashboard, exact: true  },
  { href: "/admin/orders",   label: "Orders",      icon: ShoppingBag,     exact: false },
  { href: "/admin/disputes", label: "Disputes",    icon: AlertTriangle,   exact: false },
  { href: "/admin/kyc",      label: "KYC Queue",   icon: GraduationCap,   exact: false },
  { href: "/admin/support",  label: "Support",     icon: MessageCircle,   exact: false },
  { href: "/admin/users",    label: "Users",       icon: Users,           exact: false },
  { href: "/admin/products", label: "Products",    icon: Package,         exact: false },
  { href: "/admin/slides",   label: "Hero Slides", icon: Images,          exact: false },
];

export default function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const sidebarContent = (
    <>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--ut-line)" }}>
        <p style={{ margin: "0 0 2px", fontWeight: 800, color: "var(--ut-ink)", fontSize: 15 }}>
          KolejSwap
          <span style={{ color: "var(--ut-accent)", marginLeft: 2 }}>·</span>
          {" "}Admin
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ut-ink-mute)" }}>{adminName}</p>
      </div>

      <nav style={{ flex: 1, padding: "10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 9, fontSize: 13.5,
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
    </>
  );

  return (
    <>
      {/* Mobile top bar — hidden on desktop via CSS */}
      <div className="ut-admin-mobile-bar">
        <button
          className="ut-admin-hamburger"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ut-ink)", letterSpacing: "-0.01em" }}>
          KolejSwap <span style={{ color: "var(--ut-accent)" }}>·</span> Admin
        </span>
      </div>

      {/* Backdrop — clicks close the drawer */}
      {open && (
        <div
          className="ut-admin-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar drawer */}
      <aside className={`ut-admin-sidebar${open ? " open" : ""}`}>
        {/* Close button visible only on mobile (top-right of drawer) */}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
          style={{
            display: "none", // shown via CSS on mobile
            position: "absolute", top: 12, right: 12,
            width: 32, height: 32, borderRadius: 8,
            border: 0, background: "var(--ut-bg-sunken)",
            color: "var(--ut-ink-soft)", cursor: "pointer",
            alignItems: "center", justifyContent: "center",
          }}
          className="ut-admin-drawer-close"
        >
          <X size={16} />
        </button>

        {sidebarContent}
      </aside>
    </>
  );
}
