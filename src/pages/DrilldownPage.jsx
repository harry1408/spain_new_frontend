import React, { useState, useEffect, useMemo, useRef } from "react";
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,Cell,
         LineChart,Line,Legend } from "recharts";
import { T,StatCard,ChartCard,Tag,Pill,fmt,fmtFull,fmtNum,COLORS,UNIT_COLORS,ESG_COLORS,AddressBreadcrumb,MapPinPopup,PRICE_COLOR,M2_COLOR,Skeleton,SkeletonStatCard,SkeletonChartCard} from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";


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

// ── municipality skeleton card ──────────────────────────────────────────
function SkeletonMuniCard() {
  return (
    <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12,
      padding:"16px 18px", boxShadow:T.shadow }}>
      <Skeleton w={140} h={14} r={4} style={{ marginBottom:14 }} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 12px", marginBottom:12 }}>
        {[1,2,3,4].map(i => (
          <div key={i}>
            <Skeleton w={40} h={9} r={3} style={{ marginBottom:5 }} />
            <Skeleton w={i%2===0?60:50} h={13} r={3} />
          </div>
        ))}
      </div>
      <Skeleton w={70} h={10} r={3} />
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
        <Metric label="Units"     value={fmtNum(m.units)} />
        <Metric label="Avg Price" value={fmt(m.avg_price)} color={T.navy} />
        <Metric label="€/m²"      value={m.avg_price_m2 != null ? `€${Math.round(m.avg_price_m2).toLocaleString("en-US")}` : "—"} color={T.textSub} />
      </div>
      <div style={{ marginTop:8, color:hov ? T.navy : T.textMuted, fontSize:11, fontWeight:600 }}>Explore →</div>
    </div>
  );
}

// ── listing card ────────────────────────────────────────────────────────
function ListingCard({ l, active, onSelect, onHover, selUnit, selHouseType }) {
  const [hov, setHov] = useState(false);
  const lit = active || hov;
  const esgColor = ESG_COLORS[l.esg_grade] || "#999";
  return (
    <div id={`lcard-${l.listing_id}`}
      onClick={onSelect}
      onMouseEnter={() => { setHov(true); onHover && onHover(l.listing_id); }}
      onMouseLeave={() => { setHov(false); }}
      style={{ background: active ? T.navyLight : hov ? T.bgHover : T.bgCard,
        border:`2px solid ${active ? T.borderAccent : hov ? T.borderAccent : T.border}`,
        borderRadius:12, padding:"16px 18px", cursor:"pointer",
        transition:"all 0.15s", boxShadow:lit ? T.shadowMd : T.shadow }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:2 }}>
            <div style={{ fontWeight:700, fontSize:14, color:active ? "#fff" : T.text }}>{l.property_name}</div>
          </div>
          <div style={{ color:active ? "rgba(255,255,255,0.75)" : T.textSub, fontSize:11, display:"flex", alignItems:"center", gap:5 }}>
            {l.developer}
            <MapPinPopup lat={l.lat} lng={l.lng} name={l.property_name} />
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          {l.is_partial_delisted && (
            <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:700,
              background:"#FEF2F2", color:"#6B2A2A", border:"1px solid #FCA5A5", whiteSpace:"nowrap" }}>
              Partial Sold Out
            </span>
          )}
          {l.esg_grade && l.esg_grade !== "nan" && (
            active
              ? <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:700,
                  background:"rgba(255,255,255,0.18)", color:"#fff", border:"1px solid rgba(255,255,255,0.35)" }}>
                  ESG {l.esg_grade}
                </span>
              : <Tag label={`ESG ${l.esg_grade}`} color={esgColor}/>
          )}
        </div>
      </div>
      <AddressBreadcrumb cityArea={l.city_area} municipality={l.municipality} style={{ marginBottom:10 }} />
      {(l.unit_types || l.house_types || l.is_tourist) && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
          {l.unit_types && l.unit_types.split(", ").filter(Boolean)
            .filter(ut => !selUnit?.length || selUnit.includes(ut))
            .map(ut => (
            <span key={ut} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, fontWeight:700,
              background: active ? "rgba(255,255,255,0.18)" : `${UNIT_COLORS[ut]||"#aaa"}20`,
              color:      active ? "#fff"                    : UNIT_COLORS[ut]||"#aaa",
              border:     active ? "1px solid rgba(255,255,255,0.35)" : `1px solid ${UNIT_COLORS[ut]||"#aaa"}55`,
            }}>{ut}</span>
          ))}
          {l.house_types && l.house_types.split(", ").filter(Boolean)
            .filter(ht => !selHouseType?.length || selHouseType.includes(ht))
            .map(ht => (
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
      {(() => {
        const utCounts     = l.unit_type_counts      || {};
        const prevUtCounts = l.prev_unit_type_counts  || {};
        const htCounts     = l.house_type_counts      || {};
        const prevHtCounts = l.prev_house_type_counts || {};
        const utStats      = l.unit_type_stats        || {};
        let totalCount, activeOnly, ps = null;
        if (selUnit && selUnit.length > 0) {
          activeOnly  = selUnit.reduce((s, ut) => s + (utCounts[ut] || 0), 0);
          totalCount  = activeOnly;
          const sel = selUnit.map(ut => utStats[ut]).filter(Boolean);
          if (sel.length === 1) {
            ps = sel[0];
          } else if (sel.length > 1) {
            ps = {
              avg_price: Math.round(sel.reduce((s,r)=>s+(r.avg_price||0),0)/sel.length),
              min_price: Math.min(...sel.map(r=>r.min_price||Infinity)),
              max_price: Math.max(...sel.map(r=>r.max_price||0)),
              avg_pm2:   Math.round(sel.reduce((s,r)=>s+(r.avg_pm2||0),0)/sel.length),
              avg_size:  Math.round(sel.reduce((s,r)=>s+(r.avg_size||0),0)/sel.length),
            };
          }
        } else if (selHouseType && selHouseType.length > 0) {
          activeOnly = selHouseType.reduce((s, ht) => s + (htCounts[ht] || 0), 0);
          totalCount = activeOnly;
        } else {
          activeOnly = Object.values(utCounts).reduce((s, v) => s + v, 0);
          totalCount = l.total_units_ever || activeOnly || l.units;
        }
        const avgPrice = ps?.avg_price ?? l.avg_price;
        const minPrice = ps?.min_price ?? l.min_price;
        const maxPrice = ps?.max_price ?? l.max_price;
        const avgPm2   = ps?.avg_pm2   ?? l.avg_price_m2;
        const avgSize  = ps?.avg_size  ?? l.avg_size;
        return (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"7px 10px", marginBottom:10 }}>
            <div>
              <div style={{ color:active ? "rgba(255,255,255,0.6)" : T.textMuted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600 }}>Units</div>
              <div style={{ color:active ? "#fff" : T.text, fontWeight:600, fontSize:13, marginTop:1 }}>{fmtNum(totalCount)}</div>
              <div style={{ fontSize:9, color: active ? "#86efac" : "#16a34a", fontWeight:700 }}>{activeOnly} active</div>
            </div>
            <Metric label="Avg"      value={fmt(avgPrice)}     color={T.navy}    active={active} />
            <Metric label="€/m²"     value={avgPm2 != null ? `€${Math.round(avgPm2).toLocaleString("en-US")}` : "—"} color={T.textSub} active={active} />
            <Metric label="From"     value={fmt(minPrice)}     color={T.green}   active={active} />
            <Metric label="To"       value={fmt(maxPrice)}     color={T.red}     active={active} />
            <Metric label="Avg Size" value={avgSize != null ? `${Math.round(avgSize)}m²` : "—"} active={active} />
          </div>
        );
      })()}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        <Pill on={l.has_pool} label="Pool"/><Pill on={l.has_parking} label="Parking"/>
        <Pill on={l.has_terrace} label="Terrace"/><Pill on={l.has_lift} label="Lift"/>
      </div>
      {(l.stated_total_units || l.nearest_beach_km) && (
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:4 }}>
          {l.stated_total_units && (
            <span style={{ fontSize:10, color: active ? "rgba(255,255,255,0.55)" : T.textMuted }}>
              📋 <span style={{ fontWeight:600 }}>{fmtNum(l.stated_total_units)}</span> units per description
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
      <div style={{ marginTop:8, color:active ? "rgba(255,255,255,0.8)" : T.textMuted, fontSize:11, fontWeight:600 }}>View units →</div>
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
  if (mn === mx) return [{ bin: fmt1000 ? `€${Math.round(mn/1000)}K` : `€${Math.round(mn).toLocaleString("en-US")}`, count: vals.length }];
  const step = (mx - mn) / numBins;
  return Array.from({ length: numBins }, (_, i) => {
    const lo = mn + i * step, hi = mn + (i + 1) * step;
    const count = vals.filter(v => v >= lo && (i === numBins - 1 ? v <= hi : v < hi)).length;
    const label = fmt1000 ? `€${Math.round(lo/1000)}K` : `€${Math.round(lo).toLocaleString("en-US")}`;
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

export default function DrilldownPage({ municipality, onSelectMunicipality, onSelectListing, onSelectDelisted, onBackToSearch }) {
  const [muniList,    setMuniList]    = useState([]);
  const [muniListLoading, setMuniListLoading] = useState(true);
  const [filters,     setFilters]     = useState({ provinces:[], province_munis:{}, house_types:[], new_this_month_ids:[] });
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
  const [fNewThisMonth,  setFNewThisMonth]  = useState(false);

  // Filters (once)
  useEffect(() => {
    fetch(`${API}/filters`).then(r=>r.json()).then(f => setFilters({
      provinces: f.provinces||[], province_munis: f.province_munis||{}, house_types: f.house_types||[], new_this_month_ids: f.new_this_month_ids||[]
    })).catch(()=>{});
  }, []);

  // Municipality overview — re-fetch when house type filter changes
  useEffect(() => {
    const qs = new URLSearchParams();
    selHouseType.forEach(h => qs.append("house_type", h));
    setMuniListLoading(true);
    fetch(`${API}/charts/municipality-overview?${qs}`).then(r=>r.json()).then(d => { setMuniList(d); setMuniListLoading(false); }).catch(()=>setMuniListLoading(false));
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
      sublabel: `${fmt(l.avg_price)} · ${fmtNum(l.units)} apts`,
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
    if (fNewThisMonth && !filters.new_this_month_ids.includes(l.listing_id)) return false;
    return true;
  }), [_listings, unitFilter, fSelUnit, fSelHouseType, fSelEsg, fMinPrice, fMaxPrice, fMinM2, fMaxM2, fNewThisMonth, filters.new_this_month_ids]);

  const filteredIds = useMemo(() => new Set(filteredListings.map(l => l.listing_id)), [filteredListings]);
  const mapMarkers = useMemo(() =>
    _allMapMarkers
      .filter(m => filteredIds.has(m.id))
      .map(m => ({ ...m, active: m.id === activePin })),
  [_allMapMarkers, filteredIds, activePin]);

  // ── Stats derived from filteredListings (drive whole right panel) ────────
  const filteredStats = useMemo(() => {
    const anyFilterActive = fSelUnit.length || fSelHouseType.length || fSelEsg.length ||
      fMinPrice || fMaxPrice || fMinM2 || fMaxM2 || fNewThisMonth || unitFilter.length;
    if (!filteredListings.length) {
      // When a filter is active but no listings match, show zeros so KPIs reflect the filter
      if (anyFilterActive) return { total_listings: 0, total_units: 0, avg_price: null, avg_price_m2: null, price_range: [null, null] };
      return null;
    }
    const utPriceMap = Object.fromEntries((muniData?.unit_type_stats||[]).map(r => [r.unit_type, r]));
    const htPriceMap = Object.fromEntries((muniData?.house_type_stats||[]).map(r => [r.house_type, r]));

    let total_units = 0;
    let priceOverride = null;

    if (fSelUnit.length > 0) {
      // Count only selected unit types (active only)
      filteredListings.forEach(l => {
        const utCounts = l.unit_type_counts || {};
        fSelUnit.forEach(ut => { total_units += (utCounts[ut] || 0); });
      });
      const selStats = fSelUnit.map(ut => utPriceMap[ut]).filter(Boolean);
      if (selStats.length) {
        priceOverride = {
          avg_price:    Math.round(selStats.reduce((s,r)=>s+(r.avg_price||0),0)/selStats.length),
          avg_price_m2: Math.round(selStats.reduce((s,r)=>s+(r.avg_pm2||0),0)/selStats.length),
          price_range:  [Math.min(...selStats.map(r=>r.min_price||Infinity)), Math.max(...selStats.map(r=>r.max_price||0))],
        };
      }
    } else if (fSelHouseType.length > 0) {
      // Count only selected house types (active only)
      filteredListings.forEach(l => {
        const htCounts = l.house_type_counts || {};
        fSelHouseType.forEach(ht => { total_units += (htCounts[ht] || 0); });
      });
      const selStats = fSelHouseType.map(ht => htPriceMap[ht]).filter(Boolean);
      if (selStats.length) {
        priceOverride = {
          avg_price:    Math.round(selStats.reduce((s,r)=>s+(r.avg_price||0),0)/selStats.length),
          avg_price_m2: Math.round(selStats.reduce((s,r)=>s+(r.avg_pm2||0),0)/selStats.length),
          price_range:  [Math.min(...selStats.map(r=>r.min_price||Infinity)), Math.max(...selStats.map(r=>r.max_price||0))],
        };
      }
    } else {
      filteredListings.forEach(l => {
        const active = Object.values(l.unit_type_counts||{}).reduce((a,v)=>a+v,0);
        total_units += active || l.active_units || 0;
      });
    }

    const prices = filteredListings.map(l => l.avg_price).filter(Boolean);
    const m2s    = filteredListings.map(l => l.avg_price_m2).filter(Boolean);
    return {
      total_listings: filteredListings.length,
      total_units,
      avg_price:    priceOverride?.avg_price    ?? (prices.length ? Math.round(prices.reduce((a,b)=>a+b,0)/prices.length) : null),
      avg_price_m2: priceOverride?.avg_price_m2 ?? (m2s.length   ? m2s.reduce((a,b)=>a+b,0)/m2s.length                   : null),
      price_range:  priceOverride?.price_range  ?? (prices.length ? [Math.min(...prices), Math.max(...prices)]            : [null, null]),
    };
  }, [filteredListings, fSelUnit, fSelHouseType, muniData]);

  const filteredPriceDist = useMemo(() =>
    makeBins(filteredListings.map(l => l.avg_price)), [filteredListings]);

  const filteredM2Dist = useMemo(() =>
    makeBins(filteredListings.map(l => l.avg_price_m2), 8, false), [filteredListings]);

  const filteredUnitStats = useMemo(() => {
    const UT_ORDER = ["Studio","1BR","2BR","3BR","4BR","5BR","Penthouse"];
    const activeHtFilter = fSelHouseType.length > 0;
    // Compute total (active + sold) counts per unit type from filtered listings
    const counts = {};
    filteredListings.forEach(l => {
      if (activeHtFilter) {
        // Use cross-reference: only count active unit types belonging to the selected house types
        fSelHouseType.forEach(ht => {
          const xref = (l.house_type_unit_counts || {})[ht] || {};
          Object.keys(xref).forEach(ut => {
            if (xref[ut] > 0) counts[ut] = (counts[ut] || 0) + xref[ut];
          });
        });
        return;
      }
      const utCounts = l.unit_type_counts || {};
      const hasCountData = Object.keys(utCounts).length > 0;
      if (hasCountData) {
        Object.keys(utCounts).forEach(ut => {
          if (utCounts[ut] > 0) counts[ut] = (counts[ut] || 0) + utCounts[ut];
        });
      } else {
        const types = (l.unit_types || "").split(", ").filter(Boolean);
        const isNonApartment = (l.house_types || "").split(", ").filter(Boolean).every(ht => ht !== "Apartments");
        if (!isNonApartment || types.length === 0) return;
        const share = Math.round((l.units || 1) / Math.max(types.length, 1));
        types.forEach(ut => { counts[ut] = (counts[ut] || 0) + share; });
      }
    });
    const anyFilterActive = fSelUnit.length || fSelHouseType.length || fSelEsg.length ||
      fMinPrice || fMaxPrice || fMinM2 || fMaxM2 || fNewThisMonth || unitFilter.length;
    if (Object.keys(counts).length === 0) return anyFilterActive ? [] : (muniData?.unit_type_stats || []);
    // helper: pick first source that has a non-null avg_price
    const pickUT = (...srcs) => srcs.find(s => s?.avg_price != null) || srcs.find(Boolean) || {};
    // Active price map (server, latest period)
    const priceMap     = Object.fromEntries((muniData?.unit_type_stats      || []).map(r => [r.unit_type, r]));
    // Municipality-level historical price map (truly-removed sub-listings)
    const prevMuniMap  = Object.fromEntries((muniData?.prev_unit_type_stats || []).map(r => [r.unit_type, r]));
    // Per-listing prev_unit_type_stats aggregated locally
    const prevPriceAcc = {};
    filteredListings.forEach(l => {
      const prevStats = l.prev_unit_type_stats || {};
      Object.entries(prevStats).forEach(([ut, s]) => {
        if (!prevPriceAcc[ut]) prevPriceAcc[ut] = { prices: [], pm2s: [], sizes: [] };
        if (s.avg_price) prevPriceAcc[ut].prices.push(s.avg_price);
        if (s.avg_pm2)   prevPriceAcc[ut].pm2s.push(s.avg_pm2);
        if (s.avg_size)  prevPriceAcc[ut].sizes.push(s.avg_size);
        if (s.min_price != null) prevPriceAcc[ut].min_price = prevPriceAcc[ut].min_price == null ? s.min_price : Math.min(prevPriceAcc[ut].min_price, s.min_price);
        if (s.max_price != null) prevPriceAcc[ut].max_price = prevPriceAcc[ut].max_price == null ? s.max_price : Math.max(prevPriceAcc[ut].max_price, s.max_price);
      });
    });
    const prevListingMap = Object.fromEntries(Object.entries(prevPriceAcc).map(([ut, a]) => [ut, {
      avg_price: a.prices.length ? Math.round(a.prices.reduce((s,v)=>s+v,0)/a.prices.length) : null,
      min_price: a.min_price ?? null, max_price: a.max_price ?? null,
      avg_pm2:   a.pm2s.length  ? Math.round(a.pm2s.reduce((s,v)=>s+v,0)/a.pm2s.length)   : null,
      avg_size:  a.sizes.length ? Math.round(a.sizes.reduce((s,v)=>s+v,0)/a.sizes.length)  : null,
    }]));
    const rows = Object.keys(counts).map(ut => {
      const ps = pickUT(priceMap[ut], prevMuniMap[ut], prevListingMap[ut]);
      return {
        unit_type: ut, count: counts[ut],
        avg_price: ps.avg_price ?? null, min_price: ps.min_price ?? null,
        max_price: ps.max_price ?? null, avg_pm2: ps.avg_pm2 ?? null, avg_size: ps.avg_size ?? null,
      };
    });
    return rows.sort((a,b) => UT_ORDER.indexOf(a.unit_type) - UT_ORDER.indexOf(b.unit_type));
  }, [filteredListings, muniData, fSelUnit, fSelHouseType, fSelEsg, fMinPrice, fMaxPrice, fMinM2, fMaxM2, fNewThisMonth, unitFilter]);

  const filteredHouseStats = useMemo(() => {
    const groups = {};
    const activeUnitFilter = fSelUnit.length > 0 || unitFilter.length > 0;
    const effectiveUnitFilter = fSelUnit.length > 0 ? fSelUnit : unitFilter;
    filteredListings.forEach(l => {
      const htCounts   = l.house_type_counts || {};
      const utCounts   = l.unit_type_counts  || {};
      const houseTypes = (l.house_types || "").split(", ").filter(Boolean);
      const allHt = [...new Set([
        ...Object.keys(htCounts).filter(h => htCounts[h] > 0),
        ...houseTypes,
      ])];
      allHt.forEach(ht => {
        // When unit type filter active, use cross-reference for accurate per-house-type unit count
        let count;
        if (activeUnitFilter) {
          const xref = (l.house_type_unit_counts || {})[ht] || {};
          count = effectiveUnitFilter.reduce((s, ut) => s + (xref[ut] || 0), 0);
        } else {
          count = (htCounts[ht] || 0) || (houseTypes.includes(ht) ? 1 : 0);
        }
        if (!count) return;
        if (!groups[ht]) groups[ht] = { count: 0, prices: [], pm2s: [], sizes: [] };
        groups[ht].count += count;
        if (l.avg_price)    groups[ht].prices.push(l.avg_price);
        if (l.avg_price_m2) groups[ht].pm2s.push(l.avg_price_m2);
        if (l.avg_size)     groups[ht].sizes.push(l.avg_size);
      });
    });
    const anyFilterActive = fSelUnit.length || fSelHouseType.length || fSelEsg.length ||
      fMinPrice || fMaxPrice || fMinM2 || fMaxM2 || fNewThisMonth || unitFilter.length;
    if (Object.keys(groups).length === 0) return anyFilterActive ? [] : (muniData?.house_type_stats || []);
    const pickHT = (...srcs) => srcs.find(s => s?.avg_price != null) || srcs.find(Boolean) || {};
    const priceMap     = Object.fromEntries((muniData?.house_type_stats      || []).map(r => [r.house_type, r]));
    const prevPriceMap = Object.fromEntries((muniData?.prev_house_type_stats || []).map(r => [r.house_type, r]));
    return Object.entries(groups).map(([ht, g]) => {
      const ps = pickHT(priceMap[ht], prevPriceMap[ht]);
      return {
        house_type: ht, count: g.count,
        avg_price: ps.avg_price ?? null, min_price: ps.min_price ?? null,
        max_price: ps.max_price ?? null, avg_pm2: ps.avg_pm2 ?? null,
        avg_size:  ps.avg_size ?? (g.sizes.length ? Math.round(g.sizes.reduce((a,b)=>a+b,0)/g.sizes.length) : null),
      };
    }).sort((a,b) => b.count - a.count);
  }, [filteredListings, muniData, fSelUnit, fSelHouseType, fSelEsg, fMinPrice, fMaxPrice, fMinM2, fMaxM2, fNewThisMonth, unitFilter]);

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
                ↓ Excel ({sorted.reduce((s, m) => s + (m.listings || 0), 0)} developments)
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
          {muniListLoading
            ? Array.from({length:20}).map((_,i) => <SkeletonMuniCard key={i} />)
            : sorted.map(m => <MuniCard key={m.municipality} m={m} onClick={()=>onSelectMunicipality(m.municipality)} />)
          }
        </div>
      </div>
    );
  }

  // ── Municipality detail view ──────────────────────────────────────────
  if (loading) return (
    <div style={{ padding:"20px 20px", maxWidth:1700, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <Skeleton w={220} h={28} r={6} />
          <Skeleton w={180} h={12} r={4} />
        </div>
        <Skeleton w={140} h={36} r={9} />
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        {["New This Month","Developments","Total Units","Avg Price","Avg €/m²","Price Range"].map(lbl => (
          <StatCard key={lbl} label={lbl} loading={true} />
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:16 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {Array.from({length:6}).map((_,i) => (
            <div key={i} style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 18px", boxShadow:T.shadow }}>
              <Skeleton w={160} h={14} r={4} style={{ marginBottom:10 }} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 12px" }}>
                {[1,2,3,4].map(j => <Skeleton key={j} w="100%" h={32} r={4} />)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {["Unit Type Mix","House Type Mix","Price Trend","Price Distribution","€/m² Distribution","Delivery Timeline"].map(t => (
            <ChartCard key={t} title={t} loading loadingH={200} />
          ))}
        </div>
      </div>
    </div>
  );
  if (!muniData?.stats) return <div style={{ padding:60, textAlign:"center", color:T.textSub }}>No data.</div>;

  const { stats, listings, unit_type_mix, price_dist, m2_dist, trend } = muniData;

  const sortedListings = [...filteredListings].sort((a,b) => b.avg_price - a.avg_price);

  const hasFilter = fSelUnit.length||fSelHouseType.length||fSelEsg.length||fMinPrice||fMaxPrice||fMinM2||fMaxM2||fNewThisMonth;
  const clearFilters = () => { setFSelUnit([]); setFSelHouseType([]); setFSelEsg([]); setFMinPrice(""); setFMaxPrice(""); setFMinM2(""); setFMaxM2(""); setFNewThisMonth(false); };

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
            {fmtNum(stats.total_listings)} developments · {fmtNum(stats.total_units)} units
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
          stats.new_this_month > 0 && <StatCard key="new"  label="New This Month"   value={fmtNum(stats.new_this_month)} accent="#16a34a" />,
          <StatCard key="dev"   label="Developments"     value={fmtNum(_s.total_listings)} accent={T.text} />,
          <StatCard key="apts"  label="Total Units" value={fmtNum(_s.total_units)} />,
          <StatCard key="avg"   label="Avg Price"        value={fmt(_s.avg_price)} />,
          <StatCard key="m2"    label="Avg €/m²"         value={_s.avg_price_m2 != null ? `€${Math.round(_s.avg_price_m2).toLocaleString("en-US")}` : "—"} accent={T.navyMid} />,
          <StatCard key="range" label="Price Range"      value={`${fmt(_s.price_range?.[0])} – ${fmt(_s.price_range?.[1])}`} accent={T.textSub} />,
        ].filter(Boolean)))(filteredStats || stats)}
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
        <div style={{ alignSelf:"flex-end" }}>
          <button onClick={() => setFNewThisMonth(v => !v)} style={{
            background: fNewThisMonth ? T.navy : "#fff",
            border: `1px solid ${fNewThisMonth ? T.navy : T.border}`,
            color: fNewThisMonth ? "#fff" : T.textSub,
            padding:"9px 12px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:600, whiteSpace:"nowrap",
          }}>
            🆕 New This Month
          </button>
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
              Developments <span style={{ color:T.textMuted, fontWeight:400, fontSize:12 }}>({fmtNum(sortedListings.length)})</span>
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
                selUnit={fSelUnit}
                selHouseType={fSelHouseType}
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
                    {filteredUnitStats.filter(row => fSelUnit.length === 0 || fSelUnit.includes(row.unit_type)).map((row,i)=>{
                      const uc = UNIT_COLORS[row.unit_type]||COLORS[i%COLORS.length];
                      return (
                        <tr key={row.unit_type} style={{ borderBottom:`1px solid ${T.border}`, background: i%2===0?T.bgStripe:"#fff" }}>
                          <td style={{ padding:"7px 8px" }}>
                              <span style={{ background:uc, color:"#fff", fontWeight:700, fontSize:11,
                                padding:"2px 8px", borderRadius:4, whiteSpace:"nowrap" }}>{row.unit_type}</span>
                          </td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.text, fontWeight:600 }}>{fmtNum(row.count)}</td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.textSub, fontSize:11 }}>{row.avg_size!=null?Math.round(row.avg_size):"—"}</td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.green, fontSize:11 }}>{row.min_price!=null?`€${Math.round(row.min_price).toLocaleString("en-US")}`:"—"}</td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.navy, fontWeight:700 }}>{row.avg_price!=null?`€${Math.round(row.avg_price).toLocaleString("en-US")}`:"—"}</td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.red, fontSize:11 }}>{row.max_price!=null?`€${Math.round(row.max_price).toLocaleString("en-US")}`:"—"}</td>
                          <td style={{ padding:"7px 8px", textAlign:"right", color:T.navyMid, fontWeight:600 }}>{row.avg_pm2!=null?`€${Math.round(row.avg_pm2).toLocaleString("en-US")}`:"—"}</td>
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
                    {filteredHouseStats.filter(row => fSelHouseType.length === 0 || fSelHouseType.includes(row.house_type)).map((row,i)=>(
                      <tr key={row.house_type} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgStripe:"#fff" }}>
                        <td style={{ padding:"7px 8px", whiteSpace:"nowrap" }}>
                          <span style={{ background:"rgba(100,100,140,0.10)", color:"#6B7A9F",
                            border:"1px solid rgba(100,100,140,0.25)", fontWeight:700,
                            fontSize:11, padding:"2px 8px", borderRadius:4,
                            display:"block", whiteSpace:"nowrap" }}>{row.house_type}</span>
                        </td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.text, fontWeight:600 }}>{fmtNum(row.count)}</td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.textSub, fontSize:11 }}>{row.avg_size!=null?Math.round(row.avg_size):"—"}</td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.green, fontSize:11 }}>{row.min_price!=null?`€${Math.round(row.min_price).toLocaleString("en-US")}`:"—"}</td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.navy, fontWeight:700 }}>{row.avg_price!=null?`€${Math.round(row.avg_price).toLocaleString("en-US")}`:"—"}</td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.red, fontSize:11 }}>{row.max_price!=null?`€${Math.round(row.max_price).toLocaleString("en-US")}`:"—"}</td>
                        <td style={{ padding:"7px 8px", textAlign:"right", color:T.navyMid, fontWeight:600 }}>{row.avg_pm2!=null?`€${Math.round(row.avg_pm2).toLocaleString("en-US")}`:"—"}</td>
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
