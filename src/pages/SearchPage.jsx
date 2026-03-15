import React, { useState, useEffect, useRef, useMemo } from "react";
import { T, fmt, fmtFull, UNIT_COLORS, ESG_COLORS, Tag } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";

const PRICE_COLOR = "#C9A84C";
const M2_COLOR    = "#3B82F6";

// ── Multiselect dropdown ───────────────────────────────────────────────────
function MultiSelect({ label, options, value, onChange, placeholder = "All", maxDisplay = 2, disabled = false }) {
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
        background: disabled ? "#F7F6F2" : "#fff",
        border: `1px solid ${value.length && !disabled ? T.borderAccent : T.border}`,
        borderRadius: 10, padding: "10px 14px", cursor: disabled ? "not-allowed" : "pointer", minWidth: 200,
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
                background: "#FAFAF8", color: T.text }} />
          </div>
          {value.length > 0 && (
            <div style={{ padding: "6px 10px", borderBottom: `1px solid ${T.border}`,
              display: "flex", gap: 6, flexWrap: "wrap" }}>
              {value.map(v => (
                <span key={v} onClick={e => { e.stopPropagation(); toggle(v); }}
                  style={{ background: T.goldLight, color: T.gold, borderRadius: 5,
                    padding: "2px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {v} ✕
                </span>
              ))}
            </div>
          )}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0
              ? <div style={{ padding: "12px 14px", color: T.textMuted, fontSize: 12 }}>No results</div>
              : filtered.map(opt => (
                <div key={opt} onClick={() => toggle(opt)}
                  style={{ padding: "8px 14px", cursor: "pointer", fontSize: 12,
                    display: "flex", alignItems: "center", gap: 8,
                    background: value.includes(opt) ? T.goldLight : "transparent",
                    color: value.includes(opt) ? T.gold : T.text,
                    fontWeight: value.includes(opt) ? 600 : 400,
                    transition: "background 0.1s" }}
                  onMouseEnter={e => { if (!value.includes(opt)) e.currentTarget.style.background = "#F7F6F2"; }}
                  onMouseLeave={e => { if (!value.includes(opt)) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${value.includes(opt) ? T.gold : T.border}`,
                    background: value.includes(opt) ? T.gold : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "#fff" }}>
                    {value.includes(opt) ? "✓" : ""}
                  </span>
                  {opt}
                </div>
              ))
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

// ── Radius selector ────────────────────────────────────────────────────────
function RadiusSelect({ value, onChange }) {
  const opts = [null, 1, 2, 5, 10, 20, 30];
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase",
        marginBottom: 4, letterSpacing: "0.05em" }}>Km Radius</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {opts.map(v => (
          <button key={v ?? "any"} onClick={() => onChange(v)}
            style={{ padding: "9px 14px", borderRadius: 9, border: `1px solid ${value === v ? T.borderAccent : T.border}`,
              background: value === v ? T.goldLight : "#fff",
              color: value === v ? T.gold : T.textSub,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            {v === null ? "Any" : `${v}km`}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Result card ────────────────────────────────────────────────────────────
function ResultCard({ l, onSelect, active, onHover }) {
  const [hov, setHov] = useState(false);
  const isHighlighted = active || hov;
  const unitTypes = (l.unit_types || "").split(", ").filter(Boolean);
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
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 2 }}>
            {l.property_name}
          </div>
          <div style={{ fontSize: 11, color: T.textSub }}>
            {l.municipality} · {l.province}
          </div>
          {l.city_area && (
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
              📍 {l.city_area}
            </div>
          )}
        </div>
        {l.esg_grade && (
          <span style={{ background: ESG_COLORS[l.esg_grade] || "#9CA3AF",
            color: "#fff", borderRadius: 5, padding: "2px 8px", fontSize: 10,
            fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
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

      {/* Unit type tags */}
      {unitTypes.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {unitTypes.map(ut => (
            <span key={ut} style={{ background: UNIT_COLORS[ut] || "#9CA3AF",
              color: "#fff", borderRadius: 4, padding: "2px 7px",
              fontSize: 10, fontWeight: 700 }}>{ut}</span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: T.gold, fontWeight: 600, marginTop: -4 }}>
        View development →
      </div>
    </div>
  );
}

// ── Main SearchPage ────────────────────────────────────────────────────────
export default function SearchPage({ onSelectListing }) {
  const [opts, setOpts]         = useState({ municipalities: [], locations: [] });
  const [selMuni,  setSelMuni]  = useState([]);
  const [selStreet, setSelStreet] = useState([]);
  const [radiusKm, setRadiusKm] = useState(null);

  // Secondary filters — enabled once primary selection made
  const [selUnit, setSelUnit]   = useState([]);
  const [selEsg,  setSelEsg]    = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minM2,   setMinM2]    = useState("");
  const [maxM2,   setMaxM2]    = useState("");

  const [results,  setResults]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [activePin, setActivePin] = useState(null);


  // Fixed center for radius searches — set once from first search results
  const searchCenterRef = React.useRef(null);
  const isAutoRadiusRef = React.useRef(false); // flag to skip re-fetch on auto-set

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
  }, [selMuni, selStreet, selUnit, selEsg, minPrice, maxPrice, minM2, maxM2]);

  // Single useEffect mirrors ApartmentPage pattern
  useEffect(() => {
    if (!searched) return;
    // Skip re-fetch when radius was auto-set — center/circle already correct
    if (isAutoRadiusRef.current) {
      isAutoRadiusRef.current = false;
      return;
    }
    setLoading(true);
    const currentRadius = radiusKm; // capture for use inside .then()
    const qs = _buildQs(currentRadius);
    fetch(`${API}/search/listings?${qs}`)
      .then(r => r.json())
      .then(d => {
        const listings = d.listings || [];
        setResults(listings);
        setLoading(false);
        // On first fetch (no radius yet), store center and auto-set 10km
        if (!currentRadius && !searchCenterRef.current) {
          const withCoords = listings.filter(l => l.lat && l.lng);
          if (withCoords.length) {
            const lat = withCoords.reduce((a,b) => a+b.lat, 0) / withCoords.length;
            const lng = withCoords.reduce((a,b) => a+b.lng, 0) / withCoords.length;
            searchCenterRef.current = { lat, lng };
            isAutoRadiusRef.current = true;
            setRadiusKm(0.1);
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
  }, [searched, radiusKm, _buildQs]);

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
        color:    l.listing_id === activePin ? T.blue : "#9CA3AF",
      }));
  }, [results, activePin]);

  const displayResults = results || [];

  const hasSelection = selMuni.length > 0 && selStreet.length > 0;
  const canSearch = selMuni.length > 0 && selStreet.length > 0;
  const ALL_UTS = ["Studio","1BR","2BR","3BR","4BR","5BR","Penthouse"];
  const ALL_ESG = ["A","B","C","D","E","F","G"];

  // Load all municipalities on mount
  useEffect(() => {
    fetch(`${API}/search/options`)
      .then(r => r.json())
      .then(d => setOpts({ municipalities: d.municipalities || [], locations: d.locations || [] }))
      .catch(() => {});
  }, []);

  // Reload streets whenever municipality selection changes
  useEffect(() => {
    if (selMuni.length === 0) {
      // Reset to all streets when no municipality selected
      fetch(`${API}/search/options`)
        .then(r => r.json())
        .then(d => setOpts(prev => ({ ...prev, locations: d.locations || [] })))
        .catch(() => {});
      return;
    }
    const qs = new URLSearchParams();
    selMuni.forEach(m => qs.append("municipality", m));
    fetch(`${API}/search/options?${qs}`)
      .then(r => r.json())
      .then(d => {
        setOpts(prev => ({ ...prev, locations: d.locations || [] }));
        // Only clear selections that don't exist in the new municipality
        setSelStreet(prev => prev.filter(s => (d.locations || []).includes(s)));
      })
      .catch(() => {});
  }, [selMuni]); // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = () => {
    searchCenterRef.current = null;
    isAutoRadiusRef.current = false;
    setRadiusKm(null);
    setActivePin(null);
    setResults(null);
    setSearched(false);
    setTimeout(() => setSearched(true), 0);
  };

  // Auto-search only when BOTH municipality AND street are selected
  useEffect(() => {
    if (!selMuni.length || !selStreet.length) return;
    const timer = setTimeout(() => {
      searchCenterRef.current = null;
      isAutoRadiusRef.current = false;
      setRadiusKm(null);
      setActivePin(null);
      setResults(null);
      setSearched(false);
      setTimeout(() => setSearched(true), 0);
    }, 400);
    return () => clearTimeout(timer);
  }, [selMuni, selStreet]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAll = () => {
    setSelMuni([]); setSelStreet([]); setRadiusKm(null);
    setSelUnit([]); setSelEsg([]);
    setMinPrice(""); setMaxPrice(""); setMinM2(""); setMaxM2("");
    setResults(null); setSearched(false);
    setActivePin(null);
    searchCenterRef.current = null;
    isAutoRadiusRef.current = false;
  };

  return (
    <div style={{ padding: "20px 40px", maxWidth: 1400, margin: "0 auto" }}>

      {/* ── Primary search row ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <MultiSelect
            label="Municipality"
            options={opts.municipalities}
            value={selMuni}
            onChange={setSelMuni}
            placeholder="Select municipalities…"
            maxDisplay={2}
          />
          <MultiSelect
            label="Area / Street / Locality"
            options={opts.locations}
            value={selStreet}
            onChange={selMuni.length > 0 ? setSelStreet : () => {}}
            placeholder={selMuni.length > 0 ? "Select area or street…" : "Select municipality first…"}
            maxDisplay={2}
            disabled={selMuni.length === 0}
          />
          {/* Km Radius dropdown */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted,
              textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.05em" }}>Km Radius</div>
            <select value={radiusKm ?? ""} onChange={e => setRadiusKm(e.target.value === "" ? null : +e.target.value)}
              style={{ height: 42, padding: "0 32px 0 12px", borderRadius: 10,
                border: `1px solid ${radiusKm ? T.borderAccent : T.border}`,
                background: "#fff", color: radiusKm ? T.gold : T.textMuted,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)", outline: "none",
                appearance: "none", WebkitAppearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239CA3AF' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
                minWidth: 120 }}>
              <option value="">Any radius</option>
              <option value="0.1">100 m</option>
              <option value="0.5">500 m</option>
              {[1,1.5,2,3,5,10,20,30].map(v => (
                <option key={v} value={v}>{v < 1 ? `${v*1000}m` : `${v} km`}</option>
              ))}
            </select>
          </div>

          <button onClick={doSearch}
            style={{ padding: "10px 28px", background: T.gold, border: "none",
              borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 2px 8px rgba(201,168,76,0.3)",
              transition: "opacity 0.15s", alignSelf: "flex-end", height: 42 }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            Search
          </button>

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

      {/* ── Secondary filters (shown once selection made) ── */}
      {hasSelection && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
          marginBottom: 16, padding: "10px 4px" }}>

          {/* Dev type pills */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {ALL_UTS.map(ut => (
              <button key={ut} onClick={() => setSelUnit(prev =>
                prev.includes(ut) ? prev.filter(x => x !== ut) : [...prev, ut])}
                style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  background: selUnit.includes(ut) ? UNIT_COLORS[ut] || "#555" : "transparent",
                  border: `1px solid ${selUnit.includes(ut) ? UNIT_COLORS[ut] || "#555" : T.border}`,
                  color: selUnit.includes(ut) ? "#fff" : T.textMuted }}>
                {ut}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0 }} />

          {/* ESG pills */}
          <div style={{ display: "flex", gap: 3 }}>
            {ALL_ESG.map(g => (
              <button key={g} onClick={() => setSelEsg(prev =>
                prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                style={{ width: 26, height: 26, borderRadius: 6, fontSize: 10, fontWeight: 800,
                  cursor: "pointer", transition: "all 0.15s",
                  border: `1px solid ${selEsg.includes(g) ? ESG_COLORS[g] || "#555" : T.border}`,
                  background: selEsg.includes(g) ? ESG_COLORS[g] || "#555" : "transparent",
                  color: selEsg.includes(g) ? "#fff" : T.textMuted }}>
                {g}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0 }} />

          {/* Price range */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, whiteSpace: "nowrap" }}>€</span>
            <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)}
              style={{ width: 72, padding: "4px 6px", borderRadius: 6, fontSize: 11,
                border: `1px solid ${T.border}`, outline: "none", color: T.text, background: "#fff" }} />
            <span style={{ color: T.textMuted, fontSize: 11 }}>–</span>
            <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              style={{ width: 72, padding: "4px 6px", borderRadius: 6, fontSize: 11,
                border: `1px solid ${T.border}`, outline: "none", color: T.text, background: "#fff" }} />
          </div>

          <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0 }} />

          {/* €/m² range */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, whiteSpace: "nowrap" }}>€/m²</span>
            <input type="number" placeholder="Min" value={minM2} onChange={e => setMinM2(e.target.value)}
              style={{ width: 72, padding: "4px 6px", borderRadius: 6, fontSize: 11,
                border: `1px solid ${T.border}`, outline: "none", color: T.text, background: "#fff" }} />
            <span style={{ color: T.textMuted, fontSize: 11 }}>–</span>
            <input type="number" placeholder="Max" value={maxM2} onChange={e => setMaxM2(e.target.value)}
              style={{ width: 72, padding: "4px 6px", borderRadius: 6, fontSize: 11,
                border: `1px solid ${T.border}`, outline: "none", color: T.text, background: "#fff" }} />
          </div>

          {/* Active filter count */}
          {(selUnit.length + selEsg.length > 0 || minPrice || maxPrice || minM2 || maxM2) && (
            <button onClick={() => { setSelUnit([]); setSelEsg([]); setMinPrice(""); setMaxPrice(""); setMinM2(""); setMaxM2(""); }}
              style={{ fontSize: 11, color: T.textMuted, background: "none", border: "none",
                cursor: "pointer", textDecoration: "underline", padding: 0 }}>
              Reset filters
            </button>
          )}
        </div>
      )}
      {/* ── Results ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: T.textSub, fontSize: 14 }}>
          Searching…
        </div>
      )}

      {!loading && searched && results !== null && (
        <>
          {results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: T.textMuted }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No developments match your search</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Try broadening your filters or selecting a different area</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>

              {/* ── LEFT: Cards list ── */}
              <div>
                <div style={{ fontSize: 12, color: T.textSub, fontWeight: 600, marginBottom: 10 }}>
                  <span style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>{displayResults.length}</span>
                  {results.length !== displayResults.length && <span style={{ color: T.textMuted }}> of {results.length}</span>}
                  {" "}development{displayResults.length !== 1 ? "s" : ""}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10,
                  maxHeight: "calc(100vh - 260px)", overflowY: "auto",
                  paddingRight: 4, scrollbarWidth: "thin", scrollbarColor: `${T.border} transparent` }}>
                  {displayResults.map(l => (
                    <ResultCard key={l.listing_id} l={l}
                      active={l.listing_id === activePin}
                      onSelect={l => onSelectListing(l.listing_id, l.property_name, l.municipality)}
                      onHover={id => setActivePin(id)}
                    />
                  ))}
                </div>
              </div>

              {/* ── RIGHT: Map + radius slider ── */}
              <div style={{ position: "sticky", top: 16 }}>
                {/* Radius slider bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                  background: T.bgStripe, border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: "8px 14px" }}>
                  <span style={{ fontSize: 11, color: T.textMuted, whiteSpace: "nowrap" }}>📍 Search radius:</span>
                  <input type="range" min="0" max="30" step="0.1"
                    value={radiusKm ?? 0}
                    onChange={e => setRadiusKm(+e.target.value === 0 ? null : +e.target.value)}
                    style={{ flex: 1, accentColor: T.gold, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.gold, minWidth: 100 }}>
                    {loading ? "Loading…" : radiusKm
                      ? radiusKm < 1 ? `${Math.round(radiusKm*1000)}m radius` : `${radiusKm} km radius`
                      : "All results"}
                  </span>
                  {radiusKm && (
                    <button onClick={() => setRadiusKm(null)}
                      style={{ background: "none", border: "none", color: T.textMuted,
                        fontSize: 11, cursor: "pointer", padding: 0, fontWeight: 600 }}>
                      ✕ reset
                    </button>
                  )}
                </div>
                {/* Map */}
                <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}`,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.07)", height: "calc(100vh - 310px)", minHeight: 400 }}>
                  <LeafletMap
                    markers={mapMarkers}
                    height="100%"
                    zoom={11}
                    radiusKm={radiusKm}
                    radiusCenter={searchCenterRef.current}
                    onMarkerClick={id => {
                      setActivePin(p => p === id ? null : id);
                      const el = document.getElementById(`scard-${id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  />
                </div>
              </div>

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
