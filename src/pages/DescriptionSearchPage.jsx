import React, { useState, useEffect, useRef, useMemo } from "react";
import { T, fmt, fmtNum, UNIT_COLORS, ESG_COLORS, ChartCard, MapPinPopup } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";
import LoadingHouse from "../components/LoadingHouse.jsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PRICE_COLOR = "#0B1239";
const M2_COLOR    = "#4A5A8A";
const ALL_UTS = ["Studio","1BR","2BR","3BR","4BR","5BR","Penthouse"];
const ALL_ESG = ["A","B","C","D","E","F","G"];
const UT_ORDER = ["Studio","1BR","2BR","3BR","4BR","5BR","Penthouse"];

// ── MultiSelect (identical to SearchPage) ──────────────────────────────────
function MultiSelect({ label, options, value, onChange, placeholder="All", maxDisplay=2, disabled=false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = useMemo(() => options.filter(o => o.toLowerCase().includes(query.toLowerCase())), [options, query]);
  const toggle = opt => onChange(value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt]);
  const displayLabel = value.length === 0 ? placeholder
    : value.length <= maxDisplay ? value.join(", ")
    : `${value.slice(0, maxDisplay).join(", ")} +${value.length - maxDisplay}`;
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:4, letterSpacing:"0.05em" }}>{label}</div>
      <div onClick={() => !disabled && setOpen(o => !o)} style={{
        background:"#fff", border:`1px solid ${value.length && !disabled ? T.borderAccent : T.border}`,
        borderRadius:10, padding:"10px 12px", cursor:disabled?"not-allowed":"pointer", minWidth:130,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        boxShadow:"0 1px 4px rgba(0,0,0,0.06)", fontSize:13,
        color:disabled?T.textMuted:value.length?T.text:T.textMuted,
        fontWeight:value.length&&!disabled?600:400, opacity:disabled?0.6:1,
        transition:"border-color 0.15s",
      }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"85%" }}>{displayLabel}</span>
        <span style={{ color:T.textMuted, fontSize:10, flexShrink:0 }}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:999,
          background:"#fff", border:`1px solid ${T.border}`, borderRadius:10,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)", minWidth:"100%", width:280,
          maxHeight:320, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${T.border}` }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
              style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:7, padding:"6px 10px",
                fontSize:12, outline:"none", background:"#F2F4F6", color:T.text }} />
          </div>
          {value.length > 0 && (
            <div style={{ padding:"6px 10px", borderBottom:`1px solid ${T.border}`, display:"flex", gap:6, flexWrap:"wrap" }}>
              {value.map(v => (
                <span key={v} onClick={e => { e.stopPropagation(); toggle(v); }}
                  style={{ background:T.navyLight, color:"#fff", borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  {v} ✕
                </span>
              ))}
            </div>
          )}
          <div style={{ overflowY:"auto", flex:1 }}>
            {filtered.length === 0
              ? <div style={{ padding:"12px 14px", color:T.textMuted, fontSize:12 }}>No results</div>
              : filtered.map(opt => {
                  const sel = value.includes(opt);
                  return (
                    <div key={opt} onClick={() => toggle(opt)}
                      style={{ padding:"8px 14px", cursor:"pointer", fontSize:12,
                        display:"flex", alignItems:"center", gap:8,
                        background:sel?T.navyLight:"transparent", color:sel?"#fff":T.text,
                        fontWeight:sel?600:400, transition:"background 0.1s" }}
                      onMouseEnter={e => { if (!sel) e.currentTarget.style.background="#FFFFFF"; }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.background="transparent"; }}>
                      <span style={{ width:14, height:14, borderRadius:4, flexShrink:0,
                        border:`2px solid ${sel?T.navy:T.border}`, background:sel?T.navy:"#fff",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#fff" }}>
                        {sel?"✓":""}
                      </span>
                      {opt}
                    </div>
                  );
                })}
          </div>
          {value.length > 0 && (
            <div style={{ padding:"8px 14px", borderTop:`1px solid ${T.border}` }}>
              <button onClick={() => onChange([])} style={{ background:"none", border:"none", color:T.textMuted, fontSize:11, cursor:"pointer", textDecoration:"underline" }}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ResultCard (same as SearchPage + match_score badge) ────────────────────
function ResultCard({ l, onSelect, active, onHover, selected, onToggleSelect, selUnit, selHouseType }) {
  const [hov, setHov] = useState(false);
  const isHighlighted = active || hov;
  const unitTypes  = (l.unit_types  || "").split(", ").filter(Boolean);
  const houseTypes = (l.house_types || "").split(", ").filter(Boolean);
  return (
    <div id={`dscard-${l.listing_id}`}
      onMouseEnter={() => { setHov(true);  onHover && onHover(l.listing_id); }}
      onMouseLeave={() => { setHov(false); onHover && onHover(null); }}
      onClick={() => onSelect(l)}
      style={{ background: active ? "rgba(201,168,76,0.08)" : "#fff",
        border:`1px solid ${active || hov ? T.borderAccent : T.border}`,
        borderRadius:12, padding:"14px 16px", cursor:"pointer",
        boxShadow: isHighlighted ? "0 4px 16px rgba(201,168,76,0.12)" : "0 1px 4px rgba(0,0,0,0.06)",
        transition:"all 0.15s", display:"flex", flexDirection:"column", gap:8 }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8, minWidth:0, flex:1 }}>
          <span onClick={e => { e.stopPropagation(); onToggleSelect && onToggleSelect(l.listing_id); }}
            style={{ flexShrink:0, marginTop:2, width:15, height:15, borderRadius:4, cursor:"pointer",
              border:`2px solid ${selected?T.navy:T.border}`, background:selected?T.navy:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#fff", transition:"all 0.15s" }}>
            {selected?"✓":""}
          </span>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2, flexWrap:"wrap" }}>
              <div style={{ fontWeight:700, fontSize:14, color:T.text,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {l.property_name}
              </div>
            </div>
            <div style={{ fontSize:11, color:T.textSub, display:"flex", alignItems:"center", gap:5 }}>
              {l.municipality} · {l.province}
              <MapPinPopup lat={l.lat} lng={l.lng} name={l.property_name} mapType="google" />
            </div>
            {l.developer && l.developer !== "nan" && (
              <div style={{ fontSize:10, color:T.textMuted, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:260 }}>
                by <span style={{ fontWeight:600, color:T.textSub }}>{l.developer}</span>
              </div>
            )}
            {l.city_area && (
              <div style={{ fontSize:10, color:T.textMuted, marginTop:2,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:260 }}>
                📍 {l.city_area}
              </div>
            )}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
          {l.is_partial_delisted && (
            <span style={{ background:"#FEF2F2", color:"#6B2A2A", border:"1px solid #FCA5A5",
              borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>
              Partial Sold Out
            </span>
          )}
          {l.esg_grade && l.esg_grade !== "Unknown" && (
            <span style={{ background:ESG_COLORS[l.esg_grade]||"#8A96B4", color:"#fff",
              borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>
              ESG {l.esg_grade}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      {(() => {
        const utCounts     = l.unit_type_counts      || {};
        const prevUtCounts = l.prev_unit_type_counts || {};
        const htCounts     = l.house_type_counts     || {};
        const prevHtCounts = l.prev_house_type_counts|| {};
        const utStats      = l.unit_type_stats       || {};
        let totalCount, activeOnly, ps = null;
        if (selUnit && selUnit.length > 0) {
          activeOnly = selUnit.reduce((s, ut) => s + (utCounts[ut]     || 0), 0);
          const sold = selUnit.reduce((s, ut) => s + (prevUtCounts[ut] || 0), 0);
          totalCount = activeOnly + sold;
          const sel = selUnit.map(ut => utStats[ut]).filter(Boolean);
          if (sel.length === 1) {
            ps = sel[0];
          } else if (sel.length > 1) {
            ps = {
              avg_price: Math.round(sel.reduce((s,r)=>s+(r.avg_price||0),0)/sel.length),
              min_price: Math.min(...sel.map(r=>r.min_price||Infinity)),
              max_price: Math.max(...sel.map(r=>r.max_price||0)),
              avg_pm2:   Math.round(sel.reduce((s,r)=>s+(r.avg_pm2||0),0)/sel.length),
            };
          }
        } else if (selHouseType && selHouseType.length > 0) {
          activeOnly = selHouseType.reduce((s, ht) => s + (htCounts[ht]     || 0), 0);
          const sold = selHouseType.reduce((s, ht) => s + (prevHtCounts[ht] || 0), 0);
          totalCount = activeOnly + sold;
        } else {
          activeOnly = Object.values(utCounts).reduce((s, v) => s + v, 0);
          totalCount = l.units || activeOnly;
          activeOnly = activeOnly || totalCount;
        }
        const avgPrice = ps?.avg_price ?? l.avg_price;
        const minPrice = ps?.min_price ?? l.min_price;
        const maxPrice = ps?.max_price ?? l.max_price;
        const avgPm2   = ps?.avg_pm2   ?? l.avg_price_m2;
        return (
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:"uppercase" }}>Units</div>
              <div style={{ fontSize:15, fontWeight:700, color:T.text }}>{fmtNum(totalCount)}</div>
              <div style={{ fontSize:9, color:"#16a34a", fontWeight:700 }}>{activeOnly} active</div>
            </div>
            <div>
              <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:"uppercase" }}>Avg Price</div>
              <div style={{ fontSize:15, fontWeight:700, color:PRICE_COLOR }}>{fmt(avgPrice)}</div>
            </div>
            <div>
              <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:"uppercase" }}>€/m²</div>
              <div style={{ fontSize:15, fontWeight:700, color:M2_COLOR }}>€{Math.round(avgPm2||0).toLocaleString("en-US")}</div>
            </div>
            <div>
              <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:"uppercase" }}>Range</div>
              <div style={{ fontSize:12, fontWeight:600, color:T.textSub }}>{fmt(minPrice)} – {fmt(maxPrice)}</div>
            </div>
          </div>
        );
      })()}

      {/* Unit type + house type tags */}
      {(unitTypes.length > 0 || houseTypes.length > 0) && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {unitTypes.filter(ut => !selUnit?.length || selUnit.includes(ut)).map(ut => (
            <span key={ut} style={{ background:UNIT_COLORS[ut]||"#8A96B4", color:"#fff",
              borderRadius:4, padding:"2px 7px", fontSize:10, fontWeight:700 }}>{ut}</span>
          ))}
          {houseTypes.filter(ht => !selHouseType?.length || selHouseType.includes(ht)).map(ht => (
            <span key={ht} style={{ background:"rgba(100,100,140,0.10)", color:T.textSub,
              border:`1px solid ${T.border}`, borderRadius:4, padding:"2px 7px", fontSize:10, fontWeight:700 }}>{ht}</span>
          ))}
        </div>
      )}

      {(l.stated_total_units || l.nearest_beach_km) && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:-2 }}>
          {l.stated_total_units && (
            <span style={{ fontSize:10, color:T.textMuted }}>
              📋 <span style={{ fontWeight:600 }}>{fmtNum(l.stated_total_units)}</span> units per description
            </span>
          )}
          {l.nearest_beach_km && (
            <span style={{ fontSize:10, color:"#0077B6", fontWeight:600 }}>
              🏖 {l.nearest_beach_km} km
              {l.nearest_beach_name ? <span style={{ fontWeight:400, color:T.textMuted }}> · {l.nearest_beach_name}</span> : null}
            </span>
          )}
        </div>
      )}

      <div style={{ fontSize:11, color:T.navy, fontWeight:600, marginTop:-4 }}>
        View development →
      </div>
    </div>
  );
}

// ── DelistedSearchCard (sold-out listings) ────────────────────────────────
function DelistedSearchCard({ l, onSelect, onHover }) {
  const [hov, setHov] = useState(false);
  const unitTypes  = (l.unit_types  || "").split(", ").filter(Boolean);
  const houseTypes = (l.house_types || "").split(", ").filter(Boolean);
  return (
    <div id={`dscard-d-${l.listing_id}`}
      onClick={() => onSelect(l)}
      onMouseEnter={() => { setHov(true);  onHover && onHover(`d-${l.listing_id}`); }}
      onMouseLeave={() => { setHov(false); onHover && onHover(null); }}
      style={{ background: hov ? "#FEF2F2" : "#fff",
        border: `2px solid ${hov ? "#6B2A2A" : "#FCA5A5"}`,
        borderRadius: 12, padding: "14px 16px", cursor: "pointer",
        transition: "all 0.15s", boxShadow: hov ? "0 4px 16px rgba(107,42,42,0.12)" : "0 1px 4px rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: hov ? "#6B2A2A" : T.text, marginBottom: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.property_name}</div>
          <div style={{ fontSize: 11, color: T.textSub }}>{l.municipality} · {l.province}</div>
          {l.city_area && (
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {l.city_area}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{ background: "#FEF2F2", color: "#6B2A2A", border: "1px solid #FCA5A5",
            borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>Sold Out</span>
          {l.esg_grade && l.esg_grade !== "Unknown" && (
            <span style={{ background: ESG_COLORS[l.esg_grade] || "#8A96B4", color: "#fff",
              borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>ESG {l.esg_grade}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Units</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{fmtNum(l.units)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Last Avg</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: PRICE_COLOR }}>{fmt(l.avg_price)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>€/m²</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: M2_COLOR }}>€{Math.round(l.avg_price_m2 || 0).toLocaleString("en-US")}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Range</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.textSub }}>{fmt(l.min_price)} – {fmt(l.max_price)}</div>
        </div>
      </div>
      {(unitTypes.length > 0 || houseTypes.length > 0) && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {unitTypes.map(ut => (
            <span key={ut} style={{ background: UNIT_COLORS[ut] || "#8A96B4", color: "#fff",
              borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{ut}</span>
          ))}
          {houseTypes.map(ht => (
            <span key={ht} style={{ background: "rgba(100,100,140,0.10)", color: T.textSub,
              border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{ht}</span>
          ))}
        </div>
      )}
      {l.sold_date && (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sold</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6B2A2A", background: "#FEF2F2",
            border: "1px solid #FCA5A5", borderRadius: 4, padding: "1px 7px" }}>{l.sold_date}</span>
        </div>
      )}
      <div style={{ fontSize: 11, color: hov ? "#6B2A2A" : T.textMuted, fontWeight: 600, marginTop: -4 }}>
        View units →
      </div>
    </div>
  );
}

// ── Persist state across tab switches ─────────────────────────────────────
let _dss = null;

export default function DescriptionSearchPage({ onSelectListing, onSelectDelisted }) {
  const [query,        setQuery]        = useState(_dss?.query        ?? "");
  const [selProvince,  setSelProvince]  = useState(_dss?.selProvince  ?? []);
  const [selMuni,      setSelMuni]      = useState(_dss?.selMuni      ?? []);
  const [selUnit,      setSelUnit]      = useState(_dss?.selUnit      ?? []);
  const [selEsg,       setSelEsg]       = useState(_dss?.selEsg       ?? []);
  const [selHouseType, setSelHouseType] = useState(_dss?.selHouseType ?? []);
  const [minPrice,     setMinPrice]     = useState(_dss?.minPrice     ?? "");
  const [maxPrice,     setMaxPrice]     = useState(_dss?.maxPrice     ?? "");
  const [minM2,        setMinM2]        = useState(_dss?.minM2        ?? "");
  const [maxM2,        setMaxM2]        = useState(_dss?.maxM2        ?? "");
  const [maxBeachKm,   setMaxBeachKm]   = useState(_dss?.maxBeachKm   ?? "");
  const [results,        setResults]        = useState(_dss?.results        ?? []);
  const [total,          setTotal]          = useState(_dss?.total           ?? 0);
  const [hasMore,        setHasMore]        = useState(_dss?.hasMore         ?? false);
  const [isLoadingMore,  setIsLoadingMore]  = useState(false);
  const [delistedResults,setDelistedResults]= useState(_dss?.delistedResults ?? []);
  const [listingStatus,  setListingStatus]  = useState(_dss?.listingStatus  ?? "all");
  const [mapPins,        setMapPins]        = useState(_dss?.mapPins        ?? { active: [], del: [] });
  const [serverUtStats,  setServerUtStats]  = useState(_dss?.serverUtStats  ?? []);
  const [serverHtStats,  setServerHtStats]  = useState(_dss?.serverHtStats  ?? []);
  const [loading,        setLoading]        = useState(false);
  const [searched,       setSearched]       = useState(_dss?.searched       ?? false);
  const [activePin,      setActivePin]      = useState(_dss?.activePin      ?? null);
  const lastHoveredPin    = useRef(_dss?.activePin ?? null);
  const firstResultCenter = useRef(null);
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [opts,         setOpts]         = useState({ municipalities:[], provinces:[] });
  const _filterMountRef  = useRef(true);
  const cardListRef      = useRef(null);
  const sentinelRef      = useRef(null);
  const _loadingMoreRef  = useRef(false);
  const _hasMoreRef      = useRef(_dss?.hasMore ?? false);
  const _resultsLenRef   = useRef((_dss?.results ?? []).length);
  const _pendingScrollId = useRef(null);

  useEffect(() => {
    _hasMoreRef.current    = hasMore;
    _resultsLenRef.current = results.length;
    _dss = { query, selProvince, selMuni, selUnit, selEsg, selHouseType,
             minPrice, maxPrice, minM2, maxM2, maxBeachKm, results, searched, activePin,
             serverUtStats, serverHtStats, delistedResults, listingStatus,
             total, hasMore, mapPins };
  });

  useEffect(() => {
    fetch(`${API}/filters`)
      .then(r => r.json())
      .then(d => setOpts({ municipalities: d.municipalities||[], provinces: d.provinces||[] }))
      .catch(() => {});
  }, []);

  const mapMarkers = useMemo(() => [
    ...mapPins.active.map(l => ({
      id: l.listing_id, lat: l.lat, lng: l.lng,
      label: l.property_name,
      sublabel: `${fmt(l.avg_price)} · ${fmtNum(l.units)} apts`,
      active: l.listing_id === activePin,
      color:  l.listing_id === activePin ? T.navyMid : "#8A96B4",
    })),
    ...mapPins.del.map(l => ({
      id: `d-${l.listing_id}`, lat: l.lat, lng: l.lng,
      label: l.property_name,
      sublabel: `Sold Out · ${fmt(l.avg_price)}`,
      active: activePin === `d-${l.listing_id}`,
      color: activePin === `d-${l.listing_id}` ? "#6B2A2A" : "#FCA5A5",
    })),
  ], [mapPins, activePin]);

  const utStats = useMemo(() => serverUtStats, [serverUtStats]);
  const htStats = useMemo(() => serverHtStats, [serverHtStats]);

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
      count: (results||[]).filter(l => (l.avg_price||0) >= b.min && (l.avg_price||0) < b.max).length,
    })).filter(b => b.count > 0);
  }, [results]);

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
      count: (results||[]).filter(l => (l.avg_price_m2||0) >= b.min && (l.avg_price_m2||0) < b.max).length,
    })).filter(b => b.count > 0);
  }, [results]);

  const buildQs = () => {
    const qs = new URLSearchParams();
    qs.set("q", query.trim());
    selProvince.forEach(p  => qs.append("province",     p));
    selMuni.forEach(m      => qs.append("municipality", m));
    selUnit.forEach(u      => qs.append("unit_type",    u));
    selEsg.forEach(e       => qs.append("esg",          e));
    selHouseType.forEach(h => qs.append("house_type",   h));
    if (minPrice)   qs.set("min_price",    minPrice);
    if (maxPrice)   qs.set("max_price",    maxPrice);
    if (minM2)      qs.set("min_m2",       minM2);
    if (maxM2)      qs.set("max_m2",       maxM2);
    if (maxBeachKm) qs.set("max_beach_km", maxBeachKm);
    return qs;
  };

  const scrollToCardWithLoad = (id, attempts = 0) => {
    if (_pendingScrollId.current !== id) return;
    if (attempts > 50) { _pendingScrollId.current = null; return; }
    const el = document.getElementById(`dscard-${id}`);
    if (el) {
      _pendingScrollId.current = null;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (_hasMoreRef.current && !_loadingMoreRef.current) loadMore();
    setTimeout(() => scrollToCardWithLoad(id, attempts + 1), 200);
  };

  const doSearch = () => {
    if (!query.trim()) return;
    setLoading(true); setResults([]); setTotal(0); setHasMore(false);
    setDelistedResults([]); setSearched(true); setActivePin(null);
    setMapPins({ active: [], del: [] });
    _loadingMoreRef.current = false; _hasMoreRef.current = false; _resultsLenRef.current = 0;
    const qs = buildQs(); qs.set("offset", "0"); qs.set("limit", "50");
    fetch(`${API}/description/search?${qs}`)
      .then(r => r.json())
      .then(d => {
        const lst = d.listings || [];
        const del = d.delisted || [];
        setResults(lst);
        setTotal(d.total ?? lst.length);
        setHasMore(d.has_more ?? false);
        setDelistedResults(del);
        setServerUtStats(d.unit_type_stats  || []);
        setServerHtStats(d.house_type_stats || []);
        setMapPins({
          active: (d.pins || lst.filter(l => l.lat && l.lng)),
          del:    del.filter(l => l.lat && l.lng),
        });
        const first = lst.find(l => l.lat && l.lng && l.lat !== 39.47);
        if (first) {
          setActivePin(first.listing_id);
          lastHoveredPin.current = first.listing_id;
          firstResultCenter.current = { lat: first.lat, lng: first.lng };
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadMore = () => {
    if (_loadingMoreRef.current || !_hasMoreRef.current) return;
    _loadingMoreRef.current = true;
    setIsLoadingMore(true);
    const qs = buildQs(); qs.set("offset", String(_resultsLenRef.current)); qs.set("limit", "50");
    fetch(`${API}/description/search?${qs}`)
      .then(r => r.json())
      .then(d => {
        const newItems = d.listings || [];
        const firstNewId = newItems[0]?.listing_id;
        setResults(prev => {
          const next = [...prev, ...newItems];
          _resultsLenRef.current = next.length;   // keep ref in sync before follow-up fires
          return next;
        });
        setHasMore(d.has_more ?? false);
        _hasMoreRef.current = d.has_more ?? false; // sync ref immediately too
        _loadingMoreRef.current = false;
        setIsLoadingMore(false);
        const newPins = newItems.filter(l => l.lat && l.lng);
        if (newPins.length) setMapPins(prev => ({ ...prev, active: [...prev.active, ...newPins] }));
        if (firstNewId) {
          requestAnimationFrame(() => {
            const el = document.getElementById(`dscard-${firstNewId}`);
            if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
            // after repositioning, fire one follow-up check in case remaining items
            // are fewer than a screenful and the scroll handler won't trigger again
            setTimeout(() => {
              const c = cardListRef.current;
              if (c && _hasMoreRef.current && !_loadingMoreRef.current) {
                if (c.scrollHeight - c.scrollTop - c.clientHeight < 300) loadMore();
              }
            }, 80);
          });
        }
      })
      .catch(() => { _loadingMoreRef.current = false; setIsLoadingMore(false); });
  };

  useEffect(() => {
    const container = cardListRef.current;
    if (!container || !searched) return;
    const onScroll = () => {
      if (!_hasMoreRef.current || _loadingMoreRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 300) loadMore();
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, loading]);

  useEffect(() => {
    if (_filterMountRef.current) { _filterMountRef.current = false; return; }
    if (!searched || !query.trim()) return;
    const t = setTimeout(doSearch, 400);
    return () => clearTimeout(t);
  }, [selProvince, selMuni, selUnit, selEsg, selHouseType, minPrice, maxPrice, minM2, maxM2, maxBeachKm]); // eslint-disable-line

  const clearAll = () => {
    setQuery(""); setResults([]); setTotal(0); setHasMore(false); setIsLoadingMore(false);
    setDelistedResults([]); setSearched(false); setActivePin(null); setListingStatus("all");
    setMapPins({ active: [], del: [] });
    setSelProvince([]); setSelMuni([]); setSelUnit([]); setSelEsg([]); setSelHouseType([]);
    setMinPrice(""); setMaxPrice(""); setMinM2(""); setMaxM2("");
    setSelectedIds(new Set()); _filterMountRef.current = true;
    _loadingMoreRef.current = false; _hasMoreRef.current = false; _resultsLenRef.current = 0;
    _dss = null;
  };

  const hasActiveFilters = selProvince.length + selMuni.length + selUnit.length + selEsg.length + selHouseType.length > 0 || minPrice || maxPrice || minM2 || maxM2 || maxBeachKm;

  return (
    <div style={{ padding:"20px", maxWidth:1700, margin:"0 auto", background:"#F2F4F6", minHeight:"100vh" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Primary search row ── */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", gap:16, alignItems:"flex-end", flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:4, letterSpacing:"0.05em" }}>
              Search by Description
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8,
              background:"#fff", border:`1px solid ${T.border}`,
              borderRadius:10, padding:"0 14px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", minWidth:500 }}>
              <span style={{ fontSize:16, flexShrink:0 }}>🔍</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                placeholder="Type keywords — pool, sea view, gym, terrace, garden, parking…"
                style={{ flex:1, border:"none", outline:"none", fontSize:13, color:T.text,
                  background:"transparent", padding:"10px 0" }}
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); setTotal(0); setHasMore(false); setSearched(false); setMapPins({ active: [], del: [] }); _filterMountRef.current = true; }}
                  style={{ background:"none", border:"none", color:T.textMuted, fontSize:15, cursor:"pointer", padding:"0 2px" }}>✕</button>
              )}
            </div>
          </div>

          <button onClick={doSearch} disabled={!query.trim()}
            style={{ padding:"10px 28px", background:query.trim()?T.navy:"#C5CBE9",
              border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700,
              cursor:query.trim()?"pointer":"not-allowed",
              boxShadow:query.trim()?"0 2px 8px rgba(201,168,76,0.3)":"none",
              height:42, opacity:query.trim()?1:0.7, transition:"all 0.15s" }}>
            Search
          </button>

          {(searched || results) && (
            <button onClick={clearAll}
              style={{ padding:"10px 16px", background:"none", border:`1px solid ${T.border}`,
                borderRadius:10, color:T.textSub, fontSize:12, fontWeight:600, cursor:"pointer", height:42 }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Quick-pick keywords (pre-search) ── */}
      {!searched && (
        <div style={{ marginBottom:12, display:"flex", gap:8, flexWrap:"wrap" }}>
          {["pool","sea view","gym","terrace","garden","parking","beach","panoramic"].map(kw => (
            <button key={kw} onClick={() => { setQuery(kw); setTimeout(doSearch, 50); }}
              style={{ padding:"6px 14px", borderRadius:20, fontSize:11, fontWeight:600,
                background:"#fff", border:`1px solid ${T.border}`, color:T.textSub,
                cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background=T.navy; e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.color=T.textSub; }}>
              {kw}
            </button>
          ))}
        </div>
      )}

      {/* ── Secondary filters (shown after first search) ── */}
      {searched && (
        <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:12,
          padding:"14px 20px", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, flexWrap:"nowrap", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, flexWrap:"nowrap", flex:1, minWidth:0 }}>

            <MultiSelect label="Province"     options={opts.provinces} value={selProvince} onChange={setSelProvince} placeholder="All provinces" maxDisplay={1} />
            <MultiSelect label="Municipality" options={opts.municipalities} value={selMuni} onChange={v => setSelMuni(v.length>1?[v[v.length-1]]:v)} placeholder="All municipalities" maxDisplay={1} />
            <MultiSelect label="House Type" options={["Detached house","Semi-detached house","Terraced house","Apartments"]} value={selHouseType} onChange={setSelHouseType} placeholder="All types" maxDisplay={1} />
            <MultiSelect label="Unit Type" options={ALL_UTS} value={selUnit} onChange={setSelUnit} placeholder="All types" maxDisplay={2} />
            {/* Beach Distance — MultiSelect style */}
            <div style={{ position:"relative" }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:4, letterSpacing:"0.05em" }}>Beach Dist.</div>
              <select value={maxBeachKm} onChange={e => setMaxBeachKm(e.target.value)}
                style={{ appearance:"none", WebkitAppearance:"none",
                  background:"#fff", border:`1px solid ${maxBeachKm ? T.borderAccent : T.border}`,
                  borderRadius:10, padding:"10px 32px 10px 12px", cursor:"pointer", minWidth:130,
                  boxShadow:"0 1px 4px rgba(0,0,0,0.06)", fontSize:13,
                  color: maxBeachKm ? T.text : T.textMuted,
                  fontWeight: maxBeachKm ? 600 : 400,
                  outline:"none", transition:"border-color 0.15s" }}>
                <option value="">Any distance</option>
                {Array.from({length:20}, (_, i) => {
                  const m = (i + 1) * 100;
                  const km = m / 1000;
                  return <option key={m} value={String(km)}>{m < 1000 ? `Within ${m}m` : `Within ${km}km`}</option>;
                })}
              </select>
              <span style={{ position:"absolute", right:12, top:"calc(50% + 9px)", transform:"translateY(-50%)", color:T.textMuted, fontSize:10, pointerEvents:"none" }}>▼</span>
            </div>

            {/* Listing Status */}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em" }}>Listings</div>
              <div style={{ display:"flex", gap:4 }}>
                {[["all","All"],["active","Active"],["sold_out","Sold Out"]].map(([val,lbl]) => {
                  const isAct = listingStatus === val;
                  const isRed = val === "sold_out";
                  const bg    = isRed ? (isAct ? "#DC2626" : "#FEF2F2") : (isAct ? T.navy : "#fff");
                  const color = isRed ? (isAct ? "#fff" : "#6B2A2A") : (isAct ? "#fff" : T.textSub);
                  const border = isRed ? "1px solid #FCA5A5" : `1px solid ${isAct ? T.navy : T.border}`;
                  return (
                    <button key={val} onClick={() => setListingStatus(val)}
                      style={{ padding:"10px 12px", borderRadius:10, fontSize:13, fontWeight:isAct?700:500,
                        cursor:"pointer", background:bg, border, color, transition:"all 0.15s",
                        whiteSpace:"nowrap", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ width:1, alignSelf:"stretch", background:T.border, margin:"2px 0" }} />

            {/* Price range */}
            <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth:160 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:9, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Price Range</span>
                <span style={{ fontSize:10, fontWeight:700, color:PRICE_COLOR }}>
                  {minPrice?`€${Number(minPrice).toLocaleString("en-US")}`:"Any"} – {maxPrice?`€${Number(maxPrice).toLocaleString("en-US")}`:"Any"}
                </span>
              </div>
              <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                {[["<200k",0,200000],["200-400k",200000,400000],["400-700k",400000,700000],[">700k",700000,""]].map(([lbl,mn,mx]) => {
                  const active = String(minPrice)===String(mn) && String(maxPrice)===String(mx);
                  return (
                    <button key={lbl} onClick={() => { setMinPrice(active?"":mn); setMaxPrice(active?"":mx); }}
                      style={{ padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
                        background:active?PRICE_COLOR:"#FFFFFF", border:`1.5px solid ${active?PRICE_COLOR:"transparent"}`,
                        color:active?"#fff":T.textSub }}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <input type="number" placeholder="Min €" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                  style={{ width:80, padding:"4px 7px", borderRadius:7, fontSize:11,
                    border:`1.5px solid ${minPrice?PRICE_COLOR:T.border}`, outline:"none", color:T.text, background:"#F2F4F6" }} />
                <span style={{ color:T.textMuted, fontSize:11 }}>–</span>
                <input type="number" placeholder="Max €" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                  style={{ width:80, padding:"4px 7px", borderRadius:7, fontSize:11,
                    border:`1.5px solid ${maxPrice?PRICE_COLOR:T.border}`, outline:"none", color:T.text, background:"#F2F4F6" }} />
              </div>
            </div>

            <div style={{ width:1, alignSelf:"stretch", background:T.border, margin:"2px 0" }} />

            {/* €/m² range */}
            <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth:150 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:9, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>€/m²</span>
                <span style={{ fontSize:10, fontWeight:700, color:M2_COLOR }}>
                  {minM2?`€${Number(minM2).toLocaleString("en-US")}`:"Any"} – {maxM2?`€${Number(maxM2).toLocaleString("en-US")}`:"Any"}
                </span>
              </div>
              <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                {[["<2k",0,2000],["2-3k",2000,3000],["3-5k",3000,5000],[">5k",5000,""]].map(([lbl,mn,mx]) => {
                  const active = String(minM2)===String(mn) && String(maxM2)===String(mx);
                  return (
                    <button key={lbl} onClick={() => { setMinM2(active?"":mn); setMaxM2(active?"":mx); }}
                      style={{ padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
                        background:active?M2_COLOR:"#FFFFFF", border:`1.5px solid ${active?M2_COLOR:"transparent"}`,
                        color:active?"#fff":T.textSub }}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <input type="number" placeholder="Min" value={minM2} onChange={e => setMinM2(e.target.value)}
                  style={{ width:75, padding:"4px 7px", borderRadius:7, fontSize:11,
                    border:`1.5px solid ${minM2?M2_COLOR:T.border}`, outline:"none", color:T.text, background:"#F2F4F6" }} />
                <span style={{ color:T.textMuted, fontSize:11 }}>–</span>
                <input type="number" placeholder="Max" value={maxM2} onChange={e => setMaxM2(e.target.value)}
                  style={{ width:75, padding:"4px 7px", borderRadius:7, fontSize:11,
                    border:`1.5px solid ${maxM2?M2_COLOR:T.border}`, outline:"none", color:T.text, background:"#F2F4F6" }} />
              </div>
            </div>

            {hasActiveFilters && (
              <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, alignSelf:"center" }}>
                <span style={{ background:T.navyLight, color:"#fff", borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
                  {[selProvince.length,selMuni.length,selUnit.length,selEsg.length,selHouseType.length,minPrice||maxPrice?1:0,minM2||maxM2?1:0,maxBeachKm?1:0].reduce((a,b)=>a+b,0)} active
                </span>
                <button onClick={() => { setSelProvince([]); setSelMuni([]); setSelUnit([]); setSelEsg([]); setSelHouseType([]); setMinPrice(""); setMaxPrice(""); setMinM2(""); setMaxM2(""); setMaxBeachKm(""); }}
                  style={{ background:"none", border:`1.5px solid ${T.border}`, borderRadius:20, color:T.textMuted, fontSize:11, cursor:"pointer", padding:"4px 12px", fontWeight:600, whiteSpace:"nowrap" }}>
                  ✕ Clear
                </button>
              </div>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", alignSelf:"center", flexShrink:0 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>Export</div>
              <button onClick={() => window.open(`${API}/search/export?ids=${[...selectedIds].join(",")}&include_summary=1`, "_blank")}
                style={{ background:T.navy, border:"none", borderRadius:9, padding:"10px 18px",
                  fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer",
                  boxShadow:"0 2px 8px rgba(11,18,57,0.18)", whiteSpace:"nowrap" }}>
                ↓ Excel ({selectedIds.size})
              </button>
            </div>
          )}
          </div>
          {/* ESG Grade — bottom row, extreme left */}
          <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:9, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>ESG Grade</span>
            <div style={{ display:"flex", gap:3 }}>
              {ALL_ESG.map(g => {
                const isActive = selEsg.includes(g);
                const clr = ESG_COLORS[g] || "#999";
                return (
                  <button key={g} onClick={() => setSelEsg(prev => isActive ? prev.filter(x=>x!==g) : [...prev,g])}
                    style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, cursor:"pointer",
                      background:isActive?clr:"#fff", border:`1.5px solid ${isActive?clr:T.border}`,
                      color:isActive?"#fff":T.textSub, transition:"all 0.15s" }}>
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign:"center", padding:40 }}>
          <LoadingHouse message="Searching descriptions…" />
        </div>
      )}

      {/* ── Results ── */}
      {!loading && searched && (
        <>
          {total === 0 && delistedResults.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 20px" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:8 }}>No matches found</div>
              <div style={{ fontSize:13, color:T.textSub }}>Try different keywords, check spelling, or broaden your filters.</div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:20, alignItems:"start" }}>

              {/* ── LEFT: card list ── */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, gap:8, flexWrap:"wrap" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text }}>
                    {listingStatus === "sold_out" ? "Sold Out" : "Developments"}
                    {(() => {
                      const grandTotal = listingStatus === "sold_out" ? delistedResults.length
                                       : listingStatus === "active"   ? total
                                       : total + delistedResults.length;
                      const shown = listingStatus === "sold_out" ? delistedResults.length
                                  : listingStatus === "active"   ? results.length
                                  : results.length + delistedResults.length;
                      const partial = shown < grandTotal;
                      return (
                        <span style={{ color:T.textMuted, fontWeight:400, fontSize:12 }}>
                          {" "}(<span style={{ color: partial ? T.navy : T.textMuted, fontWeight: partial ? 700 : 400 }}>{shown}</span>{partial ? ` of ${grandTotal}` : ""})
                        </span>
                      );
                    })()}
                  </div>
                  {listingStatus !== "sold_out" && (
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => {
                        if (selectedIds.size === results.length) setSelectedIds(new Set());
                        else setSelectedIds(new Set(results.map(l => l.listing_id)));
                      }} style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:6,
                        padding:"3px 9px", fontSize:10, fontWeight:600, color:T.textSub, cursor:"pointer" }}>
                        {selectedIds.size === results.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                  )}
                </div>
                <div ref={cardListRef} style={{ height:"calc(100vh - 260px)", overflowY:"auto", overflowX:"hidden",
                  display:"flex", flexDirection:"column", gap:10,
                  paddingRight:4, scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>
                  {listingStatus !== "sold_out" && results.map(l => (
                    <ResultCard key={l.listing_id} l={l}
                      active={l.listing_id === activePin}
                      selected={selectedIds.has(l.listing_id)}
                      onToggleSelect={id => setSelectedIds(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; })}
                      onSelect={l => onSelectListing(l.listing_id, l.property_name, l.municipality, query)}
                      onHover={id => { setActivePin(id); if (id) lastHoveredPin.current = id; }}
                      selUnit={selUnit}
                      selHouseType={selHouseType}
                    />
                  ))}
                  {listingStatus !== "sold_out" && listingStatus !== "active" && delistedResults.length > 0 && (
                    <div style={{ display:"flex", alignItems:"center", gap:8, margin:"6px 0 2px" }}>
                      <div style={{ flex:1, height:1, background:"#FCA5A5" }} />
                      <span style={{ fontSize:10, fontWeight:700, color:"#6B2A2A",
                        background:"#FEF2F2", border:"1px solid #FCA5A5",
                        borderRadius:5, padding:"2px 8px", whiteSpace:"nowrap" }}>
                        {delistedResults.length} Sold Out
                      </span>
                      <div style={{ flex:1, height:1, background:"#FCA5A5" }} />
                    </div>
                  )}
                  {listingStatus !== "active" && delistedResults.map(l => (
                    <DelistedSearchCard key={`d-${l.listing_id}`} l={l}
                      onSelect={l => onSelectDelisted && onSelectDelisted(l.listing_id)}
                      onHover={id => { setActivePin(id); if (id) lastHoveredPin.current = id; }}
                    />
                  ))}

                  {/* Load-more indicator */}
                  {listingStatus !== "sold_out" && hasMore && (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                      padding:"12px 0", gap:8 }}>
                      {isLoadingMore
                        ? <><div style={{ width:14, height:14, border:`2px solid ${T.border}`,
                            borderTopColor:T.navy, borderRadius:"50%",
                            animation:"spin 0.7s linear infinite" }} />
                          <span style={{ fontSize:11, color:T.textMuted }}>Loading more…</span></>
                        : <span style={{ fontSize:11, color:T.textMuted }}>↓ Scroll for more</span>
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT: maps + charts ── */}
              <div style={{ display:"flex", flexDirection:"column", gap:16, minWidth:0,
                height:"calc(100vh - 200px)", overflowY:"auto",
                scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>

                {/* Summary bar */}
                <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap",
                  background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:8, padding:"7px 14px" }}>
                  {listingStatus !== "sold_out" && (
                    <span style={{ fontSize:12, fontWeight:700, color:T.navy }}>
                      {total} <span style={{ fontWeight:400, color:T.textMuted }}>active</span>
                    </span>
                  )}
                  {listingStatus !== "active" && delistedResults.length > 0 && (
                    <>
                      {listingStatus !== "sold_out" && results.length > 0 && (
                        <span style={{ color:T.border, fontSize:12 }}>·</span>
                      )}
                      <span style={{ fontSize:12, fontWeight:700, color:"#6B2A2A" }}>
                        {delistedResults.length} <span style={{ fontWeight:400, color:"#9B4B4B" }}>sold out</span>
                      </span>
                    </>
                  )}
                  <span style={{ flex:1 }} />
                  <span style={{ fontSize:11, color:T.textMuted }}>
                    {results.reduce((s,l)=>s+(l.units||0),0).toLocaleString("en-US")} units total
                  </span>
                </div>

                {/* Row 1: Leaflet | Google Maps */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

                  {/* Leaflet */}
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8,
                      background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px" }}>
                      <span style={{ fontSize:10, color:T.textMuted, flex:1 }}>📍 {total + delistedResults.length} developments on map</span>
                    </div>
                    <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`,
                      boxShadow:"0 2px 8px rgba(0,0,0,0.07)", height:240 }}>
                      <LeafletMap markers={mapMarkers} height="240px" zoom={7}
                        onMarkerClick={id => {
                          setActivePin(p => p === id ? null : id);
                          _pendingScrollId.current = id;
                          scrollToCardWithLoad(id, 0);
                        }} />
                    </div>
                  </div>

                  {/* Google Maps */}
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8,
                      background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px" }}>
                      <span style={{ fontSize:10, color:T.textMuted, flex:1 }}>
                        📌 {activePin || lastHoveredPin.current ? "Pinned listing" : "Showing first result — hover to change"}
                      </span>
                      <span style={{ fontSize:10, fontWeight:700, color:T.textMuted }}>G Maps</span>
                    </div>
                    <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`,
                      boxShadow:"0 2px 8px rgba(0,0,0,0.07)", height:240 }}>
                      {(() => {
                        const pinId = activePin ?? lastHoveredPin.current;
                        const isDelPin = typeof pinId === "string" && pinId.startsWith("d-");
                        const pinnedListing = pinId
                          ? isDelPin
                            ? (delistedResults||[]).find(r => `d-${r.listing_id}` === pinId)
                            : (results||[]).find(r => r.listing_id === pinId)
                          : null;
                        const isApprox = false;
                        const firstResult = (results||[]).find(l => l.lat && l.lng && l.lat !== 39.47);
                        if (firstResult) firstResultCenter.current = { lat: firstResult.lat, lng: firstResult.lng };
                        const center = (pinnedListing?.lat && pinnedListing.lat !== 39.47)
                          ? { lat: pinnedListing.lat, lng: pinnedListing.lng }
                          : firstResultCenter.current;
                        const gmUrl = center
                          ? `https://maps.google.com/maps?q=${center.lat},${center.lng}&hl=en&z=16&output=embed`
                          : null;
                        return gmUrl ? (
                          <>
                            {isApprox && (
                              <div style={{ textAlign:"center", fontSize:10, color:"#92400E", background:"#FEF3C7",
                                border:"1px solid #FDE68A", borderRadius:6, padding:"3px 8px", marginBottom:6 }}>
                                ⚠ Approximate location
                              </div>
                            )}
                            <iframe key={`${pinId}_${gmUrl}`} src={gmUrl} width="100%" height="240"
                              style={{ border:"none", display:"block" }} title="Google Maps" loading="lazy" />
                          </>
                        ) : (
                          <div style={{ height:240, display:"flex", alignItems:"center", justifyContent:"center", color:T.textMuted, fontSize:12 }}>
                            No location available
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Row 2: Unit Type Summary | House Type Summary */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
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
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.text, fontWeight:600 }}>{fmtNum(row.count)}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.textSub, fontSize:11 }}>{row.avg_size != null ? Math.round(row.avg_size) : "—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.green, fontSize:11 }}>{row.min_price ? fmt(row.min_price) : "—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.navy, fontWeight:700 }}>{row.avg_price ? fmt(row.avg_price) : "—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.red, fontSize:11 }}>{row.max_price ? fmt(row.max_price) : "—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.navyMid, fontWeight:600 }}>{row.avg_pm2 ? `€${Math.round(row.avg_pm2).toLocaleString("en-US")}` : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>

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
                          {htStats.map((row, i) => (
                            <tr key={row.house_type} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgStripe:"#fff" }}>
                              <td style={{ padding:"7px 8px", whiteSpace:"nowrap" }}>
                                <span style={{ background:"rgba(100,100,140,0.10)", color:"#6B7A9F",
                                  border:"1px solid rgba(100,100,140,0.25)", fontWeight:700,
                                  fontSize:11, padding:"2px 8px", borderRadius:4,
                                  display:"block", whiteSpace:"nowrap" }}>{row.house_type}</span>
                              </td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.text, fontWeight:600 }}>{fmtNum(row.count)}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.textSub, fontSize:11 }}>{row.avg_size != null ? Math.round(row.avg_size) : "—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.green, fontSize:11 }}>{row.min_price ? fmt(row.min_price) : "—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.navy, fontWeight:700 }}>{row.avg_price ? fmt(row.avg_price) : "—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.red, fontSize:11 }}>{row.max_price ? fmt(row.max_price) : "—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.navyMid, fontWeight:600 }}>{row.avg_pm2 ? `€${Math.round(row.avg_pm2).toLocaleString("en-US")}` : "—"}</td>
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
                            {priceDist.map((_,i) => <Cell key={i} fill={PRICE_COLOR} fillOpacity={0.35+(i/Math.max(priceDist.length-1,1))*0.65} />)}
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
                            {m2Dist.map((_,i) => <Cell key={i} fill={M2_COLOR} fillOpacity={0.35+(i/Math.max(m2Dist.length-1,1))*0.65} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}
                </div>

              </div>
            </div>
          )}
        </>
      )}

      {/* ── Hero (pre-search) ── */}
      {!searched && (
        <div style={{ textAlign:"center", padding:"64px 20px 48px" }}>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:48, color:T.navy, lineHeight:1.1, marginBottom:16 }}>
            Find by <span style={{ fontStyle:"italic", color:T.navyMid }}>description</span>
          </div>
          <div style={{ fontSize:14, color:T.textSub, maxWidth:480, margin:"0 auto" }}>
            Search across all property descriptions using keywords — pool, sea view, gym, terrace, garden, and more
          </div>
        </div>
      )}
    </div>
  );
}
