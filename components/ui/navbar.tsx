"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Bell, Bookmark, MessageSquare, ChevronDown, Plus, LayoutGrid, Package, User } from "lucide-react";
import { LOC_CACHE_KEY, LOC_CACHE_TTL, type CachedLocation } from "@/lib/hooks/use-location";

const TABS = [
  { id: "browse",   label: "Browse",   href: "/catalog"  },
  { id: "sell",     label: "Sell",     href: "/sell"     },
  { id: "messages", label: "Messages", href: "/messages" },
  { id: "orders",   label: "Orders",   href: "/orders"   },
  { id: "profile",  label: "Profile",  href: "/profile"  },
];

function getActiveTab(path: string) {
  if (path.startsWith("/catalog") || path.startsWith("/product")) return "browse";
  if (path.startsWith("/sell"))      return "sell";
  if (path.startsWith("/messages"))  return "messages";
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
  const inputRef = useRef<HTMLInputElement>(null);

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
          <span>CampSwap</span>
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
              <Link href="/login"    className="ut-cta ut-cta-ghost"   style={{ fontSize: 13, padding: "8px 14px" }}>Sign in</Link>
              <Link href="/register" className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "8px 14px" }}>Join free</Link>
            </>
          )}
        </div>
      </div>

      {activeTab && (
        <div className="ut-subnav">
          <span className="ut-campus-pill">
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
            <ChevronDown size={13} />
          </span>

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
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>

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
