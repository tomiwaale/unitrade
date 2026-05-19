// Unitrade — shared UI primitives
const { useState, useEffect, useMemo, useRef } = React;

const NGN = (n) => {
  if (n == null) return "—";
  return "₦" + n.toLocaleString("en-NG");
};

const Avatar = ({ name, size = 22, bg }) => (
  <div className="ut-avatar" style={{ width: size, height: size, fontSize: Math.max(9, size * 0.42), background: bg }}>
    {name}
  </div>
);

const Card = ({ listing, onOpen, saved, onToggleSave }) => {
  const dealish = listing.price <= 5000 || /deal|cheap/i.test(listing.title);
  const seller = listing.seller;
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(listing); }
  };
  return (
    <div className="ut-card" role="button" tabIndex={0}
      onClick={() => onOpen(listing)} onKeyDown={onKey}>
      <div className="ut-card-media" data-swatch={listing.swatch}>
        <div className="ut-card-badges">
          <div style={{ display: "flex", gap: 6 }}>
            {listing.tradeable && (
              <span className="ut-badge dark">
                <Icons.Swap size={11}/> Swap
              </span>
            )}
            {listing.escrow && (
              <span className="ut-badge">
                <Icons.Shield size={11}/> Escrow
              </span>
            )}
          </div>
          <button
            className="ut-card-save"
            aria-pressed={saved}
            onClick={(e) => { e.stopPropagation(); onToggleSave(listing.id); }}
            aria-label="Save"
          >
            {saved ? <Icons.HeartFill size={14}/> : <Icons.Heart size={14}/>}
          </button>
        </div>
        <span className="ut-card-media-emoji" aria-hidden>{listing.slug}</span>
      </div>
      <div className="ut-card-body">
        <h3 className="ut-card-title">{listing.title}</h3>
        <div className="ut-card-meta">
          <span className="ut-card-seller">
            <Avatar name={seller.avatar}/> {seller.name}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11.5 }}>
            <Icons.Star size={11} style={{ color: "var(--ut-yellow)" }}/> {seller.rating}
          </span>
        </div>
        <div className="ut-card-price-row">
          <div>
            <span className="ut-price">{NGN(listing.price)}</span>
            {listing.priceUnit && <span className="ut-price-unit">{listing.priceUnit}</span>}
          </div>
          <span className="ut-card-foot">
            <Icons.Pin size={11}/> {listing.hall.split(" · ")[0]}
          </span>
        </div>
      </div>
    </div>
  );
};

const Modal = ({ title, eye, children, onClose, footer, maxWidth = 520 }) => (
  <div className="ut-modal-backdrop" onClick={onClose}>
    <div className="ut-modal" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
      <div className="ut-modal-head">
        <div>
          {eye && <span className="eye">{eye}</span>}
          <h3>{title}</h3>
        </div>
        <button className="ut-modal-close" onClick={onClose} aria-label="Close">
          <Icons.Close size={16}/>
        </button>
      </div>
      <div className="ut-modal-body">{children}</div>
      {footer && <div className="ut-modal-foot">{footer}</div>}
    </div>
  </div>
);

const Toast = ({ msg }) => msg ? (
  <div className="ut-toast"><span className="dot"></span>{msg}</div>
) : null;

window.NGN = NGN;
window.Avatar = Avatar;
window.Card = Card;
window.Modal = Modal;
window.Toast = Toast;
