// Unitrade — trade, checkout, sell, messages, profile

const TradeModal = ({ listing, data, onClose, onSubmit }) => {
  const myItems = [
    { id: "my1", title: "Stats Past Q's bundle (2018-23)", swatch: "olive", emoji: "📚", value: 2500 },
    { id: "my2", title: "DSLR camera bag", swatch: "ink", emoji: "🎒", value: 8000 },
    { id: "my3", title: "Yoruba novel set", swatch: "amber", emoji: "📖", value: 3000 },
  ];
  const [pick, setPick] = useState(myItems[0].id);
  const picked = myItems.find((i) => i.id === pick);
  const diff = listing.price - picked.value;

  return (
    <Modal eye="Trade proposal" title={`Swap for ${listing.title}`}
      onClose={onClose} maxWidth={580}
      footer={<>
        <button className="ut-cta ut-cta-ghost" onClick={onClose}>Cancel</button>
        <button className="ut-cta ut-cta-primary" onClick={onSubmit}>
          <Icons.Send size={14}/> Send proposal
        </button>
      </>}
    >
      <p style={{ margin: "0 0 12px", color: "var(--ut-ink-soft)", fontSize: 14, lineHeight: 1.5 }}>
        Pick one of your items to offer in trade. The seller can accept, decline, or counter — and Unitrade holds any top-up in escrow until you both confirm.
      </p>

      <span className="ut-field-label">You're offering</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {myItems.map((it) => (
          <button key={it.id}
            className="ut-radio"
            aria-pressed={pick === it.id}
            onClick={() => setPick(it.id)}
            style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            <div style={{
              aspectRatio: "1.4",
              background: it.swatch === "ink" ? "#2D2C28" :
                          it.swatch === "amber" ? "#F3D38A" : "#C8CDA3",
              display: "grid", placeItems: "center", fontSize: 28, width: "100%"
            }}>{it.emoji}</div>
            <div style={{ padding: "8px 10px", fontSize: 12, lineHeight: 1.3, textAlign: "left", width: "100%" }}>
              {it.title}
              <div style={{ fontFamily: "var(--ut-font-mono)", fontSize: 11,
                color: pick === it.id ? "rgba(255,255,255,0.7)" : "var(--ut-ink-mute)", marginTop: 2 }}>
                ~{NGN(it.value)}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="ut-swap">
        <div className="ut-swap-col">
          <div className="pic" data-swatch={picked.id === "my1" ? "olive" : picked.id === "my2" ? "ink" : "amber"}>
            {picked.emoji}
          </div>
          <small>YOU GIVE</small>
          <b>{picked.title}</b>
        </div>
        <div className="ut-swap-arrow"><Icons.Swap size={22}/></div>
        <div className="ut-swap-col">
          <div className="pic" data-swatch={listing.swatch}>{listing.slug}</div>
          <small>YOU GET</small>
          <b>{listing.title.split(" — ")[0]}</b>
        </div>
      </div>

      {diff > 0 && (
        <div className="ut-topup">
          <span>You add a top-up of</span>
          <b>{NGN(diff)}</b>
        </div>
      )}
      {diff <= 0 && (
        <div className="ut-topup">
          <span>No top-up needed — values match.</span>
          <b>{NGN(0)}</b>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <span className="ut-field-label">Note to seller (optional)</span>
        <textarea className="ut-textarea" placeholder="Hi Kemi — I think we both win on this. I can meet anywhere on campus before 6pm."/>
      </div>
    </Modal>
  );
};

const CheckoutModal = ({ listing, onClose, onConfirm }) => {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState("card");
  const fee = Math.round(listing.price * 0.015);
  const total = listing.price + fee;

  return (
    <Modal eye={`Step ${step} of 3`} title={step === 3 ? "Funds in escrow" : "Secure checkout"}
      onClose={onClose} maxWidth={520}
      footer={
        step === 3 ? (
          <button className="ut-cta ut-cta-primary" style={{ marginLeft: "auto" }} onClick={onConfirm}>
            Open chat with seller →
          </button>
        ) : (
          <>
            {step > 1 && <button className="ut-cta ut-cta-ghost" onClick={() => setStep(step - 1)}>Back</button>}
            <button className="ut-cta ut-cta-primary" style={{ marginLeft: "auto" }}
              onClick={() => setStep(step + 1)}>
              {step === 1 ? "Choose payment" : step === 2 ? `Pay ${NGN(total)}` : ""}
            </button>
          </>
        )
      }
    >
      {step === 1 && (
        <>
          <div style={{ display: "flex", gap: 14, padding: "10px 0 16px", borderBottom: "1px solid var(--ut-line)", alignItems: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, background: "var(--ut-bg-sunken)",
              display: "grid", placeItems: "center", fontSize: 28 }} data-swatch={listing.swatch}>
              {listing.slug}
            </div>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 14, display: "block" }}>{listing.title}</b>
              <span style={{ fontSize: 12, color: "var(--ut-ink-mute)" }}>from {listing.seller.name} · {listing.hall}</span>
            </div>
          </div>
          <div style={{ padding: "14px 0", display: "grid", gap: 10, fontSize: 14 }}>
            <Row k="Item price" v={NGN(listing.price)}/>
            <Row k="Escrow fee (1.5%)" v={NGN(fee)} muted/>
            <Row k="Total" v={NGN(total)} bold/>
          </div>
          <div className="ut-topup" style={{ background: "var(--ut-primary-tint)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Shield size={16} style={{ color: "var(--ut-primary)" }}/>
              Held until you confirm the item is in your hands.
            </span>
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <span className="ut-field-label">Pay with</span>
          <div className="ut-radio-row" style={{ flexDirection: "column", gap: 8 }}>
            {[
              { id: "card", label: "Debit card", sub: "Visa, Verve, Mastercard" },
              { id: "transfer", label: "Bank transfer", sub: "GTBank, Access, Opay…" },
              { id: "wallet", label: "Unitrade wallet", sub: "Balance: ₦12,400" },
            ].map((m) => (
              <button key={m.id} className="ut-radio"
                aria-pressed={method === m.id}
                onClick={() => setMethod(m.id)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}
              >
                <div>
                  <b style={{ display: "block", fontSize: 14 }}>{m.label}</b>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{m.sub}</span>
                </div>
                {method === m.id && <Icons.Check size={16}/>}
              </button>
            ))}
          </div>
        </>
      )}
      {step === 3 && (
        <div style={{ padding: "16px 0", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--ut-primary-tint)",
            color: "var(--ut-primary-ink)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
            <Icons.Check size={28}/>
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600 }}>{NGN(total)} held safely</h3>
          <p style={{ margin: 0, color: "var(--ut-ink-soft)", fontSize: 14, lineHeight: 1.5 }}>
            {listing.seller.name.split(" ")[0]} has been notified. Meet up, inspect the item, and tap <b>Release</b> in chat once you're happy.
          </p>
          <div style={{ marginTop: 16, padding: 12, background: "var(--ut-bg-card)",
            borderRadius: 10, border: "1px solid var(--ut-line)", fontSize: 12, fontFamily: "var(--ut-font-mono)",
            color: "var(--ut-ink-soft)" }}>
            ESCROW ID — UT-{Date.now().toString().slice(-6)}
          </div>
        </div>
      )}
    </Modal>
  );
};

const Row = ({ k, v, muted, bold }) => (
  <div style={{ display: "flex", justifyContent: "space-between",
    color: muted ? "var(--ut-ink-mute)" : "var(--ut-ink)",
    fontWeight: bold ? 600 : 400,
    paddingTop: bold ? 10 : 0,
    borderTop: bold ? "1px solid var(--ut-line)" : "none",
  }}>
    <span>{k}</span>
    <span style={{ fontFamily: "var(--ut-font-mono)" }}>{v}</span>
  </div>
);

const SellScreen = ({ data, onPublish }) => {
  const [form, setForm] = useState({
    title: "Hostel mini-fridge — barely used",
    price: 38000,
    category: "furniture",
    condition: "Good",
    tradeable: true,
    escrow: true,
    blurb: "Used for one semester in Mariere Hall. Cools fast, very quiet. Pickup at gate.",
  });
  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <>
      <div className="ut-section-head" style={{ marginTop: 0 }}>
        <div>
          <span className="ut-sub">New listing</span>
          <h2>Post something for sale or swap</h2>
        </div>
      </div>
      <div className="ut-sell-layout">
        <div>
          <div className="ut-form-grid">
            <div className="ut-upload">
              <Icons.Upload size={28}/>
              <b>Drag photos here, or tap to upload</b>
              <span>Up to 6 photos · clear lighting helps you sell faster</span>
              <div className="ut-upload-thumbs">
                <div className="t">🧊</div>
                <div className="t">📸</div>
                <div className="t" style={{ borderStyle: "dashed", fontSize: 18, color: "var(--ut-ink-mute)" }}>+</div>
              </div>
            </div>

            <div className="ut-form-field full">
              <label className="ut-field-label">Item title</label>
              <input className="ut-input" value={form.title} onChange={(e) => set("title", e.target.value)}/>
            </div>

            <div className="ut-form-field">
              <label className="ut-field-label">Category</label>
              <select className="ut-select" value={form.category} onChange={(e) => set("category", e.target.value)}>
                {data.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="ut-form-field">
              <label className="ut-field-label">Condition</label>
              <select className="ut-select" value={form.condition} onChange={(e) => set("condition", e.target.value)}>
                <option>Brand new</option><option>Like new</option>
                <option>Good</option><option>Fair</option><option>For parts</option>
              </select>
            </div>

            <div className="ut-form-field">
              <label className="ut-field-label">Price (₦)</label>
              <input className="ut-input" type="number" value={form.price} onChange={(e) => set("price", +e.target.value)}/>
            </div>
            <div className="ut-form-field">
              <label className="ut-field-label">Open to</label>
              <div className="ut-radio-row">
                <button className="ut-radio" aria-pressed={!form.tradeable && form.escrow} onClick={() => setForm({ ...form, tradeable: false, escrow: true })}>Cash only</button>
                <button className="ut-radio" aria-pressed={form.tradeable && form.escrow} onClick={() => setForm({ ...form, tradeable: true, escrow: true })}>Cash or swap</button>
                <button className="ut-radio" aria-pressed={form.tradeable && !form.escrow} onClick={() => setForm({ ...form, tradeable: true, escrow: false })}>Swap only</button>
              </div>
            </div>

            <div className="ut-form-field full">
              <label className="ut-field-label">Description</label>
              <textarea className="ut-textarea" value={form.blurb} onChange={(e) => set("blurb", e.target.value)}/>
            </div>

            <div className="ut-form-field full">
              <label className="ut-field-label">Meetup hall / hostel</label>
              <input className="ut-input" placeholder="e.g. Mariere Hall, Akoka gate" defaultValue="Mariere Hall"/>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
            <button className="ut-cta ut-cta-ghost">Save as draft</button>
            <button className="ut-cta ut-cta-primary" onClick={onPublish}>
              <Icons.Check size={15}/> Publish listing
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="ut-sell-preview">
          <span className="ut-eye">Live preview · what buyers see</span>
          <div className="ut-card" style={{ cursor: "default" }}>
            <div className="ut-card-media" data-swatch="ice">
              <div className="ut-card-badges">
                <div style={{ display: "flex", gap: 6 }}>
                  {form.tradeable && <span className="ut-badge dark"><Icons.Swap size={11}/> Swap</span>}
                  {form.escrow && <span className="ut-badge"><Icons.Shield size={11}/> Escrow</span>}
                </div>
              </div>
              <span className="ut-card-media-emoji" aria-hidden>🧊</span>
            </div>
            <div className="ut-card-body">
              <h3 className="ut-card-title">{form.title || "Item title"}</h3>
              <div className="ut-card-meta">
                <span className="ut-card-seller">
                  <Avatar name={data.currentUser.avatar}/> {data.currentUser.name}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11.5 }}>
                  <Icons.Star size={11} style={{ color: "var(--ut-yellow)" }}/> {data.currentUser.rating}
                </span>
              </div>
              <div className="ut-card-price-row">
                <span className="ut-price">{NGN(form.price)}</span>
                <span className="ut-card-foot"><Icons.Pin size={11}/> Mariere Hall</span>
              </div>
            </div>
          </div>
          <div style={{ padding: 12, background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
            borderRadius: 14, fontSize: 12, color: "var(--ut-ink-soft)", lineHeight: 1.5 }}>
            <b style={{ color: "var(--ut-ink)" }}>Tip:</b> Listings with 3+ photos and a meetup hall get <b>2.4×</b> more views in your first 24 hours.
          </div>
        </div>
      </div>
    </>
  );
};

const MessagesScreen = ({ data, threadId, setThreadId, draftRef, onSend }) => {
  const thread = data.messages.find((m) => m.id === threadId) || data.messages[0];
  const [draft, setDraft] = useState("");
  return (
    <>
      <div className="ut-section-head" style={{ marginTop: 0 }}>
        <div>
          <span className="ut-sub">Direct</span>
          <h2>Messages</h2>
        </div>
      </div>
      <div className="ut-msg-layout">
        <div className="ut-msg-list">
          <div className="ut-msg-list-head">
            <h3>Inbox</h3>
            <span>3 active</span>
          </div>
          {data.messages.map((m) => (
            <button key={m.id}
              className="ut-msg-row"
              aria-current={m.id === thread.id}
              onClick={() => setThreadId(m.id)}
            >
              <Avatar name={m.with.avatar} size={36} bg="var(--ut-bg-sunken)"/>
              <div className="ut-msg-row-text">
                <b>{m.with.name} <small>{m.ts}</small></b>
                <div className="listing">re: {m.listingTitle}</div>
                <div className="snippet">{m.lastSnippet}</div>
              </div>
              {m.unread > 0 && <span className="ut-unread">{m.unread}</span>}
            </button>
          ))}
        </div>

        <div className="ut-msg-thread">
          <div className="ut-msg-thread-head">
            <Avatar name={thread.with.avatar} size={38} bg="var(--ut-bg-sunken)"/>
            <div className="who">
              <b>{thread.with.name}</b>
              <span>{thread.with.dept}</span>
            </div>
            <div className="listing-ref">📎 {thread.listingTitle}</div>
          </div>

          <div className="ut-msg-thread-body">
            {thread.thread.map((b, i) => (
              <div key={i} className={`ut-bubble ${b.from}`}>
                {b.t}
                <small>{b.at}</small>
              </div>
            ))}
            {thread.id === "m_02" && (
              <div className="ut-system-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  marginBottom: 4, color: "var(--ut-primary)" }}>
                  <Icons.Shield size={14}/> <b>Escrow ready</b>
                </div>
                Fund ₦505,000 to hold this MacBook. Dami will be notified.
              </div>
            )}
            {thread.id === "m_03" && (
              <div className="ut-system-card" style={{ background: "var(--ut-primary-tint)", borderColor: "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6, color: "var(--ut-primary-ink)" }}>
                  <Icons.Swap size={14}/> <b>Swap proposal</b>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                  <span>Ada's denim jacket (M)</span>
                  <Icons.Swap size={14}/>
                  <span>Your Ankara two-piece</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--ut-primary-ink)" }}>
                  + ₦1,500 top-up to you
                </div>
              </div>
            )}
          </div>

          <div className="ut-msg-input">
            <div className="ut-msg-tools">
              <button className="ut-msg-tool" aria-label="Photo"><Icons.Camera size={16}/></button>
              <button className="ut-msg-tool" aria-label="Offer"><Icons.Tag size={16}/></button>
            </div>
            <input placeholder={`Message ${thread.with.name.split(" ")[0]}…`}
              value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onSend(draft); setDraft(""); } }}
            />
            <button className="ut-send-btn" onClick={() => { if (draft.trim()) { onSend(draft); setDraft(""); } }}>
              <Icons.Send size={15}/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const ProfileScreen = ({ data, openListing }) => {
  const u = data.currentUser;
  const mine = data.listings.slice(0, 3).map((l) => ({ ...l, seller: u, hall: "Mariere Hall" }));
  return (
    <>
      <div className="ut-profile-hero">
        <Avatar name={u.avatar} size={72} bg="var(--ut-primary)"/>
        <div className="ut-profile-meta">
          <h1>{u.name} <span className="ut-verify"><Icons.Check size={11}/> Verified · UNILAG</span></h1>
          <p>{u.dept} · Mariere Hall · joined Aug 2024</p>
        </div>
        <div className="ut-profile-stats">
          <div className="s"><b>{u.deals}</b><span>Deals</span></div>
          <div className="s"><b>★ {u.rating}</b><span>Rating</span></div>
          <div className="s"><b>97%</b><span>Reply rate</span></div>
        </div>
      </div>

      <div className="ut-section-head">
        <div>
          <span className="ut-sub">Your storefront</span>
          <h2>Active listings</h2>
        </div>
        <button className="ut-chip">Manage all →</button>
      </div>

      <div className="ut-grid">
        {mine.map((l) => (
          <Card key={l.id} listing={l} onOpen={openListing} saved={false} onToggleSave={() => {}}/>
        ))}
      </div>

      <div className="ut-section-head">
        <div>
          <span className="ut-sub">Recent activity</span>
          <h2>Deal history</h2>
        </div>
      </div>
      <div style={{ background: "var(--ut-bg-card)", border: "1px solid var(--ut-line)",
        borderRadius: 14, overflow: "hidden" }}>
        {[
          { who: "Bayo K.", item: "Engineering Drawing Set", amount: 4200, ts: "May 12", status: "Released" },
          { who: "Femi A.", item: "iPhone 12 (sold)", amount: 285000, ts: "May 4", status: "Released" },
          { who: "Ada N.", item: "Ankara swap + top-up", amount: 1500, ts: "Apr 28", status: "Swap" },
          { who: "Jide F.", item: "Stats tutoring x4", amount: 8000, ts: "Apr 21", status: "Released" },
        ].map((d, i) => (
          <div key={i} style={{
            padding: "14px 18px", display: "grid",
            gridTemplateColumns: "auto 1fr auto auto", gap: 14, alignItems: "center",
            borderBottom: i < 3 ? "1px solid var(--ut-line-soft)" : "none"
          }}>
            <Avatar name={d.who.split(" ").map(x => x[0]).join("")} size={32}/>
            <div>
              <b style={{ fontSize: 13.5, fontWeight: 500 }}>{d.item}</b>
              <div style={{ fontSize: 12, color: "var(--ut-ink-mute)" }}>with {d.who} · {d.ts}</div>
            </div>
            <span style={{ fontSize: 11, fontFamily: "var(--ut-font-mono)",
              padding: "3px 8px", borderRadius: 6,
              background: d.status === "Swap" ? "var(--ut-primary-tint)" : "var(--ut-bg-sunken)",
              color: d.status === "Swap" ? "var(--ut-primary-ink)" : "var(--ut-ink-soft)" }}>
              {d.status}
            </span>
            <span className="ut-price" style={{ fontSize: 15 }}>{NGN(d.amount)}</span>
          </div>
        ))}
      </div>
    </>
  );
};

window.TradeModal = TradeModal;
window.CheckoutModal = CheckoutModal;
window.SellScreen = SellScreen;
window.MessagesScreen = MessagesScreen;
window.ProfileScreen = ProfileScreen;
