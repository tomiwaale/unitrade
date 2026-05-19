// Unitrade — screen components

const HomeScreen = ({ data, state, setState, openListing, toggleSave }) => {
  const cat = state.category;
  const filtered = useMemo(() => {
    let arr = data.listings;
    if (cat !== "all") arr = arr.filter((l) => l.category === cat);
    if (state.filter === "swap") arr = arr.filter((l) => l.tradeable);
    if (state.filter === "under5k") arr = arr.filter((l) => l.price <= 5000);
    if (state.filter === "today") arr = arr.filter((l) => /h ago|Today/.test(l.posted));
    if (state.query) {
      const q = state.query.toLowerCase();
      arr = arr.filter((l) =>
        l.title.toLowerCase().includes(q) ||
        l.tags.some((t) => t.toLowerCase().includes(q)) ||
        l.seller.name.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [cat, state.filter, state.query, data]);

  const featured = data.listings.find((l) => l.id === "l_02");
  const swapPick = data.listings.find((l) => l.id === "l_01");

  return (
    <>
      {/* Hero */}
      <section className="ut-hero">
        <div className="ut-hero-main">
          <div>
            <span className="ut-hero-eyebrow">Live · {data.university.short}</span>
            <h1 className="ut-hero-title">Buy, sell, or <em>swap</em> with students next door.</h1>
          </div>
          <div className="ut-hero-meta">
            <span><b>1,284</b> active listings</span>
            <span><b>312</b> students online</span>
            <span><b>₦0</b> fees for swaps</span>
          </div>
          <div className="ut-hero-cta-row">
            <button className="ut-cta" onClick={() => setState({ ...state, tab: "sell" })}>
              <Icons.Plus size={15}/> Post a listing
            </button>
            <button className="ut-cta ut-cta-ghost" onClick={() => setState({ ...state, category: "all", filter: "swap" })}>
              <Icons.Swap size={15}/> Browse swaps
            </button>
          </div>
        </div>
        <div className="ut-hero-side">
          <div className="ut-hero-card">
            <div>
              <span className="ut-eye">Featured · final-year sale</span>
              <h3>{featured.title}</h3>
              <p>Selling fast — {featured.saves} students watching this listing.</p>
            </div>
            <div className="ut-hero-card-foot">
              <span className="ut-price" style={{ fontSize: 20 }}>{NGN(featured.price)}</span>
              <a href="#" onClick={(e) => { e.preventDefault(); openListing(featured); }}>View →</a>
            </div>
          </div>
          <div className="ut-hero-card dark">
            <div>
              <span className="ut-eye" style={{ color: "var(--ut-accent)" }}>Swap of the day</span>
              <h3>Trade textbooks across departments</h3>
              <p>Engineering math for 100L Pharm chemistry? It's happening.</p>
            </div>
            <div className="ut-hero-card-foot">
              <span style={{ fontFamily: "var(--ut-font-mono)", fontSize: 12, opacity: 0.7 }}>
                42 swaps this week
              </span>
              <a href="#" onClick={(e) => { e.preventDefault(); openListing(swapPick); }}>Open →</a>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <div className="ut-cat-row">
        <button
          className="ut-cat"
          aria-pressed={cat === "all"}
          onClick={() => setState({ ...state, category: "all" })}
        >
          <span className="ut-cat-icon"><Icons.Grid size={18}/></span>
          <span className="ut-cat-text">
            <b>All</b>
            <span>{data.listings.length} listings</span>
          </span>
        </button>
        {data.categories.slice(0, 4).map((c) => {
          const count = data.listings.filter((l) => l.category === c.id).length;
          return (
            <button key={c.id}
              className="ut-cat"
              aria-pressed={cat === c.id}
              onClick={() => setState({ ...state, category: c.id })}
            >
              <span className="ut-cat-icon"><CatIcon id={c.id} size={18}/></span>
              <span className="ut-cat-text">
                <b>{c.label}</b>
                <span>{count} listings</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter rail */}
      <div className="ut-filter-rail">
        <span className="label">Sort by</span>
        {[
          { id: "all", label: "Recently posted" },
          { id: "swap", label: "Open to swap" },
          { id: "under5k", label: "Under ₦5k" },
          { id: "today", label: "Posted today" },
        ].map((f) => (
          <button key={f.id} className="ut-chip" aria-pressed={state.filter === f.id}
            onClick={() => setState({ ...state, filter: f.id })}>
            {f.label}
          </button>
        ))}
        <div style={{ flex: 1 }}/>
        <button className="ut-chip"><Icons.Filter size={12}/> &nbsp;More filters</button>
      </div>

      <div className="ut-section-head">
        <div>
          <span className="ut-sub">On campus now</span>
          <h2>For you, {data.currentUser.name.split(" ")[0]}</h2>
        </div>
        <div className="ut-section-head-right">
          <button className="ut-chip" aria-pressed><Icons.Grid size={12}/></button>
          <button className="ut-chip"><Icons.List size={12}/></button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--ut-ink-mute)",
          border: "1px dashed var(--ut-line)", borderRadius: 22, background: "var(--ut-bg-card)" }}>
          <Icons.Search size={22} style={{ color: "var(--ut-ink-mute)", marginBottom: 8 }}/>
          <p style={{ margin: 0, fontSize: 14 }}>No listings match those filters. Try widening your search.</p>
        </div>
      ) : (
        <div className="ut-grid">
          {filtered.map((l) => (
            <Card key={l.id} listing={l} onOpen={openListing}
              saved={state.saved.includes(l.id)} onToggleSave={toggleSave}/>
          ))}
        </div>
      )}

      <div className="ut-ticker">
        <span>Unitrade · <b>{data.university.short}</b></span>
        <span><b>1,284</b> live listings</span>
        <span><b>312</b> students online</span>
        <span>Avg. response time <b>9 min</b></span>
        <span>Last deal closed <b>2 min ago</b></span>
      </div>
    </>
  );
};

const DetailScreen = ({ listing, data, onBack, openTrade, openCheckout, saved, onToggleSave, openMessages }) => {
  const seller = listing.seller;
  return (
    <>
      <button className="ut-detail-back" onClick={onBack}>
        <Icons.ChevronLeft size={16}/> Back to browse
      </button>
      <div className="ut-detail">
        <div>
          <div className="ut-detail-media" data-swatch={listing.swatch}>
            <span className="emoji">{listing.slug}</span>
            <div className="ut-card-badges" style={{ top: 16, left: 16, right: 16 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {listing.tradeable && <span className="ut-badge dark"><Icons.Swap size={11}/> Open to swap</span>}
                {listing.escrow && <span className="ut-badge"><Icons.Shield size={11}/> Escrow available</span>}
              </div>
              <button className="ut-card-save" aria-pressed={saved}
                onClick={() => onToggleSave(listing.id)}>
                {saved ? <Icons.HeartFill size={14}/> : <Icons.Heart size={14}/>}
              </button>
            </div>
          </div>
          <div className="ut-detail-thumbs">
            <div className="thumb active"></div>
            <div className="thumb"></div>
            <div className="thumb"></div>
            <div className="thumb"></div>
          </div>
        </div>

        <div className="ut-detail-info">
          <span style={{ fontFamily: "var(--ut-font-mono)", fontSize: 11, color: "var(--ut-ink-mute)",
            textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {data.categories.find((c) => c.id === listing.category)?.label} · {listing.condition}
          </span>
          <h1>{listing.title}</h1>
          <div className="ut-detail-pricerow">
            <div>
              <span className="ut-price">{NGN(listing.price)}</span>
              {listing.priceUnit && <span className="ut-price-unit">{listing.priceUnit}</span>}
            </div>
            {listing.negotiable && (
              <span style={{ fontFamily: "var(--ut-font-mono)", fontSize: 12,
                color: "var(--ut-primary)", background: "var(--ut-primary-tint)",
                padding: "4px 8px", borderRadius: 6 }}>
                Negotiable
              </span>
            )}
          </div>

          <div className="ut-detail-tags">
            {listing.tradeable && <span className="ut-tag green"><Icons.Swap size={11} style={{ verticalAlign: "middle" }}/> Open to swap</span>}
            {listing.tags.map((t) => <span key={t} className="ut-tag">{t}</span>)}
            <span className="ut-tag"><Icons.Pin size={11} style={{ verticalAlign: "middle" }}/> {listing.hall}</span>
          </div>

          <p className="ut-detail-blurb">{listing.blurb}</p>

          <div className="ut-detail-seller">
            <Avatar name={seller.avatar} size={44} bg="var(--ut-primary)"/>
            <div className="ut-seller-meta">
              <b>{seller.name} {seller.id === "u_dami" && <Icons.Check size={12} style={{ color: "var(--ut-primary)", verticalAlign: "middle" }}/>}</b>
              <span>{seller.dept} · {listing.hall}</span>
            </div>
            <div className="ut-seller-stat">
              <b>★ {seller.rating}</b><br/>
              <span>{seller.deals} deals</span>
            </div>
          </div>

          <div className="ut-detail-actions">
            <button className="ut-cta ut-cta-primary" onClick={() => openCheckout(listing)}>
              <Icons.Lock size={15}/> Buy with escrow
            </button>
            <button className="ut-cta ut-cta-ghost" onClick={() => openMessages(listing)}>
              Message {seller.name.split(" ")[0]}
            </button>
            {listing.tradeable && (
              <button className="ut-cta" style={{ gridColumn: "span 2", background: "var(--ut-ink)" }}
                onClick={() => openTrade(listing)}>
                <Icons.Swap size={15}/> Propose a swap
              </button>
            )}
          </div>

          <div className="ut-trust-row">
            <div>
              <Icons.Shield size={16}/>
              <b>Verified student</b>
              <span>Confirmed UNILAG ID on file</span>
            </div>
            <div>
              <Icons.Lock size={16}/>
              <b>Escrow holds payment</b>
              <span>Funds released after handoff</span>
            </div>
            <div>
              <Icons.Pin size={16}/>
              <b>Safe meetup</b>
              <span>Suggested: New Hall lobby, daytime</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

window.HomeScreen = HomeScreen;
window.DetailScreen = DetailScreen;
