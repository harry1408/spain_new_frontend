// ── Design tokens — White #FFFFFF + Navy #0B1239 + Beige #F2F4F6 only ────
export const T = {
  // Backgrounds
  bg:        "#FFFFFF",
  bgCard:    "#FFFFFF",
  bgHover:   "#F2F4F6",
  bgStripe:  "#F2F4F6",
  bgSection: "#F2F4F6",

  // Navy shades (primary palette)
  navy:      "#0B1239",
  navyDark:  "#060C22",
  navyMid:   "#1A2660",
  navyLight: "#2D3F8F",
  navyTint:  "#E8EAF6",
  navyTint2: "#C5CBE9",

  // Borders
  border:       "#E2E0DB",
  borderAccent: "#0B1239",
  borderLight:  "#EDEBE5",

  // Text — navy shades only
  text:        "#0B1239",
  textSub:     "#3D4A6B",   // address, secondary info — light navy
  textMuted:   "#8A96B4",   // placeholders, labels
  textLight:   "#FFFFFF",
  textAddress: "#6B7A9F",   // address fields — lighter navy
  textPrice:   "#0B1239",   // prices — full navy

  // Gold — ONLY for current-listing highlight & active nav
  gold:      "#0B1239",
  goldLight: "#FBF4E0",

  // Semantic — navy family
  green:     "#1A4A2A",
  greenBg:   "#EEF5F1",
  red:       "#6B2A2A",
  redBg:     "#F5F0F0",

  // Nav
  navBg:     "#FFFFFF",
  navBorder: "#E2E0DB",

  // Legacy aliases — all navy
  blue:      "#2D3F8F",
  blueBg:    "#E8EAF6",

  // Shadows
  shadow:    "0 1px 3px rgba(11,18,57,0.07), 0 1px 2px rgba(11,18,57,0.04)",
  shadowMd:  "0 4px 12px rgba(11,18,57,0.09)",
  shadowLg:  "0 10px 30px rgba(11,18,57,0.10)",
};

// ── Chart colors — shades of navy #0B1239 only ───────────────────────────
export const PRICE_COLOR = "#0B1239";
export const M2_COLOR    = "#4A5A8A";  // mid-navy for €/m²

export const COLORS = [
  "#0B1239", "#1A2660", "#2D3F8F",
  "#4A5A8A", "#6B7A9F", "#8A96B4",
  "#9AA3C0", "#3D4A6B", "#C5CBE9", "#E8EAF6",
];

// Unit type colors — distinct navy shades, all readable on white
export const UNIT_COLORS = {
  Studio:    "#0B1239",   // darkest navy
  "1BR":     "#1A2660",
  "2BR":     "#2D3F8F",
  "3BR":     "#4A5A8A",
  "4BR":     "#6B7A9F",
  "5BR":     "#8A96B4",
  Penthouse: "#3D4A6B",   // deep mid-navy
};

// ESG — dark muted shades (no greens/reds, only navy-family darks)
export const ESG_COLORS = {
  A: "#0B3A1A",   // very dark green-navy
  B: "#1A4A2A",
  C: "#2A3A0B",
  D: "#3A2A0B",
  E: "#4A1A1A",
  F: "#3A0B0B",
  G: "#2A0B0B",
};

export const fmt     = v => v == null ? "—" : `€${Number(v).toLocaleString("en-US",{maximumFractionDigits:0})}`;
export const fmtFull = v => v == null ? "—" : `€${Number(v).toLocaleString("en-US",{maximumFractionDigits:0})}`;
export const fmtNum  = v => v == null ? "—" : Number(v).toLocaleString("en-US",{maximumFractionDigits:0});

import React from "react";

// Inject keyframes once (chart animation + skeleton shimmer)
if (typeof document !== "undefined" && !document.getElementById("_chart-anim-style")) {
  const s = document.createElement("style");
  s.id = "_chart-anim-style";
  s.textContent = `
    @keyframes chartFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
  `;
  document.head.appendChild(s);
}

const SHIMMER = {
  background: "linear-gradient(90deg,#F2F4F6 25%,#E8EAF0 50%,#F2F4F6 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
};

export function Skeleton({ w = "100%", h = 14, r = 6, style }) {
  return <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...SHIMMER, ...style }} />;
}

export function SkeletonStatCard() {
  return (
    <div style={{ background:"#fff", border:"1px solid #E2E0DB", borderRadius:14,
      padding:"18px 22px", minWidth:140, boxShadow:"0 1px 3px rgba(11,18,57,0.07)" }}>
      <Skeleton w={70} h={10} r={4} style={{ marginBottom:10 }} />
      <Skeleton w={100} h={24} r={5} style={{ marginBottom:8 }} />
      <Skeleton w={80} h={10} r={4} />
    </div>
  );
}

export function SkeletonChartCard({ h = 220, lines }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #E2E0DB", borderRadius:14,
      padding:"22px 24px", boxShadow:"0 1px 3px rgba(11,18,57,0.07)" }}>
      <Skeleton w={160} h={14} r={5} style={{ marginBottom:18 }} />
      {lines
        ? <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {Array.from({length:lines}).map((_,i) => (
              <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
                <Skeleton w={80} h={12} r={4} />
                <Skeleton w={`${55+((i*37)%35)}%`} h={20} r={4} />
                <Skeleton w={50} h={12} r={4} style={{ marginLeft:"auto" }} />
              </div>
            ))}
          </div>
        : <Skeleton w="100%" h={h} r={8} />
      }
    </div>
  );
}

export function SkeletonCard({ lines = 3, compact = false }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #E2E0DB", borderRadius:14,
      padding: compact ? "14px 16px" : "18px 20px",
      boxShadow:"0 1px 3px rgba(11,18,57,0.07)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
        <Skeleton w={140} h={14} r={5} />
        <Skeleton w={40} h={14} r={5} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {Array.from({length:lines}).map((_,i) => (
          <Skeleton key={i} w={`${100 - i*12}%`} h={11} r={4} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 6 }) {
  return (
    <>
      {Array.from({length:rows}).map((_,i) => (
        <tr key={i} style={{ borderBottom:"1px solid #E2E0DB",
          background: i%2===0 ? "#F2F4F6" : "#fff" }}>
          {Array.from({length:cols}).map((_,j) => (
            <td key={j} style={{ padding:"9px 8px" }}>
              <Skeleton w={j===0?80:`${50+((i+j)*17)%40}%`} h={11} r={4} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function StatCard({ label, value, sub, accent, children, loading }) {
  const displayValue = typeof value === "number"
    ? Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })
    : value;
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E2E0DB",
      borderRadius: 14,
      padding: "18px 22px",
      minWidth: 140,
      boxShadow: "0 1px 3px rgba(11,18,57,0.07)",
    }}>
      <div style={{ color: "#8A96B4", fontSize: 11, textTransform: "uppercase",
        letterSpacing: "0.09em", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {loading
        ? <><Skeleton w={100} h={24} r={5} style={{ marginBottom: 6 }} /><Skeleton w={70} h={10} r={4} /></>
        : <>
            <div style={{ color: accent || "#0B1239", fontWeight: 700, fontSize: 22,
              letterSpacing: "-0.02em", lineHeight: 1.2 }}>{displayValue}</div>
            {sub && <div style={{ color: "#8A96B4", fontSize: 12, marginTop: 4 }}>{sub}</div>}
            {children}
          </>
      }
    </div>
  );
}

export function ChartCard({ title, children, span, animKey, loading, loadingH = 220 }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E2E0DB",
      borderRadius: 14,
      padding: "22px 24px",
      gridColumn: span === 2 ? "span 2" : "auto",
      boxShadow: "0 1px 3px rgba(11,18,57,0.07)",
    }}>
      <div style={{ color: "#0B1239", fontWeight: 700, fontSize: 15,
        marginBottom: 18, letterSpacing: "-0.02em" }}>{title}</div>
      {loading
        ? <Skeleton w="100%" h={loadingH} r={8} />
        : <div key={animKey} style={{ animation: animKey ? "chartFadeIn 0.35s cubic-bezier(0.22,1,0.36,1)" : "none" }}>
            {children}
          </div>
      }
    </div>
  );
}

export function Tag({ label, color }) {
  return (
    <span style={{
      background: color ? `${color}15` : "#E8EAF6",
      color: color || "#0B1239",
      border: `1px solid ${color ? `${color}35` : "#C5CBE9"}`,
      borderRadius: 6,
      padding: "3px 9px",
      fontSize: 11,
      fontWeight: 700,
    }}>{label}</span>
  );
}

export function Pill({ on, label }) {
  if (!on) return null;
  return (
    <span style={{
      background: "#F2F4F6",
      color: "#3D4A6B",
      border: "1px solid #C5CBE9",
      borderRadius: 5,
      padding: "2px 7px",
      fontSize: 10,
      fontWeight: 600,
    }}>{label}</span>
  );
}

/**
 * A 📍 pin icon that reveals a small OSM map popup on hover.
 * Usage: <MapPinPopup lat={l.lat} lng={l.lng} name={l.property_name} />
 * Place inside a `position:relative` container.
 */
import { useState as _useState } from "react";
export function MapPinPopup({ lat, lng, name, popupSide = "right", mapType = "osm" }) {
  const [show, setShow] = _useState(false);
  if (!lat || !lng) return null;
  const d = 0.008;
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-d},${lat-d},${lng+d},${lat+d}&layer=mapnik&marker=${lat},${lng}`;
  const gmEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed`;
  const iframeUrl  = mapType === "google" ? gmEmbedUrl : osmUrl;
  const gmUrl  = `https://www.google.com/maps?q=${lat},${lng}`;
  const popupStyle = popupSide === "right"
    ? { left:"calc(100% + 8px)", top:0 }
    : { bottom:"calc(100% + 8px)", left:0 };
  return (
    <span style={{ position:"relative", display:"inline-flex", alignItems:"center" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ fontSize:13, cursor:"pointer", lineHeight:1, userSelect:"none" }}>📍</span>
      {show && (
        <div style={{ position:"absolute", zIndex:2000, width:280,
          background:"#fff", borderRadius:10, overflow:"hidden",
          boxShadow:"0 8px 32px rgba(0,0,0,0.22)", border:"1px solid #E2E0DB",
          ...popupStyle }}>
          <div style={{ padding:"7px 12px", borderBottom:"1px solid #E2E0DB",
            display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
            <span style={{ fontWeight:700, fontSize:12, color:"#0B1239",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
            <span style={{ fontSize:10, color:"#8A96B4", whiteSpace:"nowrap" }}>×</span>
          </div>
          <iframe src={iframeUrl} width="280" height="180"
            style={{ border:"none", display:"block" }} title="map" loading="lazy"/>
          <div style={{ padding:"6px 12px", borderTop:"1px solid #E2E0DB",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <a href={gmUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:11, color:"#1a73e8", fontWeight:600,
                textDecoration:"none", display:"flex", alignItems:"center", gap:4 }}>
              Open in Google Maps →
            </a>
            <span style={{ fontSize:10, color:"#8A96B4" }}>{Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}</span>
          </div>
        </div>
      )}
    </span>
  );
}

export function AddressBreadcrumb({ cityArea, municipality, style = {} }) {
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
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", ...style }}>
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {i > 0 && <span style={{ color: "#8A96B4", fontSize: 12 }}>›</span>}
          <span style={{ fontSize: 11,
            color: i === crumbs.length - 1 ? "#0B1239" : "#6B7A9F",
            fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>
            {c.icon} {c.label}
          </span>
        </span>
      ))}
    </div>
  );
}
