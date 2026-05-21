"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="ut-nav">
        <div className="ut-nav-inner ut-landing-nav-inner">
          <Link href="/" className="ut-logo">
            <span className="ut-logo-mark">u</span>
            <span>KolejSwap</span>
          </Link>
          <div className="ut-nav-actions ut-landing-nav-desktop">
            <Link href="/catalog" className="ut-cta ut-cta-ghost ut-landing-browse" style={{ fontSize: 13, padding: "8px 14px" }}>
              Browse
            </Link>
            <Link href="/login" className="ut-cta ut-cta-ghost" style={{ fontSize: 13, padding: "8px 14px" }}>
              Sign in
            </Link>
            <Link href="/register" className="ut-cta ut-cta-primary" style={{ fontSize: 13, padding: "8px 14px" }}>
              Join free
            </Link>
          </div>
          <button className="ut-hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {open && (
        <div className="ut-mobile-menu" role="dialog" aria-modal="true">
          <div className="ut-mobile-menu-head">
            <Link href="/" className="ut-logo" onClick={() => setOpen(false)}>
              <span className="ut-logo-mark">u</span>
              <span>KolejSwap</span>
            </Link>
            <button className="ut-hamburger" onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={20} />
            </button>
          </div>
          <nav className="ut-mobile-menu-nav">
            <Link href="/catalog" className="ut-mobile-menu-link" onClick={() => setOpen(false)}>
              Browse listings
            </Link>
            <Link href="/login" className="ut-mobile-menu-link" onClick={() => setOpen(false)}>
              Sign in
            </Link>
          </nav>
          <div className="ut-mobile-menu-foot">
            <Link
              href="/register"
              className="ut-cta ut-cta-primary"
              style={{ width: "100%", justifyContent: "center", padding: "14px 16px", fontSize: 15, borderRadius: 14 }}
              onClick={() => setOpen(false)}
            >
              Join free
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
