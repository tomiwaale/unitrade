"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Bell, Bookmark, MessageSquare, ChevronDown, Plus, LayoutGrid, Package, User, X, Menu } from "lucide-react";
import { LOC_CACHE_KEY, LOC_CACHE_TTL, type CachedLocation } from "@/lib/hooks/use-location";
import { NIGERIAN_UNIVERSITIES } from "@/lib/nigerian-universities";

const TABS = [
  { id: "browse",   label: "Browse",   href: "/catalog"  },
  { id: "sell",     label: "Sell",     href: "/sell"     },
  { id: "messages", label: "Messages", href: "/messages" },
  { id: "swaps",    label: "Swaps",    href: "/swaps"    },
  { id: "orders",   label: "Orders",   href: "/orders"   },
  { id: "profile",  label: "Profile",  href: "/profile"  },
];

function getActiveTab(path: string) {
  if (path.startsWith("/catalog") || path.startsWith("/product")) return "browse";
  if (path.startsWith("/sell"))      return "sell";
  if (path.startsWith("/messages"))  return "messages";
  if (path.startsWith("/swaps"))     return "swaps";
  if (path.startsWith("/orders"))    return "orders";
  if (path.startsWith("/profile") || path.startsWith("/kyc") || path.startsWith("/listings")) return "profile";
  return null;
}

async function reverseGeocode(lat: number, lon: number): Promise<CachedLocation | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const data  = await res.json();
    const addr  = data.address ?? {};
    const suburb = addr.suburb ?? addr.quarter ?? addr.neighbourhood ?? addr.village ?? addr.town ?? "";
    const city   = addr.city   ?? addr.state_district ?? addr.state ?? "";
    const label  = [suburb, city].filter(Boolean).join(", ");
    if (!label) return null;
    return { label, suburb, city, ts: Date.now() };
  } catch {
    return null;
  }
}

function readCache(): CachedLocation | null {
  try {
    const raw = localStorage.getItem(LOC_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    return Date.now() - parsed.ts < LOC_CACHE_TTL ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(loc: CachedLocation) {
  try {
    localStorage.setItem(LOC_CACHE_KEY, JSON.stringify(loc));
  } catch {}
}

export function Navbar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const activeTab = getActiveTab(pathname);
  const [query,         setQuery]         = useState("");
  const [isLoggedIn,    setIsLoggedIn]    = useState(false);
  const [university,    setUniversity]    = useState("Your Campus");
  const [location,      setLocation]      = useState<CachedLocation | null>(null);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [pendingSwaps,  setPendingSwaps]  = useState(0);
  const [campusOpen,    setCampusOpen]    = useState(false);
  const [campusSearch,  setCampusSearch]  = useState("");
  const [menuOpen,      setMenuOpen]      = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const campusRef = useRef<HTMLDivElement>(null);

  // ── Body scroll lock when mobile menu is open ──
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // ── Load preferred campus from localStorage (guests) ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem("preferred_campus");
      if (saved) setUniversity(saved);
    } catch {}
  }, []);

  // ── Auth + profile ───────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) return;
      setIsLoggedIn(true);
      const uid = data.session.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("university")
        .eq("id", uid)
        .single();
      if (profile?.university) setUniversity(profile.university);

      // Unread messages
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`);
      const convIds = (convs ?? []).map((c: any) => c.id);
      if (convIds.length > 0) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .neq("sender_id", uid)
          .eq("read", false);
        if (count) setUnreadCount(count);
      }

      // Pending swap offers received
      const { count: swapCount } = await supabase
        .from("swap_offers")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", uid)
        .eq("status", "pending");
      if (swapCount) setPendingSwaps(swapCount);
    });
  }, []);

  // ── Geolocation ──────────────────────────────────
  useEffect(() => {
    const cached = readCache();
    if (cached) { setLocation(cached); return; }

    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (result) { setLocation(result); writeCache(result); }
      },
      () => {},
      { timeout: 8000, maximumAge: 300_000 }
    );
  }, []);

  // ── Campus dropdown: close on outside click ──────
  useEffect(() => {
    if (!campusOpen) return;
    const handler = (e: MouseEvent) => {
      if (campusRef.current && !campusRef.current.contains(e.target as Node)) {
        setCampusOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [campusOpen]);

  function selectCampus(name: string) {
    setUniversity(name);
    setCampusOpen(false);
    setCampusSearch("");
    try { localStorage.setItem("preferred_campus", name); } catch {}
    router.push(`/catalog?university=${encodeURIComponent(name)}`);
  }

  // ── ⌘K shortcut ─────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/catalog?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <>
    <header className="ut-nav">
      <div className="ut-nav-inner">
        <Link href={isLoggedIn ? "/catalog" : "/"} className="ut-logo">
          <span className="ut-logo-mark">u</span>
          <span>KolejSwap</span>
        </Link>

        <form className="ut-search" onSubmit={handleSearch}>
          <Search size={15} style={{ color: "var(--ut-ink-mute)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            placeholder="Search textbooks, electronics, services…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="ut-search-kbd">⌘K</span>
        </form>

        <div className={`ut-nav-actions${isLoggedIn ? " ut-nav-actions-auth" : ""}`}>
          {isLoggedIn ? (
            <>
              <Link href="/listings" className="ut-nav-btn ut-nav-btn-desktop" aria-label="My listings">
                <Bookmark size={17} />
              </Link>
              <button className="ut-nav-btn ut-nav-btn-desktop" aria-label="Notifications"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <Bell size={17} />
                <span className="ut-dot" />
              </button>
              <Link href="/messages" className="ut-nav-btn ut-nav-btn-desktop" aria-label="Messages" style={{ position: "relative" }}>
                <MessageSquare size={17} />
                {unreadCount > 0 && <span className="ut-dot" />}
              </Link>
              <Link href="/sell" className="ut-cta ut-cta-primary"
                style={{ fontSize: 13, padding: "8px 14px", borderRadius: 999 }}>
                <Plus size={14} /> Post
              </Link>
            </>
          ) : (
            <>
              <Link href="/login"    className="ut-cta ut-cta-ghost ut-nav-guest-btn"   style={{ fontSize: 13, padding: "8px 14px" }}>Sign in</Link>
              <Link href="/register" className="ut-cta ut-cta-primary ut-nav-guest-btn" style={{ fontSize: 13, padding: "8px 14px" }}>Join free</Link>
              <button className="ut-hamburger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                <Menu size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab && (
        <div className="ut-subnav">
          <div ref={campusRef} style={{ position: "relative" }}>
            <button
              className="ut-campus-pill"
              onClick={() => { setCampusOpen(o => !o); setCampusSearch(""); }}
              style={{ background: undefined, border: undefined, cursor: "pointer", font: "inherit" }}
            >
              <span className="ut-pin">U</span>
              <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {university}
              </span>
              {location?.label && (
                <>
                  <span style={{ opacity: 0.4, fontWeight: 400 }}>·</span>
                  <span style={{ opacity: 0.75, fontWeight: 400, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {location.label}
                  </span>
                </>
              )}
              <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: campusOpen ? "rotate(180deg)" : "none", flexShrink: 0 }} />
            </button>

            {campusOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 300,
                background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
                borderRadius: 12, width: 300, boxShadow: "0 8px 28px rgba(0,0,0,0.13)",
                overflow: "hidden",
              }}>
                <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--ut-line)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Search size={13} style={{ color: "var(--ut-ink-mute)", flexShrink: 0 }} />
                  <input
                    autoFocus
                    placeholder="Search universities…"
                    value={campusSearch}
                    onChange={e => setCampusSearch(e.target.value)}
                    style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--ut-ink)" }}
                  />
                  {campusSearch && (
                    <button onClick={() => setCampusSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--ut-ink-mute)", display: "grid", placeItems: "center" }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 268, overflowY: "auto" }}>
                  {(() => {
                    const filtered = NIGERIAN_UNIVERSITIES.filter(u =>
                      u.toLowerCase().includes(campusSearch.toLowerCase())
                    );
                    if (filtered.length === 0) return (
                      <p style={{ padding: "14px 16px", fontSize: 13, color: "var(--ut-ink-mute)", margin: 0 }}>No universities found</p>
                    );
                    return filtered.map(name => (
                      <button
                        key={name}
                        onClick={() => selectCampus(name)}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "9px 16px", fontSize: 13, lineHeight: 1.4,
                          background: university === name ? "var(--ut-primary-tint)" : "transparent",
                          color: university === name ? "var(--ut-primary-ink)" : "var(--ut-ink)",
                          border: "none", cursor: "pointer",
                          fontWeight: university === name ? 600 : 400,
                        }}
                      >
                        {name}
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>

          <nav className="ut-tabs">
            {TABS.map((tab) => (
              <Link key={tab.id} href={tab.href} className="ut-tab"
                data-active={activeTab === tab.id ? "true" : "false"}>
                {tab.label}
                {tab.id === "messages" && unreadCount > 0 && (
                  <span style={{
                    background: "var(--ut-accent)", color: "white",
                    borderRadius: 999, fontSize: 10, fontWeight: 700,
                    padding: "1px 6px", minWidth: 18, textAlign: "center",
                    fontFamily: "var(--ut-font-mono)",
                  }}>
                    {unreadCount}
                  </span>
                )}
                {tab.id === "swaps" && pendingSwaps > 0 && (
                  <span style={{
                    background: "var(--ut-accent)", color: "white",
                    borderRadius: 999, fontSize: 10, fontWeight: 700,
                    padding: "1px 6px", minWidth: 18, textAlign: "center",
                    fontFamily: "var(--ut-font-mono)",
                  }}>
                    {pendingSwaps}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>

    {menuOpen && (
      <div className="ut-mobile-menu" role="dialog" aria-modal="true">
        <div className="ut-mobile-menu-head">
          <Link href="/" className="ut-logo" onClick={() => setMenuOpen(false)}>
            <span className="ut-logo-mark">u</span>
            <span>KolejSwap</span>
          </Link>
          <button className="ut-hamburger" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="ut-mobile-menu-nav">
          <Link href="/catalog" className="ut-mobile-menu-link" onClick={() => setMenuOpen(false)}>
            Browse listings
          </Link>
          <Link href="/login" className="ut-mobile-menu-link" onClick={() => setMenuOpen(false)}>
            Sign in
          </Link>
        </nav>
        <div className="ut-mobile-menu-foot">
          <Link
            href="/register"
            className="ut-cta ut-cta-primary"
            style={{ width: "100%", justifyContent: "center", padding: "14px 16px", fontSize: 15, borderRadius: 14 }}
            onClick={() => setMenuOpen(false)}
          >
            Join free
          </Link>
        </div>
      </div>
    )}

    {/* Mobile bottom navigation — only shown on small screens via CSS */}
    {isLoggedIn && (
      <nav className="ut-bottom-nav" aria-label="Main navigation">
        {[
          { id: "browse",   label: "Browse",   href: "/catalog",  Icon: LayoutGrid    },
          { id: "messages", label: "Inbox",    href: "/messages", Icon: MessageSquare },
          { id: "sell",     label: "Post",     href: "/sell",     Icon: Plus, special: true },
          { id: "orders",   label: "Orders",   href: "/orders",   Icon: Package       },
          { id: "profile",  label: "Profile",  href: "/profile",  Icon: User          },
        ].map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`ut-bottom-tab${tab.special ? " ut-bottom-tab-sell" : ""}`}
            data-active={activeTab === tab.id ? "true" : "false"}
          >
            <span className="ut-bottom-tab-icon">
              <tab.Icon size={tab.special ? 20 : 19} />
            </span>
            <span className="ut-bottom-tab-label">{tab.label}</span>
            {tab.id === "messages" && unreadCount > 0 && (
              <span className="ut-bottom-tab-badge">{unreadCount}</span>
            )}
          </Link>
        ))}
      </nav>
    )}
    </>
  );
}
