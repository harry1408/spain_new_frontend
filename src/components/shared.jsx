// ── Design tokens (light theme) ──────────────────────────────────────────
export const T = {
  bg:        "#F7F6F2",      // warm off-white page background
  bgCard:    "#FFFFFF",      // card surface
  bgHover:   "#F0EDE6",      // card hover
  bgStripe:  "#FAFAF7",      // table stripe
  border:    "#E4E0D8",      // default border
  borderAccent:"#C9A84C",    // gold border
  text:      "#1A1A2E",      // primary text
  textSub:   "#6B7280",      // secondary
  textMuted: "#9CA3AF",      // muted
  gold:      "#C9A84C",      // primary accent
  goldLight: "#F5EFD6",      // gold tint bg
  green:     "#16A34A",
  greenBg:   "#F0FDF4",
  red:       "#DC2626",
  redBg:     "#FEF2F2",
  blue:      "#2563EB",
  blueBg:    "#EFF6FF",
  navBg:     "#FFFFFF",
  navBorder: "#E4E0D8",
  shadow:    "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:  "0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)",
  shadowLg:  "0 10px 25px rgba(0,0,0,0.08)",
};

// ── Consistent chart metric colors (used across all price/m² toggles) ────
export const PRICE_COLOR = "#C9A84C";   // gold — always means "total price"
export const M2_COLOR    = "#3B82F6";   // blue — always means "€/m²"

export const COLORS = ["#C9A84C","#2563EB","#16A34A","#9333EA","#DC2626","#0891B2","#D97706","#059669","#DB2777","#0284C7"];
export const UNIT_COLORS = {
  Studio:    "#9333EA",
  "1BR":     "#16A34A",
  "2BR":     "#2563EB",
  "3BR":     "#C9A84C",
  "4BR":     "#DC2626",
  "5BR":     "#D97706",
  Penthouse: "#0891B2",
};
export const ESG_COLORS = { A:"#16A34A", B:"#65A30D", C:"#CA8A04", D:"#EA580C", E:"#DC2626" };

export const fmt     = v => v == null ? "—" : `€${Number(v).toLocaleString("en",{maximumFractionDigits:0})}`;
export const fmtFull = v => v == null ? "—" : `€${Number(v).toLocaleString("en",{maximumFractionDigits:0})}`;

export function StatCard({ label, value, sub, accent, children }) {
  return (
    <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12,
      padding:"14px 20px", minWidth:130, boxShadow:T.shadow }}>
      <div style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4, fontWeight:600 }}>{label}</div>
      <div style={{ color: accent||T.gold, fontWeight:700, fontSize:20 }}>{value}</div>
      {sub && <div style={{ color:T.textSub, fontSize:11, marginTop:3 }}>{sub}</div>}
      {children}
    </div>
  );
}

export function ChartCard({ title, children, span }) {
  return (
    <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:14,
      padding:"20px 22px", gridColumn:span===2?"span 2":"auto", boxShadow:T.shadow }}>
      <div style={{ color:T.text, fontWeight:700, fontSize:14, marginBottom:16, letterSpacing:"-0.01em" }}>{title}</div>
      {children}
    </div>
  );
}

export function Tag({ label, color }) {
  return (
    <span style={{ background:`${color}18`, color, border:`1px solid ${color}44`,
      borderRadius:6, padding:"3px 9px", fontSize:11, fontWeight:700 }}>{label}</span>
  );
}

export function Pill({ on, label }) {
  if (!on) return null;
  return (
    <span style={{ background:T.greenBg, color:T.green, border:`1px solid #BBF7D0`,
      borderRadius:5, padding:"2px 7px", fontSize:10, fontWeight:600 }}>{label}</span>
  );
}

// Location breadcrumb hierarchy
export function AddressBreadcrumb({ cityArea, municipality, style={} }) {
  if (!cityArea && !municipality) return null;

  let street = null, muni = municipality, comarca = null, province = "Valencia";

  if (cityArea) {
    const parts = cityArea.split(",").map(p => p.trim());
    if (parts.length >= 3) {
      province = parts[parts.length - 1];
      comarca  = parts[parts.length - 2];
      const rest = parts.slice(0, -2);
      if (rest.length && /^(Calle|Carrer|Avinguda|Avda|Avenida|Plaza|Plaça|Urb)/i.test(rest[0])) {
        street = rest[0].replace(/ NN$/, "");
        muni   = rest[1] || municipality;
      } else {
        muni = rest[0] || municipality;
      }
    }
  }

  const crumbs = [
    { label: province, icon: "🇪🇸" },
    comarca && { label: comarca, icon: "🗺" },
    muni && muni !== comarca && { label: muni, icon: "🏘" },
    street && { label: street, icon: "📍" },
  ].filter(Boolean);

  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap", ...style }}>
      {crumbs.map((c, i) => (
        <span key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
          {i > 0 && <span style={{ color:T.textMuted, fontSize:12 }}>›</span>}
          <span style={{ fontSize:11, color: i === crumbs.length-1 ? T.text : T.textSub, fontWeight: i===crumbs.length-1?600:400 }}>
            {c.icon} {c.label}
          </span>
        </span>
      ))}
    </div>
  );
}
