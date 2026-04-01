import React, { useState, useEffect, useRef, useMemo } from "react";
import { T, fmt, fmtFull, UNIT_COLORS, ESG_COLORS, Tag, COLORS, ChartCard, MapPinPopup } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";
import LoadingHouse from "../components/LoadingHouse.jsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from "recharts";

const PRICE_COLOR = "#0B1239";
const M2_COLOR    = "#4A5A8A";

// ── Multiselect dropdown ───────────────────────────────────────────────────
function MultiSelect({ label, options, value, onChange, placeholder = "All", maxDisplay = 2, disabled = false, available = null }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(() =>
    options.filter(o => o.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );

  const toggle = opt => onChange(value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt]);

  const displayLabel = value.length === 0
    ? placeholder
    : value.length <= maxDisplay
      ? value.join(", ")
      : `${value.slice(0, maxDisplay).join(", ")} +${value.length - maxDisplay}`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase",
        marginBottom: 4, letterSpacing: "0.05em" }}>{label}</div>
      <div onClick={() => !disabled && setOpen(o => !o)} style={{
        background: disabled ? "#FFFFFF" : "#fff",
        border: `1px solid ${value.length && !disabled ? T.borderAccent : T.border}`,
        borderRadius: 10, padding: "10px 12px", cursor: disabled ? "not-allowed" : "pointer", minWidth: 130,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)", fontSize: 13,
        color: disabled ? T.textMuted : value.length ? T.text : T.textMuted,
        fontWeight: value.length && !disabled ? 600 : 400,
        transition: "border-color 0.15s", opacity: disabled ? 0.6 : 1,
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "85%" }}>
          {displayLabel}
        </span>
        <span style={{ color: T.textMuted, fontSize: 10, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 999,
          background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: "100%", width: 280,
          maxHeight: 320, display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${T.border}` }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 7,
                padding: "6px 10px", fontSize: 12, outline: "none",
                background: "#F2F4F6", color: T.text }} />
          </div>
          {value.length > 0 && (
            <div style={{ padding: "6px 10px", borderBottom: `1px solid ${T.border}`,
              display: "flex", gap: 6, flexWrap: "wrap" }}>
              {value.map(v => (
                <span key={v} onClick={e => { e.stopPropagation(); toggle(v); }}
                  style={{ background: T.navyLight, color: "#fff", borderRadius: 5,
                    padding: "2px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {v} ✕
                </span>
              ))}
            </div>
          )}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0
              ? <div style={{ padding: "12px 14px", color: T.textMuted, fontSize: 12 }}>No results</div>
              : filtered.map(opt => {
                const isSelected = value.includes(opt);
                const isUnavailable = available !== null && !available.has(opt) && !isSelected;
                return (
                  <div key={opt} onClick={() => !isUnavailable && toggle(opt)}
                    style={{ padding: "8px 14px", cursor: isUnavailable ? "default" : "pointer", fontSize: 12,
                      display: "flex", alignItems: "center", gap: 8,
                      background: isSelected ? T.navyLight : "transparent",
                      color: isSelected ? "#fff" : isUnavailable ? "#C5CBE9" : T.text,
                      fontWeight: isSelected ? 600 : 400,
                      transition: "background 0.1s",
                      opacity: isUnavailable ? 0.5 : 1 }}
                    onMouseEnter={e => { if (!isSelected && !isUnavailable) e.currentTarget.style.background = "#FFFFFF"; }}
                    onMouseLeave={e => { if (!isSelected && !isUnavailable) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${isSelected ? T.navy : isUnavailable ? "#D8DCE8" : T.border}`,
                      background: isSelected ? T.navy : "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: "#fff" }}>
                      {isSelected ? "✓" : ""}
                    </span>
                    {opt}
                  </div>
                );
              })
            }
          </div>
          {value.length > 0 && (
            <div style={{ padding: "8px 14px", borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => onChange([])}
                style={{ background: "none", border: "none", color: T.textMuted,
                  fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Result card ────────────────────────────────────────────────────────────
function ResultCard({ l, onSelect, active, onHover, selected, onToggleSelect, mapType }) {
  const [hov, setHov] = useState(false);
  const isHighlighted = active || hov;
  const unitTypes  = (l.unit_types  || "").split(", ").filter(Boolean);
  const houseTypes = (l.house_types || "").split(", ").filter(Boolean);
  return (
    <div id={`scard-${l.listing_id}`}
      onMouseEnter={() => { setHov(true); onHover && onHover(l.listing_id); }}
      onMouseLeave={() => { setHov(false); onHover && onHover(null); }}
      onClick={() => onSelect(l)}
      style={{ background: active ? "rgba(201,168,76,0.08)" : "#fff",
        border: `1px solid ${active ? T.borderAccent : hov ? T.borderAccent : T.border}`,
        borderRadius: 12, padding: "14px 16px", cursor: "pointer",
        boxShadow: isHighlighted ? "0 4px 16px rgba(201,168,76,0.12)" : "0 1px 4px rgba(0,0,0,0.06)",
        transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 8 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8, minWidth:0, flex:1 }}>
          <span onClick={e => { e.stopPropagation(); onToggleSelect && onToggleSelect(l.listing_id); }}
            style={{ flexShrink:0, marginTop:2, width:15, height:15, borderRadius:4, cursor:"pointer",
              border:`2px solid ${selected ? T.navy : T.border}`,
              background: selected ? T.navy : "#fff",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:9, color:"#fff", transition:"all 0.15s" }}>
            {selected ? "✓" : ""}
          </span>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.property_name}
            </div>
            <div style={{ fontSize: 11, color: T.textSub, display:"flex", alignItems:"center", gap:5 }}>
              {l.municipality} · {l.province}
              <MapPinPopup lat={l.lat} lng={l.lng} name={l.property_name} mapType={mapType} />
            </div>
            {l.city_area && (
              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                📍 {l.city_area}
              </div>
            )}
          </div>
        </div>
        {l.esg_grade && l.esg_grade !== "Unknown" && (
          <span style={{ background: ESG_COLORS[l.esg_grade] || "#8A96B4",
            color: "#fff", borderRadius: 5, padding: "2px 8px", fontSize: 10,
            fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, alignSelf: "flex-start" }}>
            ESG {l.esg_grade}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Units</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{l.units}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Avg Price</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: PRICE_COLOR }}>{fmt(l.avg_price)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>€/m²</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: M2_COLOR }}>€{Math.round(l.avg_price_m2).toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Range</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.textSub }}>
            {fmt(l.min_price)} – {fmt(l.max_price)}
          </div>
        </div>
      </div>

      {/* Unit type + house type tags */}
      {(unitTypes.length > 0 || houseTypes.length > 0) && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {unitTypes.map(ut => (
            <span key={ut} style={{ background: UNIT_COLORS[ut] || "#8A96B4",
              color: "#fff", borderRadius: 4, padding: "2px 7px",
              fontSize: 10, fontWeight: 700 }}>{ut}</span>
          ))}
          {houseTypes.map(ht => (
            <span key={ht} style={{ background:"rgba(100,100,140,0.10)", color:T.textSub,
              border:`1px solid ${T.border}`, borderRadius:4, padding:"2px 7px",
              fontSize:10, fontWeight:700 }}>{ht}</span>
          ))}
        </div>
      )}

      {(l.stated_total_units || l.nearest_beach_km) && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:-2 }}>
          {l.stated_total_units && (
            <span style={{ fontSize: 10, color: T.textMuted }}>
              📋 <span style={{ fontWeight: 600 }}>{l.stated_total_units}</span> apts per description
            </span>
          )}
          {l.nearest_beach_km && (
            <span style={{ fontSize: 10, color: "#0077B6", fontWeight: 600 }}>
              🏖 {l.nearest_beach_km} km
              {l.nearest_beach_name ? <span style={{ fontWeight:400, color:T.textMuted }}> · {l.nearest_beach_name}</span> : null}
            </span>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: T.navy, fontWeight: 600, marginTop: -4 }}>
        View development →
      </div>
    </div>
  );
}

// ── Delisted card (red boundary, same layout as DelistedPage) ────────────────
function DelistedSearchCard({ l, onSelect }) {
  const [hov, setHov] = useState(false);
  const esgColor = ESG_COLORS[l.esg_grade] || "#999";
  const unitTypes  = (l.unit_types  || "").split(", ").filter(Boolean);
  const houseTypes = (l.house_types || "").split(", ").filter(Boolean);
  return (
    <div onClick={() => onSelect(l)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? "#FEF2F2" : T.bgCard,
        border: `2px solid ${hov ? "#6B2A2A" : "#FCA5A5"}`,
        borderRadius: 12, padding: "14px 16px", cursor: "pointer",
        transition: "all 0.15s", boxShadow: hov ? T.shadowMd : T.shadow,
        display: "flex", flexDirection: "column", gap: 8 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: hov ? "#6B2A2A" : T.text, marginBottom: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {l.property_name}
          </div>
          <div style={{ fontSize: 11, color: T.textSub }}>{l.municipality} · {l.province}</div>
          {l.city_area && (
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              📍 {l.city_area}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{ background: "#FEF2F2", color: "#6B2A2A", border: "1px solid #FCA5A5",
            borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>Delisted</span>
          {l.esg_grade && l.esg_grade !== "nan" && l.esg_grade !== "Unknown" && (
            <span style={{ background: ESG_COLORS[l.esg_grade] || "#8A96B4", color: "#fff",
              borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
              ESG {l.esg_grade}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Units</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{l.units}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Last Avg</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: PRICE_COLOR }}>{fmt(l.avg_price)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>€/m²</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: M2_COLOR }}>€{Math.round(l.avg_price_m2 || 0).toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Range</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.textSub }}>{fmt(l.min_price)} – {fmt(l.max_price)}</div>
        </div>
      </div>

      {/* Tags */}
      {(unitTypes.length > 0 || houseTypes.length > 0) && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {unitTypes.map(ut => (
            <span key={ut} style={{ background: UNIT_COLORS[ut] || "#8A96B4", color: "#fff",
              borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{ut}</span>
          ))}
          {houseTypes.map(ht => (
            <span key={ht} style={{ background: "rgba(100,100,140,0.10)", color: T.textSub,
              border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 7px",
              fontSize: 10, fontWeight: 700 }}>{ht}</span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: hov ? "#6B2A2A" : T.textMuted, fontWeight: 600, marginTop: -4 }}>
        View apartments →
      </div>
    </div>
  );
}

// ── Google Maps URL parser ───────────────────────────────────────────────────
function parseGoogleMapsUrl(url) {
  // !3d{lat}!4d{lng} — place detail URLs (may appear multiple times; LAST = the pinned place)
  // e.g. /place/Platja+de+la+Devesa/@viewport/data=...!3d{place_lat}!4d{place_lng}
  const place3d = [...url.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
  if (place3d.length > 0) {
    const last = place3d[place3d.length - 1];
    return { lat: parseFloat(last[1]), lng: parseFloat(last[2]) };
  }
  // @lat,lng,zoom — viewport center; only use if no !3d/!4d found (non-place links)
  let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  // ?q=lat,lng
  m = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  // ll=lat,lng
  m = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
}

function extractPlaceName(url) {
  const m = url.match(/\/place\/([^/@]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1].replace(/\+/g, " ")); } catch { return null; }
}

// ── Persist search state across tab switches ───────────────────────────────
let _ss = null; // module-level saved state

// ── Main SearchPage ────────────────────────────────────────────────────────
export default function SearchPage({ onSelectListing }) {
  const [opts, setOpts]         = useState({ municipalities: [], locations: [] });
  const [streetCoords, setStreetCoords] = useState(_ss?.streetCoords ?? {});
  const [selMuni,  setSelMuni]  = useState(_ss?.selMuni  ?? []);
  const [selStreet, setSelStreet] = useState(_ss?.selStreet ?? []);
  const [radiusKm, setRadiusKm] = useState(_ss?.radiusKm ?? null);
  const [mapMode, setMapMode]   = useState(_ss?.mapMode ?? "leaflet");

  // Secondary filters
  const [selUnit, setSelUnit]       = useState(_ss?.selUnit      ?? []);
  const [selEsg,  setSelEsg]        = useState(_ss?.selEsg       ?? []);
  const [selHouseType, setSelHouseType] = useState(_ss?.selHouseType ?? []);
  const [minPrice, setMinPrice] = useState(_ss?.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(_ss?.maxPrice ?? "");
  const [minM2,   setMinM2]    = useState(_ss?.minM2    ?? "");
  const [maxM2,   setMaxM2]    = useState(_ss?.maxM2    ?? "");

  const [results,         setResults]         = useState(_ss?.results  ?? null);
  const [delistedResults, setDelistedResults] = useState([]);
  const [gmapsLink,       setGmapsLink]       = useState("");
  const [gmapsError,      setGmapsError]      = useState("");
  const [gmapsLoading,    setGmapsLoading]    = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(_ss?.searched ?? false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activePin, setActivePin] = useState(null);
  const lastHoveredPin = useRef(null); // persists last hovered id for Google Maps
  const [trend, setTrend] = useState([]);
  const [serverUtStats, setServerUtStats] = useState(_ss?.serverUtStats ?? []);
  const [serverHtStats, setServerHtStats] = useState(_ss?.serverHtStats ?? []);


  // Fixed center for radius searches — set once from first search results
  const searchCenterRef = React.useRef(_ss?.searchCenter ?? null);
  const selMuniRef = React.useRef(selMuni);
  selMuniRef.current = selMuni;
  const [searchCenter, setSearchCenter] = React.useState(_ss?.searchCenter ?? null);

  // Save state to module-level variable whenever key values change
  useEffect(() => {
    _ss = { selMuni, selStreet, radiusKm, mapMode, selUnit, selEsg, selHouseType,
            minPrice, maxPrice, minM2, maxM2, results, searched, searchCenter, streetCoords,
            serverUtStats, serverHtStats };
  });  // runs every render — cheap object assign
  const isAutoRadiusRef = React.useRef(false); // flag to skip re-fetch on auto-set
  // Track the last selMuni/selStreet identity that triggered the auto-search effect.
  // On mount (including StrictMode double-invoke), the ref is initialized to the
  // same array reference as the state, so the effect skips. It only fires when
  // the user actually changes the selection (new array reference).
  const _prevSelRef = React.useRef({ muni: selMuni, street: selStreet });

  const _buildQs = React.useCallback((withRadius) => {
    const qs = new URLSearchParams();
    // Only apply municipality filter when NOT doing a radius search
    // (radius search should find all developments within the circle regardless of region)
    if (!withRadius || withRadius <= 0) {
      selMuni.forEach(m => qs.append("municipality", m));
      selStreet.forEach(s => qs.append("street", s));
    }
    selUnit.forEach(u => qs.append("unit_type", u));
    selEsg.forEach(e => qs.append("esg", e));
    selHouseType.forEach(h => qs.append("house_type", h));
    if (minPrice) qs.set("min_price", minPrice);
    if (maxPrice) qs.set("max_price", maxPrice);
    if (minM2)    qs.set("min_m2", minM2);
    if (maxM2)    qs.set("max_m2", maxM2);
    if (withRadius && withRadius > 0 && searchCenterRef.current) {
      qs.set("radius_km", withRadius);
      qs.set("lat", searchCenterRef.current.lat);
      qs.set("lng", searchCenterRef.current.lng);
    }
    return qs;
  }, [selMuni, selStreet, selUnit, selEsg, selHouseType, minPrice, maxPrice, minM2, maxM2]);

  // Single useEffect mirrors ApartmentPage pattern
  useEffect(() => {
    if (!searched) return;
    // Skip re-fetch when radius was auto-set — center/circle already correct
    if (isAutoRadiusRef.current) {
      isAutoRadiusRef.current = false;
      return;
    }
    setLoading(true);
    const currentRadius = radiusKm;
    const currentMuni = selMuni.slice(); // capture current value to avoid stale closure
    const qs = _buildQs(currentRadius);

    // Fetch delisted for same municipalities in parallel
    const delistedQs = new URLSearchParams();
    currentMuni.forEach(m => delistedQs.append("municipality", m));
    if (currentMuni.length > 0) {
      fetch(`${API}/delisted/listings?${delistedQs}`)
        .then(r => r.json())
        .then(d => setDelistedResults(d.listings || []))
        .catch(() => {});
    } else {
      setDelistedResults([]);
    }

    fetch(`${API}/search/listings?${qs}`)
      .then(r => r.json())
      .then(d => {
        const listings = d.listings || [];
        setResults(listings);
        setServerUtStats(d.unit_type_stats || []);
        setServerHtStats(d.house_type_stats || []);
        setLoading(false);
        // Fetch trend using ref so we always have current selMuni
        const munis = selMuniRef.current;
        if (munis.length > 0) {
          const tqs = new URLSearchParams();
          munis.forEach(m => tqs.append("municipality", m));
          fetch(`${API}/temporal/market-trend?${tqs}`)
            .then(r => r.json())
            .then(d => setTrend(Array.isArray(d) ? d : []))
            .catch(() => {});
        }
        // On first fetch (no radius yet), store center and auto-set 2km radius
        if (!currentRadius && !searchCenterRef.current) {
          const withCoords = listings.filter(l => l.lat && l.lng);
          const areaCenter = d.area_center;
          if (areaCenter && !withCoords.length) {
            searchCenterRef.current = areaCenter;
            setSearchCenter(areaCenter);
            setRadiusKm(2);
          } else if (withCoords.length) {
            const lat = areaCenter ? areaCenter.lat : withCoords.reduce((a,b) => a+b.lat, 0) / withCoords.length;
            const lng = areaCenter ? areaCenter.lng : withCoords.reduce((a,b) => a+b.lng, 0) / withCoords.length;
            searchCenterRef.current = { lat, lng };
            setSearchCenter({ lat, lng });
            setRadiusKm(2);
          }
        }
        // When radius active, add newly found municipalities to Area/Street filter options
        if (currentRadius > 0 && listings.length) {
          const foundMusis = [...new Set(listings.map(l => l.municipality).filter(Boolean))];
          setOpts(prev => ({
            ...prev,
            locations: [...new Set([...prev.locations, ...foundMusis])].sort()
          }));
        }
      })
      .catch(() => setLoading(false));
  }, [searched, radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps



  const mapMarkers = useMemo(() => {
    if (!results) return [];
    return results
      .filter(l => l.lat && l.lng)
      .map(l => ({
        id:       l.listing_id,
        lat:      l.lat,
        lng:      l.lng,
        label:    l.property_name,
        sublabel: `${fmt(l.avg_price)} · ${l.units} apts`,
        active:   l.listing_id === activePin,
        color:    l.listing_id === activePin ? T.navyMid : "#8A96B4",
      }));
  }, [results, activePin]);

  const displayResults = results || [];

  const filteredDelisted = useMemo(() => delistedResults.filter(l => {
    if (selUnit.length      && !selUnit.some(ut => l.unit_types?.includes(ut)))      return false;
    if (selHouseType.length && !selHouseType.some(ht => l.house_types?.includes(ht))) return false;
    if (selEsg.length       && !selEsg.includes(l.esg_grade))                        return false;
    if (minPrice && l.avg_price < Number(minPrice) * 1000) return false;
    if (maxPrice && l.avg_price > Number(maxPrice) * 1000) return false;
    if (minM2 && l.avg_price_m2 && l.avg_price_m2 < Number(minM2)) return false;
    if (maxM2 && l.avg_price_m2 && l.avg_price_m2 > Number(maxM2)) return false;
    return true;
  }), [delistedResults, selUnit, selHouseType, selEsg, minPrice, maxPrice, minM2, maxM2]);

  // ── Charts computed from displayResults ─────────────────────────────────
  // Use server-computed unit_type_stats (unit-level accuracy) when available
  const utStats = serverUtStats.length > 0 ? serverUtStats : [];

  const priceDist = useMemo(() => {
    const bins = [
      { bin:"<150k",    min:0,      max:150000 },
      { bin:"150-200k", min:150000, max:200000 },
      { bin:"200-250k", min:200000, max:250000 },
      { bin:"250-300k", min:250000, max:300000 },
      { bin:"300-400k", min:300000, max:400000 },
      { bin:"400-500k", min:400000, max:500000 },
      { bin:"500-700k", min:500000, max:700000 },
      { bin:">700k",    min:700000, max:Infinity },
    ];
    return bins.map(b => ({
      bin: b.bin,
      count: displayResults.filter(l => l.avg_price >= b.min && l.avg_price < b.max).length,
    })).filter(b => b.count > 0);
  }, [displayResults]);

  const m2Dist = useMemo(() => {
    const bins = [
      { bin:"<1k",    min:0,    max:1000 },
      { bin:"1-1.5k", min:1000, max:1500 },
      { bin:"1.5-2k", min:1500, max:2000 },
      { bin:"2-2.5k", min:2000, max:2500 },
      { bin:"2.5-3k", min:2500, max:3000 },
      { bin:"3-3.5k", min:3000, max:3500 },
      { bin:"3.5-4k", min:3500, max:4000 },
      { bin:"4-5k",   min:4000, max:5000 },
      { bin:"5-6k",   min:5000, max:6000 },
      { bin:">6k",    min:6000, max:Infinity },
    ];
    return bins.map(b => ({
      bin: b.bin,
      count: displayResults.filter(l => l.avg_price_m2 >= b.min && l.avg_price_m2 < b.max).length,
    })).filter(b => b.count > 0);
  }, [displayResults]);

  const hasSelection = selMuni.length > 0;
  const canSearch = selMuni.length > 0;
  const [showTip, setShowTip] = useState(false);
  const ALL_UTS = ["Studio","1BR","2BR","3BR","4BR","5BR","Penthouse"];
  const ALL_ESG = ["A","B","C","D","E","F","G"];

  // Available options derived from unfiltered results
  const availableUTs = useMemo(() => {
    if (!results) return null;
    const s = new Set();
    results.forEach(l => (l.unit_types || "").split(", ").filter(Boolean).forEach(t => s.add(t)));
    return s;
  }, [results]);

  const availableEsgs = useMemo(() => {
    if (!results) return null;
    const s = new Set();
    results.forEach(l => { if (l.esg_grade && l.esg_grade !== "Unknown" && l.esg_grade !== "nan") s.add(l.esg_grade); });
    return s;
  }, [results]);

  const availableHouseTypes = useMemo(() => {
    if (!results) return null;
    const s = new Set();
    results.forEach(l => (l.house_types || "").split(", ").filter(Boolean).forEach(t => s.add(t)));
    return s;
  }, [results]);

  // Load all municipalities on mount
  useEffect(() => {
    fetch(`${API}/search/options`)
      .then(r => r.json())
      .then(d => {
        setOpts({ municipalities: d.municipalities || [], locations: d.locations || [] });
        setStreetCoords(d.street_coords || {});
      })
      .catch(() => {});
  }, []);

  // Reload streets whenever municipality selection changes
  useEffect(() => {
    if (selMuni.length === 0) {
      // Reset to all streets when no municipality selected
      fetch(`${API}/search/options`)
        .then(r => r.json())
        .then(d => {
          setOpts(prev => ({ ...prev, locations: d.locations || [] }));
          setStreetCoords(d.street_coords || {});
        })
        .catch(() => {});
      return;
    }
    const qs = new URLSearchParams();
    selMuni.forEach(m => qs.append("municipality", m));
    fetch(`${API}/search/options?${qs}`)
      .then(r => r.json())
      .then(d => {
        setOpts(prev => ({ ...prev, locations: d.locations || [] }));
        setStreetCoords(d.street_coords || {});
        // Only clear selections that don't exist in the new municipality
        setSelStreet(prev => prev.filter(s => (d.locations || []).includes(s)));
      })
      .catch(() => {});
  }, [selMuni]); // eslint-disable-line react-hooks/exhaustive-deps

  // Immediately center map on geocoded street when selected
  useEffect(() => {
    if (!selStreet.length) return;
    for (const s of selStreet) {
      const c = streetCoords[s];
      if (c) {
        searchCenterRef.current = { lat: c.lat, lng: c.lng };
        setSearchCenter({ lat: c.lat, lng: c.lng });
        break;
      }
    }
  }, [selStreet, streetCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = () => {
    searchCenterRef.current = null;
    isAutoRadiusRef.current = false;
    setSearchCenter(null);
    setRadiusKm(null);
    setActivePin(null);
    setResults(null);
    setSearched(false);
    setTimeout(() => setSearched(true), 0);
  };

  // Auto-search when municipality/street selection changes
  useEffect(() => {
    // Skip if the selection hasn't actually changed (e.g. mount/StrictMode double-invoke
    // with restored state — both selMuni and selStreet are the same array references).
    if (selMuni === _prevSelRef.current.muni && selStreet === _prevSelRef.current.street) return;
    _prevSelRef.current = { muni: selMuni, street: selStreet };
    if (!selMuni.length) return;
    const timer = setTimeout(() => {
      // Preserve geocoded street center if one is selected; otherwise reset
      const geoCenter = selStreet.length
        ? selStreet.map(s => streetCoords[s]).find(Boolean) ?? null
        : null;
      if (geoCenter) {
        searchCenterRef.current = { lat: geoCenter.lat, lng: geoCenter.lng };
        setSearchCenter({ lat: geoCenter.lat, lng: geoCenter.lng });
      } else {
        searchCenterRef.current = null;
        setSearchCenter(null);
      }
      isAutoRadiusRef.current = false;
      setRadiusKm(geoCenter ? 2 : null);
      setActivePin(null);
      setResults(null);
      setSearched(false);
      setTimeout(() => setSearched(true), 0);
    }, 400);
    return () => clearTimeout(timer);
  }, [selMuni, selStreet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-apply secondary filters without resetting center/radius
  useEffect(() => {
    if (!selMuni.length) return;
    const timer = setTimeout(() => {
      setResults(null);
      setSearched(false);
      setTimeout(() => setSearched(true), 0);
    }, 400);
    return () => clearTimeout(timer);
  }, [selUnit, selEsg, selHouseType, minPrice, maxPrice, minM2, maxM2]); // eslint-disable-line react-hooks/exhaustive-deps

  const [gmapsPlace, setGmapsPlace] = useState("");

  const applyGmapsLink = async () => {
    const url = gmapsLink.trim();
    if (!url) return;
    setGmapsError(""); setGmapsLoading(true); setGmapsPlace("");

    let workingUrl = url;

    // Shortened URL — resolve via backend then re-parse
    if (url.includes("goo.gl") || url.includes("maps.app")) {
      try {
        const res = await fetch(`${API}/resolve-url?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.resolved) workingUrl = data.resolved;
      } catch (_) {}
    }

    const coords = parseGoogleMapsUrl(workingUrl);
    const placeName = extractPlaceName(workingUrl);

    setGmapsLoading(false);
    if (!coords) {
      setGmapsError("Could not extract coordinates. Try using Share → Copy link on a pinned place.");
      return;
    }

    setGmapsPlace(placeName || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    searchCenterRef.current = coords;
    setSearchCenter(coords);
    setSelMuni([]); setSelStreet([]);
    setRadiusKm(2);
    setResults(null); setSearched(false);
    setActivePin(null);
    isAutoRadiusRef.current = false;
    setTimeout(() => setSearched(true), 0);
  };

  const clearAll = () => {
    setSelMuni([]); setSelStreet([]); setRadiusKm(null);
    setSelUnit([]); setSelEsg([]); setSelHouseType([]);
    setMinPrice(""); setMaxPrice(""); setMinM2(""); setMaxM2("");
    setResults(null); setSearched(false);
    setActivePin(null); setTrend([]); setSearchCenter(null);
    setSelectedIds(new Set());
    setServerUtStats([]);
    searchCenterRef.current = null;
    isAutoRadiusRef.current = false;
  };

  return (
    <div style={{ padding: "20px 20px", maxWidth: 1700, margin: "0 auto", background:"#F2F4F6", minHeight:"100vh" }}>

      {/* ── Primary search row ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <MultiSelect
            label="Municipality"
            options={opts.municipalities}
            value={selMuni}
            onChange={v => setSelMuni(v.length > 1 ? [v[v.length-1]] : v)}
            placeholder="Select a municipality…"
            maxDisplay={1}
          />
          <MultiSelect
            label="Area / Street / Locality"
            options={opts.locations}
            value={selStreet}
            onChange={selMuni.length > 0 ? (v => setSelStreet(v.length > 1 ? [v[v.length-1]] : v)) : () => {}}
            placeholder="Select area or street…"
            maxDisplay={1}
          />
          {/* Km Radius dropdown */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted,
              textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.05em" }}>Km Radius</div>
            <select
              value={radiusKm ?? ""}
              onChange={e => setRadiusKm(e.target.value === "" ? null : Number(e.target.value))}
              style={{ height: 42, padding: "0 12px", borderRadius: 10,
                border: `1px solid ${radiusKm && selMuni.length ? T.borderAccent : T.border}`,
                background: "#fff", fontSize: 13, fontWeight: 700,
                color: radiusKm && selMuni.length ? T.navy : T.textMuted,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)", minWidth: 120,
                opacity: selMuni.length === 0 ? 0.5 : 1,
                cursor: selMuni.length === 0 ? "not-allowed" : "pointer",
                outline: "none" }}>
              <option value="">Auto</option>
              {[0.5, 1, 2, 5, 10, 20, 30].map(v => (
                <option key={v} value={v}>{v < 1 ? `${v * 1000} m` : `${v} km`}</option>
              ))}
            </select>
          </div>

          <div style={{ position:"relative", alignSelf:"flex-end" }}>
            <button onClick={() => { if (canSearch) { doSearch(); } else { setShowTip(true); setTimeout(()=>setShowTip(false),2500); } }}
              style={{ padding: "10px 28px", background: canSearch ? T.navy : "#C5CBE9", border: "none",
                borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: canSearch ? "pointer" : "not-allowed",
                boxShadow: canSearch ? "0 2px 8px rgba(201,168,76,0.3)" : "none",
                height: 42, opacity: canSearch ? 1 : 0.7, transition: "all 0.15s" }}>
              Search
            </button>
            {showTip && (
              <div style={{ position:"absolute", top:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)",
                background:"#0b1239", color:"#fff", fontSize:11, fontWeight:600,
                padding:"6px 12px", borderRadius:8, whiteSpace:"nowrap", zIndex:100,
                boxShadow:"0 4px 12px rgba(0,0,0,0.2)" }}>
                ← Please select a municipality first
                <div style={{ position:"absolute", top:-5, left:"50%", transform:"translateX(-50%)",
                  width:0, height:0, borderLeft:"5px solid transparent", borderRight:"5px solid transparent",
                  borderBottom:"5px solid #1A1A2E" }} />
              </div>
            )}
          </div>

          {(hasSelection || searched) && (
            <button onClick={clearAll}
              style={{ padding: "10px 16px", background: "none", border: `1px solid ${T.border}`,
                borderRadius: 10, color: T.textSub, fontSize: 12, fontWeight: 600,
                cursor: "pointer", alignSelf: "flex-end", height: 42 }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Google Maps link search ── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8,
            background: "#fff", border: `1px solid ${gmapsError ? "#FCA5A5" : T.border}`,
            borderRadius: 10, padding: "0 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
            <input
              value={gmapsLink}
              onChange={e => { setGmapsLink(e.target.value); setGmapsError(""); }}
              onKeyDown={e => e.key === "Enter" && applyGmapsLink()}
              placeholder="Paste a Google Maps link to search nearby listings…"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 12,
                color: T.text, background: "transparent", padding: "10px 0" }}
            />
            {gmapsLink && (
              <button onClick={() => { setGmapsLink(""); setGmapsError(""); }}
                style={{ background: "none", border: "none", color: T.textMuted,
                  fontSize: 14, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>✕</button>
            )}
          </div>
          <button
            onClick={applyGmapsLink}
            disabled={!gmapsLink.trim() || gmapsLoading}
            style={{ padding: "10px 18px", height: 42, background: gmapsLink.trim() ? "#0077B6" : "#C5CBE9",
              border: "none", borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 700,
              cursor: gmapsLink.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap",
              opacity: gmapsLoading ? 0.7 : 1, transition: "all 0.15s" }}>
            {gmapsLoading ? "Resolving…" : "Search Area"}
          </button>
        </div>
        {gmapsPlace && !gmapsError && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#0077B6", fontWeight: 600 }}>
            📍 Searching 2 km around: <span style={{ fontWeight: 700 }}>{gmapsPlace}</span>
          </div>
        )}
        {gmapsError && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#6B2A2A", background: "#FEF2F2",
            border: "1px solid #FCA5A5", borderRadius: 7, padding: "5px 10px" }}>
            ⚠ {gmapsError}
          </div>
        )}
      </div>

      {/* ── Secondary filters ── */}
      {hasSelection && (
        <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:12,
          padding:"14px 20px", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, flexWrap:"nowrap", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, flexWrap:"nowrap", flex:1, minWidth:0 }}>

            {/* House Type */}
            <MultiSelect
              label="House Type"
              options={["Detached house","Semi-detached house","Terraced house","Apartments"]}
              value={selHouseType}
              onChange={setSelHouseType}
              placeholder="All types"
              maxDisplay={1}
            />

            {/* Unit Type */}
            <MultiSelect
              label="Unit Type"
              options={ALL_UTS}
              value={selUnit}
              onChange={setSelUnit}
              placeholder="All types"
              maxDisplay={2}
            />

            {/* ESG Grade */}
            <MultiSelect
              label="ESG Grade"
              options={ALL_ESG}
              value={selEsg}
              onChange={setSelEsg}
              placeholder="All grades"
              maxDisplay={3}
            />

            {/* Price range with slider */}
            <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth:160 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:9, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Price Range</span>
                <span style={{ fontSize:10, fontWeight:700, color:PRICE_COLOR }}>
                  {minPrice ? `€${Number(minPrice).toLocaleString()}` : "Any"} – {maxPrice ? `€${Number(maxPrice).toLocaleString()}` : "Any"}
                </span>
              </div>
              {/* Preset buckets */}
              <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                {[["<200k",0,200000],["200-400k",200000,400000],["400-700k",400000,700000],[">700k",700000,""]]
                  .map(([lbl,mn,mx]) => {
                    const active = String(minPrice)===String(mn) && String(maxPrice)===String(mx);
                    return (
                      <button key={lbl} onClick={() => { setMinPrice(active?"":mn); setMaxPrice(active?"":mx); }}
                        style={{ padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:700,
                          cursor:"pointer", transition:"all 0.15s",
                          background: active ? PRICE_COLOR : "#FFFFFF",
                          border:`1.5px solid ${active ? PRICE_COLOR : "transparent"}`,
                          color: active ? "#fff" : T.textSub }}>
                        {lbl}
                      </button>
                    );
                  })}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <input type="number" placeholder="Min €" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                  style={{ width:80, padding:"4px 7px", borderRadius:7, fontSize:11,
                    border:`1.5px solid ${minPrice ? PRICE_COLOR : T.border}`, outline:"none",
                    color:T.text, background:"#F2F4F6" }} />
                <span style={{ color:T.textMuted, fontSize:11 }}>–</span>
                <input type="number" placeholder="Max €" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                  style={{ width:80, padding:"4px 7px", borderRadius:7, fontSize:11,
                    border:`1.5px solid ${maxPrice ? PRICE_COLOR : T.border}`, outline:"none",
                    color:T.text, background:"#F2F4F6" }} />
              </div>
            </div>

            <div style={{ width:1, alignSelf:"stretch", background:T.border, margin:"2px 0" }} />

            {/* €/m² range */}
            <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth:150 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:9, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>€/m²</span>
                <span style={{ fontSize:10, fontWeight:700, color:M2_COLOR }}>
                  {minM2 ? `€${Number(minM2).toLocaleString()}` : "Any"} – {maxM2 ? `€${Number(maxM2).toLocaleString()}` : "Any"}
                </span>
              </div>
              <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                {[["<2k",0,2000],["2-3k",2000,3000],["3-5k",3000,5000],[">5k",5000,""]]
                  .map(([lbl,mn,mx]) => {
                    const active = String(minM2)===String(mn) && String(maxM2)===String(mx);
                    return (
                      <button key={lbl} onClick={() => { setMinM2(active?"":mn); setMaxM2(active?"":mx); }}
                        style={{ padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:700,
                          cursor:"pointer", transition:"all 0.15s",
                          background: active ? M2_COLOR : "#FFFFFF",
                          border:`1.5px solid ${active ? M2_COLOR : "transparent"}`,
                          color: active ? "#fff" : T.textSub }}>
                        {lbl}
                      </button>
                    );
                  })}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <input type="number" placeholder="Min" value={minM2} onChange={e => setMinM2(e.target.value)}
                  style={{ width:75, padding:"4px 7px", borderRadius:7, fontSize:11,
                    border:`1.5px solid ${minM2 ? M2_COLOR : T.border}`, outline:"none",
                    color:T.text, background:"#F2F4F6" }} />
                <span style={{ color:T.textMuted, fontSize:11 }}>–</span>
                <input type="number" placeholder="Max" value={maxM2} onChange={e => setMaxM2(e.target.value)}
                  style={{ width:75, padding:"4px 7px", borderRadius:7, fontSize:11,
                    border:`1.5px solid ${maxM2 ? M2_COLOR : T.border}`, outline:"none",
                    color:T.text, background:"#F2F4F6" }} />
              </div>
            </div>

            {/* Active filters count + reset */}
            {(selUnit.length + selEsg.length + selHouseType.length > 0 || minPrice || maxPrice || minM2 || maxM2) && (
              <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, alignSelf:"center" }}>
                <span style={{ background:T.navyLight, color:"#fff", borderRadius:20,
                  padding:"4px 12px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
                  {[selUnit.length, selEsg.length, selHouseType.length, minPrice||maxPrice?1:0, minM2||maxM2?1:0]
                    .reduce((a,b)=>a+b,0)} filter{[selUnit.length, selEsg.length, selHouseType.length, minPrice||maxPrice?1:0, minM2||maxM2?1:0].reduce((a,b)=>a+b,0)!==1?"s":""} active
                </span>
                <button onClick={() => { setSelUnit([]); setSelEsg([]); setSelHouseType([]); setMinPrice(""); setMaxPrice(""); setMinM2(""); setMaxM2(""); }}
                  style={{ background:"none", border:`1.5px solid ${T.border}`, borderRadius:20,
                    color:T.textMuted, fontSize:11, cursor:"pointer", padding:"4px 12px",
                    fontWeight:600, whiteSpace:"nowrap" }}>
                  ✕ Clear
                </button>
              </div>
            )}
          </div>{/* end inner filters flex */}

          {/* Export button — far right */}
          {selectedIds.size > 0 && (
            <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", alignSelf:"center", flexShrink:0 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
                letterSpacing:"0.05em", marginBottom:4 }}>Export</div>
              <button onClick={() => {
                const ids = [...selectedIds].join(",");
                window.open(`${API}/search/export?ids=${ids}`, "_blank");
              }} style={{ background:T.navy, border:"none", borderRadius:9, padding:"10px 18px",
                fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer",
                boxShadow:"0 2px 8px rgba(11,18,57,0.18)", whiteSpace:"nowrap" }}>
                ↓ Excel ({selectedIds.size})
              </button>
            </div>
          )}
          </div>{/* end outer space-between flex */}
        </div>
      )}
      {/* ── Results ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <LoadingHouse message="Searching…" />
        </div>
      )}

      {/* Street preview map — shown immediately when a geocoded street is selected */}
      {!loading && searchCenter && (results === null || results.length === 0) && (
        <div style={{ marginTop: 16, display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📍</span>
              <span>{selStreet.length > 0 ? `Showing location: ${selStreet[0]}` : "Selected location"}</span>
            </div>
            {results !== null && results.length === 0 && (
              <div style={{ color: T.textMuted, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                No developments found near this street
                <div style={{ fontSize: 12, fontWeight: 400, marginTop: 4 }}>Try increasing the radius</div>
              </div>
            )}
          </div>
          <div style={{ flex: 1, maxWidth: 500 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8,
              background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px" }}>
              <span style={{ fontSize:10, color:T.textMuted, whiteSpace:"nowrap" }}>📍 Radius:</span>
              <input type="range" min="0.1" max="30" step="0.1"
                value={radiusKm ?? 0.1}
                onChange={e => setRadiusKm(+e.target.value)}
                style={{ flex:1, accentColor:"#0B1239", cursor:"pointer" }} />
              <span style={{ fontSize:11, fontWeight:700, color:T.navy, minWidth:40, textAlign:"right" }}>
                {radiusKm ? (radiusKm < 1 ? `${Math.round(radiusKm*1000)}m` : `${radiusKm}km`) : "Auto"}
              </span>
              {radiusKm && <button onClick={() => setRadiusKm(null)}
                style={{ background:"none", border:"none", color:T.textMuted, fontSize:11, cursor:"pointer", padding:0 }}
                title="Reset to auto">↺</button>}
            </div>
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)", height: 240 }}>
              <LeafletMap markers={[]} height="240px"
                center={searchCenter} zoom={15} />
            </div>
          </div>
        </div>
      )}

      {!loading && searched && results !== null && (
        <>
          {results.length === 0 ? null : (
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>

                {/* ── LEFT: scrollable card list ── */}
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                      Developments <span style={{ color: T.textMuted, fontWeight: 400, fontSize: 12 }}>({displayResults.length})</span>
                      {filteredDelisted.length > 0 && (
                        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: "#6B2A2A",
                          background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 4, padding: "1px 6px" }}>
                          +{filteredDelisted.length} delisted
                        </span>
                      )}
                    </div>
                    <button onClick={() => {
                      if (selectedIds.size === displayResults.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(displayResults.map(l => l.listing_id)));
                      }
                    }} style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:6,
                      padding:"3px 9px", fontSize:10, fontWeight:600, color:T.textSub, cursor:"pointer" }}>
                      {selectedIds.size === displayResults.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div style={{ height: "calc(100vh - 260px)", overflowY: "auto", overflowX: "hidden",
                    display: "flex", flexDirection: "column", gap: 10,
                    paddingRight: 4, scrollbarWidth: "thin", scrollbarColor: `${T.border} transparent` }}>
                    {displayResults.map(l => (
                      <ResultCard key={l.listing_id} l={l}
                        mapType="google"
                        active={l.listing_id === activePin}
                        selected={selectedIds.has(l.listing_id)}
                        onToggleSelect={id => setSelectedIds(prev => {
                          const next = new Set(prev);
                          next.has(id) ? next.delete(id) : next.add(id);
                          return next;
                        })}
                        onSelect={l => onSelectListing(l.listing_id, l.property_name, l.municipality)}
                        onHover={id => { setActivePin(id); if (id) lastHoveredPin.current = id; }}
                      />
                    ))}

                    {filteredDelisted.length > 0 && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 2px" }}>
                          <div style={{ flex: 1, height: 1, background: "#FCA5A5" }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#6B2A2A",
                            background: "#FEF2F2", border: "1px solid #FCA5A5",
                            borderRadius: 5, padding: "2px 8px", whiteSpace: "nowrap" }}>
                            {filteredDelisted.length} Delisted
                          </span>
                          <div style={{ flex: 1, height: 1, background: "#FCA5A5" }} />
                        </div>
                        {filteredDelisted.map(l => (
                          <DelistedSearchCard key={`d-${l.listing_id}`} l={l}
                            onSelect={l => onSelectListing(l.listing_id, l.property_name, l.municipality)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* ── RIGHT: Maps + Charts ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0,
                  height: "calc(100vh - 200px)", overflowY: "auto",
                  scrollbarWidth: "thin", scrollbarColor: `${T.border} transparent` }}>

                  {/* Row 1: Leaflet Map | Google Map */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

                    {/* Leaflet map */}
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8,
                        background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px" }}>
                        <span style={{ fontSize:10, color:T.textMuted, whiteSpace:"nowrap" }}>📍 Radius:</span>
                        <input type="range" min="0.1" max="30" step="0.1"
                          value={radiusKm ?? 0.1}
                          onChange={e => setRadiusKm(+e.target.value)}
                          style={{ flex:1, accentColor:"#0B1239", cursor:"pointer" }} />
                        <span style={{ fontSize:11, fontWeight:700, color:T.navy, minWidth:40, textAlign:"right" }}>
                          {radiusKm ? (radiusKm < 1 ? `${Math.round(radiusKm*1000)}m` : `${radiusKm}km`) : "Auto"}
                        </span>
                        {radiusKm && <button onClick={() => setRadiusKm(null)}
                          style={{ background:"none", border:"none", color:T.textMuted, fontSize:11, cursor:"pointer", padding:0 }}
                          title="Reset to auto">↺</button>}
                      </div>
                      <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`,
                        boxShadow:"0 2px 8px rgba(0,0,0,0.07)", height:240 }}>
                        <LeafletMap markers={mapMarkers} height="240px" zoom={12}
                          radiusKm={radiusKm} radiusCenter={searchCenter}
                          onMarkerClick={id => {
                            setActivePin(p => p === id ? null : id);
                            const el = document.getElementById(`scard-${id}`);
                            if (el) el.scrollIntoView({ behavior:"smooth", block:"center" });
                          }} />
                      </div>
                    </div>

                    {/* Google Maps */}
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8,
                        background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px" }}>
                        <span style={{ fontSize:10, color:T.textMuted, flex:1 }}>📌 Hover a listing to pin it</span>
                        <span style={{ fontSize:10, fontWeight:700, color:T.textMuted }}>G Maps</span>
                      </div>
                      <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`,
                        boxShadow:"0 2px 8px rgba(0,0,0,0.07)", height:240 }}>
                        {(() => {
                          const pinId = activePin ?? lastHoveredPin.current;
                          const hoveredListing = pinId ? results.find(r => r.listing_id === pinId) : null;
                          const center = hoveredListing?.lat
                            ? { lat: hoveredListing.lat, lng: hoveredListing.lng }
                            : searchCenter || (mapMarkers[0] ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng } : null);
                          const gmUrl = center
                            ? `https://maps.google.com/maps?q=${center.lat},${center.lng}&hl=en&z=16&output=embed`
                            : null;
                          return gmUrl
                            ? <iframe key={gmUrl} src={gmUrl} width="100%" height="240" style={{ border:"none", display:"block" }} title="Google Maps" loading="lazy" />
                            : <div style={{ height:240, display:"flex", alignItems:"center", justifyContent:"center", color:T.textMuted, fontSize:12 }}>No location available</div>;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Unit Type Summary | House Type Summary */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

                    {/* Unit Type Summary */}
                    <ChartCard title="Unit Type Summary">
                      <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:240 }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                          <thead style={{ position:"sticky", top:0, zIndex:1 }}>
                            <tr style={{ borderBottom:`2px solid ${T.border}`, background:T.bgStripe }}>
                              {["Type","Units","Avg m²","Min","Avg","Max","€/m²"].map(h => (
                                <th key={h} style={{ padding:"7px 8px", textAlign:h==="Type"?"left":"right",
                                  color:T.textMuted, fontSize:10, textTransform:"uppercase",
                                  letterSpacing:"0.07em", fontWeight:600, background:T.bgStripe }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {utStats.map((row, i) => (
                              <tr key={row.unit_type} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgStripe:"#fff" }}>
                                <td style={{ padding:"7px 8px" }}>
                                  <span style={{ background:UNIT_COLORS[row.unit_type]||"#8A96B4", color:"#fff",
                                    fontWeight:700, fontSize:11, padding:"2px 7px", borderRadius:4 }}>{row.unit_type}</span>
                                </td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.text, fontWeight:600 }}>{row.count}</td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.textSub, fontSize:11 }}>{row.avg_size != null ? Math.round(row.avg_size) : "—"}</td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.green, fontSize:11 }}>{row.min_price ? fmt(row.min_price) : "—"}</td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.navy, fontWeight:700 }}>{row.avg_price ? fmt(row.avg_price) : "—"}</td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.red, fontSize:11 }}>{row.max_price ? fmt(row.max_price) : "—"}</td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.navyMid, fontWeight:600 }}>{(row.avg_pm2 ?? row.avg_price_m2) ? `€${Math.round(row.avg_pm2 ?? row.avg_price_m2).toLocaleString("en")}` : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ChartCard>

                    {/* House Type Summary */}
                    <ChartCard title="House Type Summary">
                      <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:240 }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                          <thead style={{ position:"sticky", top:0, zIndex:1 }}>
                            <tr style={{ borderBottom:`2px solid ${T.border}`, background:T.bgStripe }}>
                              {["Type","Units","Avg m²","Min","Avg","Max","€/m²"].map(h => (
                                <th key={h} style={{ padding:"7px 8px", textAlign:h==="Type"?"left":"right",
                                  color:T.textMuted, fontSize:10, textTransform:"uppercase",
                                  letterSpacing:"0.07em", fontWeight:600, background:T.bgStripe }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {serverHtStats.map((row, i) => (
                              <tr key={row.house_type} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgStripe:"#fff" }}>
                                <td style={{ padding:"7px 8px", whiteSpace:"nowrap" }}>
                                  <span style={{ background:"rgba(100,100,140,0.10)", color:"#6B7A9F",
                                    border:"1px solid rgba(100,100,140,0.25)", fontWeight:700,
                                    fontSize:11, padding:"2px 8px", borderRadius:4,
                                    display:"block", whiteSpace:"nowrap" }}>{row.house_type}</span>
                                </td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.text, fontWeight:600 }}>{row.count}</td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.textSub, fontSize:11 }}>{row.avg_size != null ? Math.round(row.avg_size) : "—"}</td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.green, fontSize:11 }}>{row.min_price ? fmt(row.min_price) : "—"}</td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.navy, fontWeight:700 }}>{row.avg_price ? fmt(row.avg_price) : "—"}</td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.red, fontSize:11 }}>{row.max_price ? fmt(row.max_price) : "—"}</td>
                                <td style={{ padding:"7px 8px", textAlign:"right", color:T.navyMid, fontWeight:600 }}>{row.avg_pm2 ? `€${Math.round(row.avg_pm2).toLocaleString("en")}` : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ChartCard>
                  </div>

                  {/* Row 3: Price Distribution | €/m² Distribution */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    {priceDist.length > 0 && (
                      <ChartCard title="Price Distribution">
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={priceDist} barSize={22}>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                            <XAxis dataKey="bin" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={v => [`${v} developments`, "Count"]}
                              contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }} />
                            <Bar dataKey="count" radius={[4,4,0,0]} isAnimationActive={false}>
                              {priceDist.map((_,i) => <Cell key={i} fill={PRICE_COLOR} fillOpacity={0.35 + (i / Math.max(priceDist.length - 1, 1)) * 0.65} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    )}
                    {m2Dist.length > 0 && (
                      <ChartCard title="€/m² Distribution">
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={m2Dist} barSize={22}>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                            <XAxis dataKey="bin" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={v => [`${v} developments`, "Count"]}
                              contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }} />
                            <Bar dataKey="count" radius={[4,4,0,0]} isAnimationActive={false}>
                              {m2Dist.map((_,i) => <Cell key={i} fill={M2_COLOR} fillOpacity={0.35 + (i / Math.max(m2Dist.length - 1, 1)) * 0.65} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    )}
                  </div>

                </div>{/* end right */}
              </div>
          )}
        </>
      )}

      {!searched && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: T.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🏗️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.textSub }}>
            {selMuni.length > 0 ? "Now select an area or street to search" : "Select a municipality to begin"}
          </div>
          <div style={{ fontSize: 12, marginTop: 8 }}>
            {selMuni.length > 0 ? "Choose an area, street, or locality from the second dropdown" : "Then choose a street or area to find developments"}
          </div>
        </div>
      )}
    </div>
  );
}
