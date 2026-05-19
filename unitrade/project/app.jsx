// Unitrade — root app
const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "campus",
  "font": "geist"
}/*EDITMODE-END*/;

const THEMES = {
  campus: {
    label: "Campus Green",
    "--ut-primary": "#0F8A4F",
    "--ut-primary-ink": "#073B22",
    "--ut-primary-tint": "#E6F4ED",
    "--ut-accent": "#FF5A1F",
    "--ut-bg": "#F7F4EE",
    "--ut-bg-sunken": "#EFEBE3",
    "--ut-line": "#E4DFD3",
    "--ut-line-soft": "#EDE9DF",
    "--ut-ink": "#14130F",
    "--ut-ink-soft": "#4A4940",
    "--ut-ink-mute": "#8A877B",
  },
  lagos: {
    label: "Lagos Blue",
    "--ut-primary": "#2E62E0",
    "--ut-primary-ink": "#0E2A6E",
    "--ut-primary-tint": "#E7EEFD",
    "--ut-accent": "#F5C518",
    "--ut-bg": "#F4F5F8",
    "--ut-bg-sunken": "#E9ECF2",
    "--ut-line": "#DDE1EA",
    "--ut-line-soft": "#E8EBF1",
    "--ut-ink": "#0F1430",
    "--ut-ink-soft": "#3F4664",
    "--ut-ink-mute": "#7E83A0",
  },
  sunset: {
    label: "Sunset Orange",
    "--ut-primary": "#E04A1A",
    "--ut-primary-ink": "#6B1E08",
    "--ut-primary-tint": "#FBE8DF",
    "--ut-accent": "#1D6E5E",
    "--ut-bg": "#FAF6F0",
    "--ut-bg-sunken": "#F0E8DC",
    "--ut-line": "#E5DAC6",
    "--ut-line-soft": "#EEE4D2",
    "--ut-ink": "#1B1410",
    "--ut-ink-soft": "#4E3F35",
    "--ut-ink-mute": "#8B7C6D",
  },
  midnight: {
    label: "Midnight",
    "--ut-primary": "#9CE08E",
    "--ut-primary-ink": "#0B2316",
    "--ut-primary-tint": "#16322A",
    "--ut-accent": "#FF7E45",
    "--ut-bg": "#0F1410",
    "--ut-bg-card": "#181E1A",
    "--ut-bg-sunken": "#222823",
    "--ut-line": "#2A3128",
    "--ut-line-soft": "#202621",
    "--ut-ink": "#F1EFEA",
    "--ut-ink-soft": "#BCBAB1",
    "--ut-ink-mute": "#7E8275",
  },
};

const FONTS = {
  geist: {
    label: "Geist",
    sans: "\"Geist\", ui-sans-serif, system-ui, sans-serif",
    mono: "\"Geist Mono\", ui-monospace, Menlo, monospace",
  },
  inter: {
    label: "Inter Tight",
    sans: "\"Inter Tight\", ui-sans-serif, system-ui, sans-serif",
    mono: "\"JetBrains Mono\", ui-monospace, Menlo, monospace",
  },
  serif: {
    label: "Instrument · Sans + Serif",
    sans: "\"Instrument Sans\", ui-sans-serif, system-ui, sans-serif",
    mono: "\"JetBrains Mono\", ui-monospace, Menlo, monospace",
    display: "\"Instrument Serif\", Georgia, serif",
  },
  jakarta: {
    label: "Jakarta",
    sans: "\"Plus Jakarta Sans\", ui-sans-serif, system-ui, sans-serif",
    mono: "\"JetBrains Mono\", ui-monospace, Menlo, monospace",
  },
};

function applyTheme(theme) {
  const root = document.documentElement;
  Object.entries(THEMES[theme] || THEMES.campus).forEach(([k, v]) => {
    if (k.startsWith("--")) root.style.setProperty(k, v);
  });
  // bg-card fallback for non-midnight
  if (theme !== "midnight") root.style.setProperty("--ut-bg-card", "#FFFFFF");
}
function applyFont(font) {
  const f = FONTS[font] || FONTS.geist;
  const root = document.documentElement;
  root.style.setProperty("--ut-font-sans", f.sans);
  root.style.setProperty("--ut-font-mono", f.mono);
  root.style.setProperty("--ut-font-display", f.display || f.sans);
}

const App = () => {
  const data = window.UT_DATA;
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  useEffectApp(() => applyTheme(tweaks.theme), [tweaks.theme]);
  useEffectApp(() => applyFont(tweaks.font), [tweaks.font]);

  const [state, setState] = useStateApp({
    tab: "browse",
    category: "all",
    filter: "all",
    query: "",
    saved: ["l_02", "l_04"],
  });
  const [openedListing, setOpened] = useStateApp(null);
  const [tradeFor, setTradeFor] = useStateApp(null);
  const [checkoutFor, setCheckoutFor] = useStateApp(null);
  const [toast, setToast] = useStateApp("");
  const [threadId, setThreadId] = useStateApp("m_01");

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  const toggleSave = (id) => {
    setState((s) => ({
      ...s,
      saved: s.saved.includes(id) ? s.saved.filter(x => x !== id) : [...s.saved, id]
    }));
    flash(state.saved.includes(id) ? "Removed from saved" : "Saved to your list");
  };

  const tabs = [
    { id: "browse", label: "Browse" },
    { id: "swaps", label: "Swaps" },
    { id: "sell", label: "Sell" },
    { id: "messages", label: "Messages" },
    { id: "profile", label: "Profile" },
  ];

  // helper: switch to messages and select a listing's thread
  const openMessages = (listing) => {
    const thread = data.messages.find((m) => m.listingId === listing.id);
    if (thread) setThreadId(thread.id);
    setOpened(null);
    setState((s) => ({ ...s, tab: "messages" }));
  };

  let body;
  if (openedListing) {
    body = (
      <DetailScreen
        listing={openedListing}
        data={data}
        onBack={() => setOpened(null)}
        openTrade={(l) => setTradeFor(l)}
        openCheckout={(l) => setCheckoutFor(l)}
        openMessages={openMessages}
        saved={state.saved.includes(openedListing.id)}
        onToggleSave={toggleSave}
      />
    );
  } else if (state.tab === "browse" || state.tab === "swaps") {
    const effectiveState = state.tab === "swaps" ? { ...state, filter: "swap" } : state;
    body = (
      <HomeScreen
        data={data}
        state={effectiveState}
        setState={(s) => setState({ ...s, tab: state.tab })}
        openListing={(l) => setOpened(l)}
        toggleSave={toggleSave}
      />
    );
  } else if (state.tab === "sell") {
    body = <SellScreen data={data} onPublish={() => { flash("Listing published! It's now live on UNILAG."); setState({ ...state, tab: "browse" }); }}/>;
  } else if (state.tab === "messages") {
    body = <MessagesScreen data={data} threadId={threadId} setThreadId={setThreadId}
      onSend={(t) => flash("Message sent")} />;
  } else if (state.tab === "profile") {
    body = <ProfileScreen data={data} openListing={(l) => setOpened(l)}/>;
  }

  return (
    <div className="ut-app">
      <header className="ut-nav">
        <div className="ut-nav-inner">
          <a href="#" className="ut-logo" onClick={(e) => { e.preventDefault(); setOpened(null); setState({ ...state, tab: "browse" }); }}>
            <span className="ut-logo-mark">u</span>
            <span>Unitrade</span>
          </a>
          <div className="ut-search">
            <Icons.Search size={16} style={{ color: "var(--ut-ink-mute)" }}/>
            <input
              placeholder="Search textbooks, electronics, hostels…"
              value={state.query}
              onChange={(e) => setState({ ...state, query: e.target.value, tab: "browse" })}
              onFocus={() => { if (openedListing) setOpened(null); }}
            />
            <span className="ut-search-kbd">⌘K</span>
          </div>
          <div className="ut-nav-actions">
            <button className="ut-nav-btn" aria-label="Saved" onClick={() => flash(`${state.saved.length} saved items`)}>
              <Icons.Bookmark size={18}/>
            </button>
            <button className="ut-nav-btn" aria-label="Notifications">
              <Icons.Bell size={18}/>
              <span className="ut-dot"></span>
            </button>
            <button className="ut-nav-btn" aria-label="Wallet">
              <Icons.Wallet size={18}/>
            </button>
            <button
              className="ut-cta"
              style={{ background: "var(--ut-primary)" }}
              onClick={() => { setOpened(null); setState({ ...state, tab: "sell" }); }}
            >
              <Icons.Plus size={14}/> Post
            </button>
          </div>
        </div>
        <div className="ut-subnav">
          <span className="ut-campus-pill">
            <span className="ut-pin">U</span>
            {data.university.name} · {data.university.city}
            <Icons.ChevronDown size={14}/>
          </span>
          <div className="ut-tabs">
            {tabs.map((t) => (
              <button key={t.id}
                className="ut-tab"
                aria-current={state.tab === t.id ? "true" : "false"}
                onClick={() => { setOpened(null); setState({ ...state, tab: t.id }); }}
              >
                {t.label}
                {t.id === "messages" && (
                  <span className="ut-unread" style={{ marginLeft: 6, padding: "1px 5px" }}>3</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="ut-main">{body}</main>

      {tradeFor && (
        <TradeModal listing={tradeFor} data={data}
          onClose={() => setTradeFor(null)}
          onSubmit={() => { setTradeFor(null); flash("Swap proposal sent — Kemi will be notified."); }}
        />
      )}
      {checkoutFor && (
        <CheckoutModal listing={checkoutFor}
          onClose={() => setCheckoutFor(null)}
          onConfirm={() => { setCheckoutFor(null); openMessages(checkoutFor); flash("Funds in escrow — message your seller."); }}
        />
      )}

      <Toast msg={toast}/>

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection title="Color theme">
          <window.TweakRadio
            value={tweaks.theme}
            options={Object.entries(THEMES).map(([id, t]) => ({ value: id, label: t.label }))}
            onChange={(v) => setTweak("theme", v)}
          />
        </window.TweakSection>
        <window.TweakSection title="Typography" subtitle="Live font swap">
          <window.TweakRadio
            value={tweaks.font}
            options={Object.entries(FONTS).map(([id, f]) => ({ value: id, label: f.label }))}
            onChange={(v) => setTweak("font", v)}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
