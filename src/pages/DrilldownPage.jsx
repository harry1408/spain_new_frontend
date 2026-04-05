import React, { useState, useEffect, useMemo, useRef } from "react";
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,Cell,
         LineChart,Line,Legend } from "recharts";
import { T,StatCard,ChartCard,Tag,Pill,fmt,fmtFull,COLORS,UNIT_COLORS,ESG_COLORS,AddressBreadcrumb,MapPinPopup,PRICE_COLOR,M2_COLOR} from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";
import LoadingHouse from "../components/LoadingHouse.jsx";


// ── tiny helpers ────────────────────────────────────────────────────────
function Metric({ label, value, color, active }) {
  return (
    <div>
      <div style={{ color:active ? "rgba(255,255,255,0.6)" : T.textMuted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600 }}>{label}</div>
      <div style={{ color:active ? "#fff" : (color||T.text), fontWeight:600, fontSize:13, marginTop:1 }}>{value}</div>
    </div>
  );
}

function NoDataNote({ msg }) {
  return (
    <div style={{ height:160, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
      <div style={{ fontSize:22 }}>📅</div>
      <div style={{ color:T.textSub, fontSize:12 }}>{msg}</div>
    </div>
  );
}

// ── municipality selector card ──────────────────────────────────────────
function MuniCard({ m, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:hov ? T.bgHover : T.bgCard,
        border:`1px solid ${hov ? T.borderAccent : T.border}`,
        borderRadius:12, padding:"16px 18px", cursor:"pointer",
        transition:"all 0.15s", boxShadow:hov ? T.shadowMd : T.shadow }}>
      <div style={{ fontWeight:700, fontSize:14, color:hov ? T.navy : T.text, marginBottom:10 }}>{m.municipality}</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px 12px" }}>
        <Metric label="Devel."    value={m.listings||"—"} />
        <Metric label="Apts"      value={m.units} />
        <Metric label="Avg Price" value={fmt(m.avg_price)} color={T.navy} />
        <Metric label="€/m²"      value={m.avg_price_m2 != null ? `€${Math.round(m.avg_price_m2).toLocaleString("en")}` : "—"} color={T.textSub} />
      </div>
      <div style={{ marginTop:8, color:hov ? T.navy : T.textMuted, fontSize:11, fontWeight:600 }}>Explore →</div>
    </div>
  );
}

// ── listing card ────────────────────────────────────────────────────────
function ListingCard({ l, active, onSelect, onHover }) {
  const [hov, setHov] = useState(false);
  const lit = active || hov;
  const esgColor = ESG_COLORS[l.esg_grade] || "#999";
  return (
    <div id={`lcard-${l.listing_id}`}
      onClick={onSelect}
      onMouseEnter={() => { setHov(true); onHover && onHover(l.listing_id); }}
      onMouseLeave={() => { setHov(false); onHover && onHover(null); }}
      style={{ background: active ? T.navyLight : hov ? T.bgHover : T.bgCard,
        border:`2px solid ${active ? T.borderAccent : hov ? T.borderAccent : T.border}`,
        borderRadius:12, padding:"16px 18px", cursor:"pointer",
        transition:"all 0.15s", boxShadow:lit ? T.shadowMd : T.shadow }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:active ? "#fff" : T.text }}>{l.property_name}</div>
          <div style={{ color:active ? "rgba(255,255,255,0.75)" : T.textSub, fontSize:11, marginTop:2, display:"flex", alignItems:"center", gap:5 }}>
            {l.developer}
            <MapPinPopup lat={l.lat} lng={l.lng} name={l.property_name} />
          </div>
        </div>
        {l.esg_grade && l.esg_grade !== "nan" && (
          active
            ? <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:700,
                background:"rgba(255,255,255,0.18)", color:"#fff", border:"1px solid rgba(255,255,255,0.35)" }}>
                ESG {l.esg_grade}
              </span>
            : <Tag label={`ESG ${l.esg_grade}`} color={esgColor}/>
        )}
      </div>
      <AddressBreadcrumb cityArea={l.city_area} municipality={l.municipality} style={{ marginBottom:10 }} />
      {(l.unit_types || l.house_types || l.is_tourist) && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
          {l.unit_types && l.unit_types.split(", ").filter(Boolean).map(ut => (
            <span key={ut} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, fontWeight:700,
              background: active ? "rgba(255,255,255,0.18)" : `${UNIT_COLORS[ut]||"#aaa"}20`,
              color:      active ? "#fff"                    : UNIT_COLORS[ut]||"#aaa",
              border:     active ? "1px solid rgba(255,255,255,0.35)" : `1px solid ${UNIT_COLORS[ut]||"#aaa"}55`,
            }}>{ut}</span>
          ))}
          {l.house_types && l.house_types.split(", ").filter(Boolean).map(ht => (
            <span key={ht} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, fontWeight:700,
              background: active ? "rgba(255,255,255,0.12)" : "rgba(100,100,140,0.10)",
              color:      active ? "rgba(255,255,255,0.85)" : T.textSub,
              border:     active ? "1px solid rgba(255,255,255,0.25)" : `1px solid ${T.border}`,
            }}>{ht}</span>
          ))}
          {l.is_tourist && (
            <span style={{ fontSize:10, padding:"2px 7px", borderRadius:4, fontWeight:700,
              background: active ? "rgba(230,120,0,0.25)" : "#FFF3E0",
              color:      active ? "#FFD580" : "#E07800",
              border:     active ? "1px solid rgba(230,120,0,0.5)" : "1px solid #F5A623",
            }}>Tourist Apt</span>
          )}
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"7px 10px", marginBottom:10 }}>
        <Metric label="Apts"     value={l.units}               active={active} />
        <Metric label="Avg"      value={fmt(l.avg_price)}      color={T.navy}    active={active} />
        <Metric label="€/m²"     value={l.avg_price_m2 != null ? `€${Math.round(l.avg_price_m2).toLocaleString("en")}` : "—"}  color={T.textSub} active={active} />
        <Metric label="From"     value={fmt(l.min_price)}      color={T.green}   active={active} />
        <Metric label="To"       value={fmt(l.max_price)}      color={T.red}     active={active} />
        <Metric label="Avg Size" value={`${Math.round(l.avg_size)}m²`}                       active={active} />
      </div>
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        <Pill on={l.has_pool} label="Pool"/><Pill on={l.has_parking} label="Parking"/>
        <Pill on={l.has_terrace} label="Terrace"/><Pill on={l.has_lift} label="Lift"/>
      </div>
      {(l.stated_total_units || l.nearest_beach_km) && (
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:4 }}>
          {l.stated_total_units && (
            <span style={{ fontSize:10, color: active ? "rgba(255,255,255,0.55)" : T.textMuted }}>
              📋 <span style={{ fontWeight:600 }}>{l.stated_total_units}</span> apts per description
            </span>
          )}
          {l.nearest_beach_km && (
            <span style={{ fontSize:10, fontWeight:600,
              color: active ? "rgba(120,210,255,0.9)" : "#0077B6" }}>
              🏖 {l.nearest_beach_km} km
              {l.nearest_beach_name && <span style={{ fontWeight:400, color: active ? "rgba(255,255,255,0.5)" : T.textMuted }}> · {l.nearest_beach_name}</span>}
            </span>
          )}
        </div>
      )}
      <div style={{ marginTop:8, color:active ? "rgba(255,255,255,0.8)" : T.textMuted, fontSize:11, fontWeight:600 }}>View apartments →</div>
    </div>
  );
}

// ── Price toggle hook + button ────────────────────────────────────────────
function usePriceToggle() {
  const [showM2, setShowM2] = React.useState(false);
  return [showM2, setShowM2];
}
function ToggleBtn({ showM2, onToggle }) {
  return (
    <div onClick={e=>{e.stopPropagation();onToggle();}}
      style={{ display:"inline-flex", borderRadius:20, border:`1px solid ${T.border}`,
        overflow:"hidden", cursor:"pointer", fontSize:10, fontWeight:700, userSelect:"none", flexShrink:0 }}>
      <span style={{ padding:"3px 10px", background:!showM2?PRICE_COLOR:"transparent", color:!showM2?"#fff":T.textMuted, transition:"all 0.2s" }}>Price</span>
      <span style={{ padding:"3px 10px", background:showM2?M2_COLOR:"transparent", color:showM2?"#fff":T.textMuted, transition:"all 0.2s" }}>€/m²</span>
    </div>
  );
}
function PriceDistChart({ data, m2data, height=160 }) {
  const [showM2, setShowM2] = usePriceToggle();
  const safe = showM2
    ? (m2data||[]).map(d=>({ ...d, count: Number(d.count)||0 }))
    : (data||[]).map(d=>({ ...d, count: Number(d.count)||0 }));
  const yFmt = v => v;
  const label = showM2 ? "Units (by €/m²)" : "Units (by price)";
  const ttFmt = v => `${v} units`;
  const maxVal = safe.length ? Math.max(...safe.map(d=>d.count||0)) : 1;
  return (
    <ChartCard title="Price Distribution">
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:-28, marginBottom:8 }}>
        <ToggleBtn showM2={showM2} onToggle={()=>setShowM2(v=>!v)}/>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={safe} barSize={22}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
          <XAxis dataKey="bin" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false}/>
          <YAxis tickFormatter={yFmt} tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false}
            domain={[0, Math.ceil(maxVal * 1.15)]}/>
          <Tooltip formatter={v=>[ttFmt(v), label]} contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }}/>
          <Bar dataKey="count" name={label} radius={[4,4,0,0]} isAnimationActive={false}>
            {safe.map((_,i)=><Cell key={i} fill={showM2?M2_COLOR:COLORS[i%COLORS.length]}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── histogram helper ─────────────────────────────────────────────────────
function makeBins(values, numBins = 8, fmt1000 = true) {
  const vals = values.filter(v => v != null && isFinite(v));
  if (!vals.length) return [];
  const mn = Math.min(...vals), mx = Math.max(...vals);
  if (mn === mx) return [{ bin: fmt1000 ? `€${Math.round(mn/1000)}K` : `€${Math.round(mn).toLocaleString()}`, count: vals.length }];
  const step = (mx - mn) / numBins;
  return Array.from({ length: numBins }, (_, i) => {
    const lo = mn + i * step, hi = mn + (i + 1) * step;
    const count = vals.filter(v => v >= lo && (i === numBins - 1 ? v <= hi : v < hi)).length;
    const label = fmt1000 ? `€${Math.round(lo/1000)}K` : `€${Math.round(lo).toLocaleString()}`;
    return { bin: label, count };
  }).filter(b => b.count > 0);
}

// ── main component ───────────────────────────────────────────────────────
// ── Type-search multi-select ──────────────────────────────────────────────
function TypeSearchMultiSelect({ label, options, value, onChange, width=200, navigateOnSelect=false, onSelect }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef(null);
  React.useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const hasVal = value.length > 0;

  const handleSelect = (opt) => {
    if (navigateOnSelect && onSelect) {
      onSelect(opt);
      setOpen(false);
      setQuery("");
    } else {
      onChange(value.includes(opt) ? value.filter(v=>v!==opt) : [...value, opt]);
    }
  };

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ background:"#fff", border:`1px solid ${hasVal ? T.borderAccent : T.border}`,
          borderRadius:8, padding:"6px 10px", cursor:"pointer",
          display:"flex", alignItems:"center", gap:6, minWidth:width, boxShadow:T.shadow }}>
        <span style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase", fontWeight:600, whiteSpace:"nowrap" }}>{label}</span>
        {hasVal
          ? <span style={{ background:T.navy, color:"#fff", borderRadius:4, fontSize:10, fontWeight:700, padding:"1px 6px" }}>{value.length}</span>
          : <span style={{ color:T.textSub, fontSize:12, flex:1 }}>{ navigateOnSelect ? "Type to search…" : "All" }</span>}
        <span style={{ color:T.textMuted, fontSize:10, marginLeft:"auto" }}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:200,
          background:"#fff", border:`1px solid ${T.border}`, borderRadius:10,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)", minWidth:Math.max(width, 240), overflow:"hidden" }}>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${T.border}` }}>
            <input autoFocus value={query} onChange={e=>setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              onClick={e=>e.stopPropagation()}
              style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:6,
                padding:"6px 10px", fontSize:12, outline:"none", color:T.text,
                background:T.bgStripe, boxSizing:"border-box" }}/>
          </div>
          {!navigateOnSelect && value.length>0 && (
            <div style={{ padding:"6px 10px", borderBottom:`1px solid ${T.border}`,
              display:"flex", flexWrap:"wrap", gap:4 }}>
              {value.map(v=>(
                <span key={v} onClick={e=>{e.stopPropagation();onChange(value.filter(x=>x!==v));}}
                  style={{ background:T.navyLight, border:`1px solid ${T.borderAccent}`,
                    color:"#fff", fontSize:10, fontWeight:700, padding:"2px 6px",
                    borderRadius:4, cursor:"pointer" }}>
                  {v} ×
                </span>
              ))}
              <span onClick={e=>{e.stopPropagation();onChange([]);setQuery("");}}
                style={{ color:"#6B2A2A", fontSize:10, cursor:"pointer", alignSelf:"center" }}>Clear all</span>
            </div>
          )}
          <div style={{ maxHeight:240, overflowY:"auto" }}>
            {filtered.length===0
              ? <div style={{ padding:"12px", color:T.textMuted, fontSize:12, textAlign:"center" }}>No matches</div>
              : filtered.map(opt=>{
                  const sel = !navigateOnSelect && value.includes(opt);
                  return (
                    <div key={opt} onClick={e=>{e.stopPropagation();handleSelect(opt);}}
                      style={{ padding:"8px 12px", cursor:"pointer", fontSize:12,
                        background:sel?T.navyLight:"transparent", color:sel?"#fff":T.text,
                        borderLeft:`3px solid ${sel?T.navy:"transparent"}`,
                        display:"flex", alignItems:"center", gap:8,
                        transition:"background 0.1s" }}
                      onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background=T.bgStripe; }}
                      onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background="transparent"; }}>
                      {!navigateOnSelect && (
                        <span style={{ width:14, height:14, borderRadius:3, flexShrink:0,
                          border:`2px solid ${sel?T.navy:T.border}`, background:sel?T.navy:"transparent",
                          display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                          {sel&&<span style={{ color:"#fff", fontSize:8, fontWeight:900 }}>✓</span>}
                        </span>
                      )}
                      {navigateOnSelect && <span style={{ color:T.textMuted, fontSize:11 }}>→</span>}
                      {opt}
                    </div>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DrilldownPage({ municipality, onSelectMunicipality, onSelectListing, onBackToSearch }) {
  const [muniList,    setMuniList]    = useState([]);
  const [filters,     setFilters]     = useState({ provinces:[], province_munis:{}, house_types:[] });
  const [selProvince, setSelProvince] = useState([]);
  const [selMuni,     setSelMuni]     = useState([]);
  const [selHouseType,setSelHouseType]= useState([]);
  const [sortBy,      setSortBy]      = useState("units");
  const [muniData,    setMuniData]    = useState(null);
  const [mapListings, setMapListings] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [activePin,      setActivePin]      = useState(null);
  const [unitFilter,     setUnitFilter]     = useState([]);
  const M2_MIN = 0, M2_MAX = 8000;
  const [m2Range,        setM2Range]        = useState([0, 8000]);
  // Secondary filters
  const [fSelUnit,       setFSelUnit]       = useState([]);
  const [fSelHouseType,  setFSelHouseType]  = useState([]);
  const [fSelEsg,        setFSelEsg]        = useState([]);
  const [fMinPrice,      setFMinPrice]      = useState("");
  const [fMaxPrice,      setFMaxPrice]      = useState("");
  const [fMinM2,         setFMinM2]         = useState("");
  const [fMaxM2,         setFMaxM2]         = useState("");

  // Filters (once)
  useEffect(() => {
    fetch(`${API}/filters`).then(r=>r.json()).then(f => setFilters({
      provinces: f.provinces||[], province_munis: f.province_munis||{}, house_types: f.house_types||[]
    })).catch(()=>{});
  }, []);

  // Municipality overview — re-fetch when house type filter changes
  useEffect(() => {
    const qs = new URLSearchParams();
    selHouseType.forEach(h => qs.append("house_type", h));
    fetch(`${API}/charts/municipality-overview?${qs}`).then(r=>r.json()).then(setMuniList).catch(()=>{});
  }, [selHouseType]);

  // Municipality detail
  useEffect(() => {
    if (!municipality) { setMuniData(null); setMapListings([]); return; }
    setLoading(true); setActivePin(null);
    Promise.all([
      fetch(`${API}/drilldown/municipality/${encodeURIComponent(municipality)}`).then(r=>r.json()),
      fetch(`${API}/map/listings?municipality=${encodeURIComponent(municipality)}`).then(r=>r.json()),
    ]).then(([dd, ml]) => { setMuniData(dd); setMapListings(ml); setLoading(false); })
      .catch(() => setLoading(false));
  }, [municipality]);

  // ── All hooks MUST be before any early return ───────────────────────────
  // mapMarkers = all markers (unfiltered) — used to build filteredMapMarkers after filteredListings is ready
  const _allMapMarkers = useMemo(() => mapListings
    .filter(l => l.lat && l.lng && !(Math.abs(l.lat - 39.47) < 0.001 && Math.abs(l.lng + 0.38) < 0.001))
    .map(l => ({
      id:       l.listing_id,
      lat:      l.lat, lng: l.lng,
      label:    l.property_name,
      sublabel: `${fmt(l.avg_price)} · ${l.units} apts`,
      active:   false,
      color:    T.navyMid,
    })), [mapListings]);

  const _listings    = muniData?.listings    || [];
  const _htStats     = muniData?.house_type_stats || [];
  const allUnitTypes  = useMemo(() => ["Studio","1BR","2BR","3BR","4BR","5BR","Penthouse"], []);
  const allHouseTypes = useMemo(() => [...new Set(_htStats.map(r=>r.house_type).filter(Boolean))], [_htStats]);
  const allEsgGrades  = useMemo(() => [...new Set(_listings.map(l=>l.esg_grade).filter(Boolean))].sort(), [_listings]);
  const filteredListings = useMemo(() => _listings.filter(l => {
    if (unitFilter.length && !unitFilter.some(ut => l.unit_types?.includes(ut))) return false;
    if (fSelUnit.length && !fSelUnit.some(ut => l.unit_types?.includes(ut))) return false;
    if (fSelHouseType.length && !fSelHouseType.some(ht => l.house_types?.includes(ht))) return false;
    if (fSelEsg.length && !fSelEsg.includes(l.esg_grade)) return false;
    if (fMinPrice && l.avg_price < Number(fMinPrice)*1000) return false;
    if (fMaxPrice && l.avg_price > Number(fMaxPrice)*1000) return false;
    if (fMinM2 && l.avg_price_m2 && l.avg_price_m2 < Number(fMinM2)) return false;
    if (fMaxM2 && l.avg_price_m2 && l.avg_price_m2 > Number(fMaxM2)) return false;
    return true;
  }), [_listings, unitFilter, fSelUnit, fSelHouseType, fSelEsg, fMinPrice, fMaxPrice, fMinM2, fMaxM2]);

  const filteredIds = useMemo(() => new Set(filteredListings.map(l => l.listing_id)), [filteredListings]);
  const mapMarkers = useMemo(() =>
    _allMapMarkers
      .filter(m => filteredIds.has(m.id))
      .map(m => ({ ...m, active: m.id === activePin })),
  [_allMapMarkers, filteredIds, activePin]);

  // ── Stats derived from filteredListings (drive whole right panel) ────────
  const filteredStats = useMemo(() => {
    if (!filteredListings.length) return null;
    const prices = filteredListings.map(l => l.avg_price).filter(Boolean);
    const m2s    = filteredListings.map(l => l.avg_price_m2).filter(Boolean);
    return {
      total_listings: filteredListings.length,
      total_units:    filteredListings.reduce((s, l) => s + (l.units || 0), 0),
      avg_price:      prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
      avg_price_m2:   m2s.length   ? m2s.reduce((a, b) => a + b, 0)   / m2s.length   : null,
      price_range:    prices.length ? [Math.min(...prices), Math.max(...prices)] : [null, null],
    };
  }, [filteredListings]);

  const filteredPriceDist = useMemo(() =>
    makeBins(filteredListings.map(l => l.avg_price)), [filteredListings]);

  const filteredM2Dist = useMemo(() =>
    makeBins(filteredListings.map(l => l.avg_price_m2), 8, false), [filteredListings]);

  const filteredUnitStats = useMemo(() => {
    if (!muniData?.unit_type_mix) return [];
    const presentTypes = new Set(
      filteredListings.flatMap(l => (l.unit_types||"").split(", ").filter(Boolean))
    );
    const base = muniData.unit_type_stats || muniData.unit_type_mix || [];
    return base.filter(r => presentTypes.has(r.unit_type));
  }, [filteredListings, muniData]);

  const filteredHouseStats = useMemo(() => {
    if (!muniData?.house_type_stats) return [];
    const presentTypes = new Set(
      filteredListings.flatMap(l => (l.house_types||"").split(", ").filter(Boolean))
    );
    return muniData.house_type_stats.filter(r => presentTypes.has(r.house_type));
  }, [filteredListings, muniData]);

  // ── Municipality selector view ────────────────────────────────────────
  if (!municipality) {
    const provinceFiltered = selProvince.length
      ? muniList.filter(m => selProvince.some(c => (filters.province_munis[c]||[]).includes(m.municipality)))
      : muniList;

    // muniSel filters the cards grid; if none selected show all
    const displayList = selMuni.length
      ? provinceFiltered.filter(m => selMuni.includes(m.municipality))
      : provinceFiltered;
    const sorted = [...displayList].sort((a,b) => (b[sortBy]||0)-(a[sortBy]||0));
    const muniOptions = provinceFiltered.map(m => m.municipality).sort();

    return (
      <div style={{ padding:"20px 20px", maxWidth:1700, margin:"0 auto" }}>
        <div style={{ marginBottom:22, display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <h2 style={{ margin:0, fontFamily:"'Inter',sans-serif", fontSize:28, color:T.text, fontWeight:400 }}>
              Select a <span style={{ color:T.navy }}>Municipality</span>
            </h2>
            <p style={{ color:T.textSub, fontSize:13, margin:"6px 0 0" }}>
              {sorted.length} {sorted.length!==1?"municipalities":"municipality"} shown
              {selMuni.length>0 && <span style={{ color:T.navy }}> · {selMuni.length} selected</span>}
            </p>
          </div>
          {onBackToSearch && (
            <button onClick={onBackToSearch}
              style={{ display:"flex", alignItems:"center", gap:6, background:"#fff",
                border:`1px solid ${T.border}`, borderRadius:9, padding:"8px 16px",
                fontSize:12, fontWeight:700, color:T.navy, cursor:"pointer",
                boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              ← Back to Search
            </button>
          )}
        </div>

        {/* Filters row */}
        <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
          <TypeSearchMultiSelect
            label="Province"
            options={filters.provinces}
            value={selProvince}
            width={160}
            onChange={v => { setSelProvince(v); setSelMuni([]); }}
          />
          <TypeSearchMultiSelect
            label="Municipality"
            options={muniOptions}
            value={selMuni}
            width={240}
            onChange={v => setSelMuni(v)}
          />
          <TypeSearchMultiSelect
            label="House Type"
            options={filters.house_types}
            value={selHouseType}
            width={180}
            onChange={v => setSelHouseType(v)}
          />
          {(selProvince.length > 0 || selMuni.length > 0 || selHouseType.length > 0) && (
            <button onClick={() => { setSelProvince([]); setSelMuni([]); setSelHouseType([]); }}
              style={{ background:"#FEF2F2", border:"1px solid rgba(220,38,38,0.3)", color:"#6B2A2A",
                padding:"6px 12px", borderRadius:7, cursor:"pointer", fontSize:11 }}>✕ Clear filters</button>
          )}
          {(selProvince.length > 0 || selMuni.length > 0 || selHouseType.length > 0) && (() => {
            const params = new URLSearchParams();
            selProvince.forEach(p => params.append("provinces", p));
            sorted.forEach(m => params.append("municipalities", m.municipality));
            return (
              <button
                onClick={() => window.open(`${API}/export/by-filter?${params.toString()}`, "_blank")}
                style={{ background:T.navy, border:"none", color:"#fff",
                  padding:"6px 14px", borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700 }}>
                ↓ Excel ({sorted.length} developments)
              </button>
            );
          })()}
          <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
            <span style={{ color:T.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", alignSelf:"center" }}>Sort</span>
            {[["units","Units"],["listings","Devel."],["avg_price","Avg Price"],["avg_price_m2","€/m²"]].map(([s,lbl])=>(
              <button key={s} onClick={()=>setSortBy(s)} style={{
                background:sortBy===s?T.navyLight:"#fff", border:`1px solid ${sortBy===s?T.borderAccent:T.border}`,
                color:sortBy===s?"#fff":T.textSub, padding:"6px 12px", borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:600 }}>{lbl}</button>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px,1fr))", gap:12 }}>
          {sorted.map(m => <MuniCard key={m.municipality} m={m} onClick={()=>onSelectMunicipality(m.municipality)} />)}
        </div>
      </div>
    );
  }

  // ── Municipality detail view ──────────────────────────────────────────
  if (loading) return <div style={{ padding:60, textAlign:"center" }}><LoadingHouse message={`Loading ${municipality || ""}…`} /></div>;
  if (!muniData?.stats) return <div style={{ padding:60, textAlign:"center", color:T.textSub }}>No data.</div>;

  const { stats, listings, unit_type_mix, price_dist, m2_dist, trend } = muniData;

  const sortedListings = [...filteredListings].sort((a,b) => b.avg_price - a.avg_price);

  const hasFilter = fSelUnit.length||fSelHouseType.length||fSelEsg.length||fMinPrice||fMaxPrice||fMinM2||fMaxM2;
  const clearFilters = () => { setFSelUnit([]); setFSelHouseType([]); setFSelEsg([]); setFMinPrice(""); setFMaxPrice(""); setFMinM2(""); setFMaxM2(""); };

  const ALL_UTS = ["Studio","1BR","2BR","3BR","4BR","5BR","Penthouse"];

  return (
    <div style={{ padding:"20px 20px", maxWidth:1700, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'Inter',sans-serif", fontSize:28, color:T.text, fontWeight:400 }}>
            <em style={{ color:T.navy }}>{municipality}</em>
          </h2>
          <div style={{ color:T.textSub, fontSize:12, marginTop:4 }}>
            {stats.total_listings} developments · {stats.total_units} apartments
          </div>
        </div>
        <button onClick={()=>onSelectMunicipality(null)} style={{
          background:"#fff", border:`1px solid ${T.border}`, color:T.textSub,
          padding:"8px 16px", borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:600, boxShadow:T.shadow }}>
          ← All Municipalities
        </button>
      </div>

      {/* KPIs — driven by filteredStats when filters active */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        {((_s => [
          <StatCard key="dev"   label="Developments"     value={_s.total_listings} accent={T.text} />,
          <StatCard key="apts"  label="Total Apartments" value={_s.total_units?.toLocaleString()} />,
          <StatCard key="avg"   label="Avg Price"        value={fmt(_s.avg_price)} />,
          <StatCard key="m2"    label="Avg €/m²"         value={_s.avg_price_m2 != null ? `€${Math.round(_s.avg_price_m2).toLocaleString("en")}` : "—"} accent={T.navyMid} />,
          <StatCard key="range" label="Price Range"      value={`${fmt(_s.price_range?.[0])} – ${fmt(_s.price_range?.[1])}`} accent={T.textSub} />,
        ]))(filteredStats || stats)}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display:"flex", gap:10, alignItems:"flex-end", marginBottom:16, flexWrap:"nowrap",
        background:"#fff", border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 16px",
        boxShadow:T.shadow }}>
        <TypeSearchMultiSelect label="Unit Type"   options={allUnitTypes}  value={fSelUnit}      onChange={setFSelUnit} width={150} />
        <TypeSearchMultiSelect label="House Type"  options={allHouseTypes} value={fSelHouseType} onChange={setFSelHouseType} width={150} />
        <TypeSearchMultiSelect label="ESG"         options={allEsgGrades}  value={fSelEsg}       onChange={setFSelEsg} width={100} />
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:4, letterSpacing:"0.05em" }}>Price (€K)</div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <input value={fMinPrice} onChange={e=>setFMinPrice(e.target.value)} placeholder="Min"
              style={{ width:70, border:`1px solid ${fMinPrice?T.borderAccent:T.border}`, borderRadius:8, padding:"9px 8px", fontSize:12, outline:"none", background:"#fff" }} />
            <span style={{ color:T.textMuted, fontSize:11 }}>–</span>
            <input value={fMaxPrice} onChange={e=>setFMaxPrice(e.target.value)} placeholder="Max"
              style={{ width:70, border:`1px solid ${fMaxPrice?T.borderAccent:T.border}`, borderRadius:8, padding:"9px 8px", fontSize:12, outline:"none", background:"#fff" }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:4, letterSpacing:"0.05em" }}>€/m²</div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <input value={fMinM2} onChange={e=>setFMinM2(e.target.value)} placeholder="Min"
              style={{ width:70, border:`1px solid ${fMinM2?T.borderAccent:T.border}`, borderRadius:8, padding:"9px 8px", fontSize:12, outline:"none", background:"#fff" }} />
            <span style={{ color:T.textMuted, fontSize:11 }}>–</span>
            <input value={fMaxM2} onChange={e=>setFMaxM2(e.target.value)} placeholder="Max"
              style={{ width:70, border:`1px solid ${fMaxM2?T.borderAccent:T.border}`, borderRadius:8, padding:"9px 8px", fontSize:12, outline:"none", background:"#fff" }} />
          </div>
        </div>
        {hasFilter && (
          <button onClick={clearFilters} style={{ background:"#FEF2F2", border:"1px solid rgba(192,57,43,0.4)",
            color:"#6B2A2A", padding:"9px 12px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:600, whiteSpace:"nowrap", alignSelf:"flex-end" }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── TWO-COLUMN BODY ── */}
      <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:20, alignItems:"start" }}>

        {/* ── LEFT: Developments with vertical scroll ── */}
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, gap:8 }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text }}>
              Developments <span style={{ color:T.textMuted, fontWeight:400, fontSize:12 }}>({sortedListings.length})</span>
            </div>
          </div>
          {/* Unit type filter */}
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
            {ALL_UTS.map(ut=>(
              <button key={ut} onClick={()=>setUnitFilter(prev=>prev.includes(ut)?prev.filter(x=>x!==ut):[...prev,ut])}
                style={{ background:unitFilter.includes(ut)?UNIT_COLORS[ut]||"#aaa":"#fff",
                  border:`1px solid ${unitFilter.includes(ut)?UNIT_COLORS[ut]||"#aaa":T.border}`,
                  color:unitFilter.includes(ut)?"#fff":T.textSub,
                  padding:"3px 8px", borderRadius:5, cursor:"pointer", fontSize:10, fontWeight:700 }}>{ut}</button>
            ))}
          </div>

          {/* Scrollable card list */}
          <div style={{ height:"calc(100vh - 280px)", overflowY:"auto", overflowX:"hidden",
            display:"flex", flexDirection:"column", gap:10,
            paddingRight:4,
            scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>
            {sortedListings.map(l => (
              <ListingCard key={l.listing_id} l={l}
                active={l.listing_id === activePin}
                onSelect={() => onSelectListing(l.listing_id, l.property_name, municipality)}
                onHover={id => setActivePin(id)}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: 3-row scrollable panel matching search page ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:14, minWidth:0,
          height:"calc(100vh - 200px)", overflowY:"auto",
          scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>

          {/* Row 1: Leaflet | Google Maps */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ minWidth:0 }}>
              <LeafletMap
                markers={mapMarkers}
                onMarkerClick={id => {
                  const newId = id === activePin ? null : id;
                  setActivePin(newId);
                  if (newId) {
                    setTimeout(() => {
                      document.getElementById(`lcard-${newId}`)?.scrollIntoView({ behavior:"smooth", block:"nearest" });
                    }, 50);
                  }
                }}
                height="280px"
              />
            </div>
            <div style={{ minWidth:0 }}>
              {(() => {
                const pinTarget = mapMarkers.find(m => m.active)
                  || mapMarkers.find(m => m.id === sortedListings[0]?.listing_id)
                  || mapMarkers[0];
                if (!pinTarget) return <div style={{ height:280, borderRadius:12, background:T.bgStripe, border:`1px solid ${T.border}` }}/>;
                return (
                  <div style={{ position:"relative", width:"100%", height:280, borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}` }}>
                    <iframe
                      key={`${pinTarget.lat},${pinTarget.lng}`}
                      title="gmap"
                      src={`https://maps.google.com/maps?q=${pinTarget.lat},${pinTarget.lng}&hl=en&z=15&output=embed`}
                      width="100%" height="100%"
                      style={{ border:0, display:"block" }}
                      allowFullScreen="" loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <a href={`https://www.google.com/maps?q=${pinTarget.lat},${pinTarget.lng}`}
                      target="_blank" rel="noreferrer"
                      style={{ position:"absolute", bottom:6, right:6, background:"rgba(255,255,255,0.92)",
                        borderRadius:4, fontSize:10, fontWeight:600, color:"#2D3F8F",
                        padding:"2px 7px", textDecoration:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", zIndex:10 }}>
                      Open in Maps ↗
                    </a>
                  </div>
                );
              })()}
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
                      {["Type","Units","Avg m²","Min","Avg","Max","€/m²"].map(h=>(
                        <th key={h} style={{ padding:"7px 8px", textAlign:h==="Type"?"left":"right",
                          color:T.textMuted, fontSize:10, textTransform:"uppercase",
                          letterSpacing:"0.07em", fontWeight:600, background:T.bgStripe }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnitStats.map((row,i)=>{
                      const uc = UNIT_COLORS[row.unit_type]||COLORS[i%COLORS.length];
                      return (
                        <tr key={row.unit_type} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgStripe:"#fff" }}>
                          <td style={{ padding:"7px 8px" }}>
                            <span style={{ background:uc, color:"#fff", fontWeight:700, fontSize:11,
                              padding:"2px 8px", borderRadius:4, display:"block", whiteSpace:"nowrap" }}>{row.unit_type}</span>
                          </td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.text, fontWeight:600 }}>{row.count}</td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.textSub, fontSize:11 }}>{row.avg_size!=null?Math.round(row.avg_size):"—"}</td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.green, fontSize:11 }}>{row.min_price!=null?`€${Math.round(row.min_price).toLocaleString()}`:"—"}</td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.navy, fontWeight:700 }}>{row.avg_price!=null?`€${Math.round(row.avg_price).toLocaleString()}`:"—"}</td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.red, fontSize:11 }}>{row.max_price!=null?`€${Math.round(row.max_price).toLocaleString()}`:"—"}</td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.navyMid, fontWeight:600 }}>{row.avg_pm2!=null?`€${Math.round(row.avg_pm2).toLocaleString("en")}`:"—"}</td>
                        </tr>
                      );
                    })}
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
                      {["Type","Units","Avg m²","Min","Avg","Max","€/m²"].map(h=>(
                        <th key={h} style={{ padding:"7px 8px", textAlign:h==="Type"?"left":"right",
                          color:T.textMuted, fontSize:10, textTransform:"uppercase",
                          letterSpacing:"0.07em", fontWeight:600, background:T.bgStripe }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHouseStats.map((row,i)=>(
                      <tr key={row.house_type} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgStripe:"#fff" }}>
                        <td style={{ padding:"7px 8px", whiteSpace:"nowrap" }}>
                          <span style={{ background:"rgba(100,100,140,0.10)", color:"#6B7A9F",
                            border:"1px solid rgba(100,100,140,0.25)", fontWeight:700,
                            fontSize:11, padding:"2px 8px", borderRadius:4,
                            display:"block", whiteSpace:"nowrap" }}>{row.house_type}</span>
                        </td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.text, fontWeight:600 }}>{row.count}</td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.textSub, fontSize:11 }}>{row.avg_size!=null?Math.round(row.avg_size):"—"}</td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.green, fontSize:11 }}>{row.min_price!=null?`€${Math.round(row.min_price).toLocaleString()}`:"—"}</td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.navy, fontWeight:700 }}>{row.avg_price!=null?`€${Math.round(row.avg_price).toLocaleString()}`:"—"}</td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.red, fontSize:11 }}>{row.max_price!=null?`€${Math.round(row.max_price).toLocaleString()}`:"—"}</td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.navyMid, fontWeight:600 }}>{row.avg_pm2!=null?`€${Math.round(row.avg_pm2).toLocaleString("en")}`:"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          {/* Row 3: Price Distribution | €/m² Distribution */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <ChartCard title="Price Distribution">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={filteredPriceDist} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="bin" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v=>[`${v} developments`,"Count"]}
                    contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }} />
                  <Bar dataKey="count" radius={[4,4,0,0]} isAnimationActive={false}>
                    {filteredPriceDist.map((_,i)=><Cell key={i} fill="#0B1239" fillOpacity={0.35+(i/Math.max(filteredPriceDist.length-1,1))*0.65}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="€/m² Distribution">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={filteredM2Dist} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="bin" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v=>[`${v} developments`,"Count"]}
                    contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }} />
                  <Bar dataKey="count" radius={[4,4,0,0]} isAnimationActive={false}>
                    {filteredM2Dist.map((_,i)=><Cell key={i} fill="#4A5A8A" fillOpacity={0.35+(i/Math.max(filteredM2Dist.length-1,1))*0.65}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

        </div>{/* end right */}
      </div>{/* end two-col */}
    </div>
  );
}
