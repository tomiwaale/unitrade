// Inline SVG icons — single-line strokes, 1.6px weight, currentColor
const Icon = ({ d, size = 18, fill = "none", stroke = "currentColor", sw = 1.6, viewBox = "0 0 24 24", children, ...rest }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  Search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>,
  Bell:   (p) => <Icon {...p} d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 0 0 4 0"/>,
  Heart:  (p) => <Icon {...p} d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>,
  HeartFill: (p) => <Icon {...p} fill="currentColor" stroke="none" d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>,
  Bookmark: (p) => <Icon {...p} d="M6 4h12v17l-6-4-6 4z"/>,
  ChevronLeft: (p) => <Icon {...p} d="m15 6-6 6 6 6"/>,
  ChevronRight: (p) => <Icon {...p} d="m9 6 6 6-6 6"/>,
  ChevronDown: (p) => <Icon {...p} d="m6 9 6 6 6-6"/>,
  Plus: (p) => <Icon {...p} d="M12 5v14M5 12h14"/>,
  Close: (p) => <Icon {...p} d="M6 6l12 12M18 6 6 18"/>,
  Send: (p) => <Icon {...p} d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>,
  Camera: (p) => <Icon {...p}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/></Icon>,
  Tag: (p) => <Icon {...p}><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="8" cy="8" r="1.5"/></Icon>,
  Shield: (p) => <Icon {...p} d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6l-8-3zM9 12l2 2 4-4"/>,
  Swap: (p) => <Icon {...p} d="M7 8h13M7 8 10 5M7 8l3 3M17 16H4M17 16l-3 3M17 16l-3-3"/>,
  Sparkle: (p) => <Icon {...p} d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8"/>,
  Pin: (p) => <Icon {...p}><path d="M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></Icon>,
  Star: (p) => <Icon {...p} fill="currentColor" stroke="none" d="M12 2 14.5 9H22l-6 4.5L18 21l-6-4.5L6 21l2-7.5L2 9h7.5z"/>,
  Check: (p) => <Icon {...p} d="m5 12 5 5L20 7"/>,
  Filter: (p) => <Icon {...p} d="M3 5h18M6 12h12M10 19h4"/>,
  Grid: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></Icon>,
  List: (p) => <Icon {...p} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>,
  Wallet: (p) => <Icon {...p}><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M17 15h.01"/></Icon>,
  Book: (p) => <Icon {...p} d="M4 5a2 2 0 0 1 2-2h13v17H6a2 2 0 0 0-2 2V5zM7 3v17"/>,
  Chip: (p) => <Icon {...p}><rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></Icon>,
  Shirt: (p) => <Icon {...p} d="M7 4 4 6l2 4h2v10h8V10h2l2-4-3-2-3 2a3 3 0 0 1-4 0L7 4z"/>,
  Bed: (p) => <Icon {...p} d="M3 18V8M3 14h18v4M21 18v2M3 18v2M7 11h4a2 2 0 0 1 2 2v1H7v-3z"/>,
  Sparkle2: (p) => <Icon {...p} d="M5 12c4 0 7-3 7-7 0 4 3 7 7 7-4 0-7 3-7 7 0-4-3-7-7-7z"/>,
  Eye: (p) => <Icon {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Icon>,
  Lock: (p) => <Icon {...p}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></Icon>,
  Sun: (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5 7 7M17 17l1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5"/></Icon>,
  Upload: (p) => <Icon {...p} d="M12 16V4M12 4l-4 4M12 4l4 4M4 18v2h16v-2"/>,
};

const CatIcon = ({ id, ...p }) => {
  const map = { books: Icons.Book, electronics: Icons.Chip, fashion: Icons.Shirt, furniture: Icons.Bed, services: Icons.Sparkle2 };
  const C = map[id] || Icons.Tag;
  return <C {...p} />;
};

window.Icons = Icons;
window.CatIcon = CatIcon;
