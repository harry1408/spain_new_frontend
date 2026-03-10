import React, { useState, useEffect, useMemo } from "react";
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,Cell,
         LineChart,Line,Legend } from "recharts";
import { T,StatCard,ChartCard,Tag,Pill,fmt,fmtFull,COLORS,UNIT_COLORS,ESG_COLORS,AddressBreadcrumb ,PRICE_COLOR,M2_COLOR} from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";

// ── tiny helpers ────────────────────────────────────────────────────────
function Metric({ label, value, color }) {
  return (
    <div>
      <div style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600 }}>{label}</div>
      <div style={{ color:color||T.text, fontWeight:600, fontSize:13, marginTop:1 }}>{value}</div>
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
      <div style={{ fontWeight:700, fontSize:14, color:hov ? T.gold : T.text, marginBottom:10 }}>{m.municipality}</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px 12px" }}>
        <Metric label="Devel."    value={m.listings||"—"} />
        <Metric label="Apts"      value={m.units} />
        <Metric label="Avg Price" value={fmt(m.avg_price)} color={T.gold} />
        <Metric label="€/m²"      value={`€${m.avg_price_m2}`} color={T.textSub} />
      </div>
      <div style={{ marginTop:8, color:hov ? T.gold : T.textMuted, fontSize:11, fontWeight:600 }}>Explore →</div>
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
      style={{ background: active ? T.goldLight : hov ? T.bgHover : T.bgCard,
        border:`2px solid ${active ? T.borderAccent : hov ? T.borderAccent : T.border}`,
        borderRadius:12, padding:"16px 18px", cursor:"pointer",
        transition:"all 0.15s", boxShadow:lit ? T.shadowMd : T.shadow }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:lit ? T.gold : T.text }}>{l.property_name}</div>
          <div style={{ color:T.textSub, fontSize:11, marginTop:2 }}>{l.developer}</div>
        </div>
        {l.esg_grade && l.esg_grade !== "nan" && <Tag label={`ESG ${l.esg_grade}`} color={esgColor}/>}
      </div>
      <AddressBreadcrumb cityArea={l.city_area} municipality={l.municipality} style={{ marginBottom:10 }} />
      {l.unit_types && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
          {l.unit_types.split(", ").filter(Boolean).map(ut => (
            <span key={ut} style={{ fontSize:10, padding:"2px 7px", borderRadius:4,
              background:`${UNIT_COLORS[ut]||"#aaa"}20`,
              color:UNIT_COLORS[ut]||"#aaa",
              border:`1px solid ${UNIT_COLORS[ut]||"#aaa"}55`,
              fontWeight:700 }}>{ut}</span>
          ))}
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"7px 10px", marginBottom:10 }}>
        <Metric label="Apts"     value={l.units} />
        <Metric label="Avg"      value={fmt(l.avg_price)}     color={T.gold} />
        <Metric label="€/m²"     value={`€${l.avg_price_m2}`} color={T.textSub} />
        <Metric label="From"     value={fmt(l.min_price)}     color={T.green} />
        <Metric label="To"       value={fmt(l.max_price)}     color={T.red} />
        <Metric label="Avg Size" value={`${l.avg_size}m²`} />
      </div>
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        <Pill on={l.has_pool} label="Pool"/><Pill on={l.has_parking} label="Parking"/>
        <Pill on={l.has_terrace} label="Terrace"/><Pill on={l.has_lift} label="Lift"/>
      </div>
      <div style={{ marginTop:10, color:lit ? T.gold : T.textMuted, fontSize:11, fontWeight:600 }}>View apartments →</div>
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
function PriceDistChart({ data, height=160 }) {
  const [showM2, setShowM2] = usePriceToggle();
  const dataKey = showM2 ? "avg_price_m2" : "count";
  const yFmt = showM2 ? v=>`€${Number(v/1000).toFixed(1)}K` : v=>v;
  const label = showM2 ? "Avg €/m²" : "Units";
  const ttFmt = showM2 ? v=>`€${Math.round(Number(v)).toLocaleString()}/m²` : v=>v;
  const safe = (data||[]).map(d=>({ ...d, avg_price_m2: Number(d.avg_price_m2)||0 }));
  const maxVal = safe.length ? Math.max(...safe.map(d=>d[dataKey]||0)) : 1;
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
          <Bar dataKey={dataKey} name={label} radius={[4,4,0,0]} isAnimationActive={false}>
            {safe.map((_,i)=><Cell key={i} fill={showM2?M2_COLOR:COLORS[i%COLORS.length]}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
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
          ? <span style={{ background:T.gold, color:"#fff", borderRadius:4, fontSize:10, fontWeight:700, padding:"1px 6px" }}>{value.length}</span>
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
                  style={{ background:T.goldLight, border:`1px solid ${T.borderAccent}`,
                    color:T.gold, fontSize:10, fontWeight:700, padding:"2px 6px",
                    borderRadius:4, cursor:"pointer" }}>
                  {v} ×
                </span>
              ))}
              <span onClick={e=>{e.stopPropagation();onChange([]);setQuery("");}}
                style={{ color:"#DC2626", fontSize:10, cursor:"pointer", alignSelf:"center" }}>Clear all</span>
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
                        background:sel?T.goldLight:"transparent", color:sel?T.gold:T.text,
                        borderLeft:`3px solid ${sel?T.gold:"transparent"}`,
                        display:"flex", alignItems:"center", gap:8,
                        transition:"background 0.1s" }}
                      onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background=T.bgStripe; }}
                      onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background="transparent"; }}>
                      {!navigateOnSelect && (
                        <span style={{ width:14, height:14, borderRadius:3, flexShrink:0,
                          border:`2px solid ${sel?T.gold:T.border}`, background:sel?T.gold:"transparent",
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

export default function DrilldownPage({ municipality, onSelectMunicipality, onSelectListing }) {
  const [muniList,    setMuniList]    = useState([]);
  const [filters,     setFilters]     = useState({ provinces:[], province_munis:{} });
  const [selProvince, setSelProvince] = useState([]);
  const [selMuni,     setSelMuni]     = useState([]);
  const [sortBy,      setSortBy]      = useState("units");
  const [muniData,    setMuniData]    = useState(null);
  const [mapListings, setMapListings] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [activePin,   setActivePin]   = useState(null);
  const [unitFilter,  setUnitFilter]  = useState([]);

  // All municipalities (for selector)
  useEffect(() => {
    fetch(`${API}/charts/municipality-overview`).then(r=>r.json()).then(setMuniList).catch(()=>{});
    fetch(`${API}/filters`).then(r=>r.json()).then(f => setFilters({ provinces: f.provinces||[], province_munis: f.province_munis||{} })).catch(()=>{});
  }, []);

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

  // Map markers — must be before ANY early return (Rules of Hooks)
  const mapMarkers = useMemo(() => mapListings
    .filter(l => l.lat && l.lng && !(Math.abs(l.lat - 39.47) < 0.001 && Math.abs(l.lng + 0.38) < 0.001))
    .map(l => ({
      id:       l.listing_id,
      lat:      l.lat, lng: l.lng,
      label:    l.property_name,
      sublabel: `${fmt(l.avg_price)} · ${l.units} apts`,
      active:   l.listing_id === activePin,
      color:    T.blue,
    })), [mapListings, activePin]);

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
      <div style={{ padding:"28px 36px", maxWidth:1400, margin:"0 auto" }}>
        <div style={{ marginBottom:22 }}>
          <h2 style={{ margin:0, fontFamily:"'DM Serif Display',serif", fontSize:28, color:T.text, fontWeight:400 }}>
            Select a <em style={{ color:T.gold }}>Municipality</em>
          </h2>
          <p style={{ color:T.textSub, fontSize:13, margin:"6px 0 0" }}>
            {sorted.length} {sorted.length!==1?"municipalities":"municipality"} shown
            {selMuni.length>0 && <span style={{ color:T.gold }}> · {selMuni.length} selected</span>}
          </p>
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
          {(selProvince.length > 0 || selMuni.length > 0) && (
            <button onClick={() => { setSelProvince([]); setSelMuni([]); }}
              style={{ background:"#FEF2F2", border:"1px solid rgba(220,38,38,0.3)", color:"#DC2626",
                padding:"6px 12px", borderRadius:7, cursor:"pointer", fontSize:11 }}>✕ Clear filters</button>
          )}
          <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
            <span style={{ color:T.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", alignSelf:"center" }}>Sort</span>
            {[["units","Units"],["listings","Devel."],["avg_price","Avg Price"]].map(([s,lbl])=>(
              <button key={s} onClick={()=>setSortBy(s)} style={{
                background:sortBy===s?T.goldLight:"#fff", border:`1px solid ${sortBy===s?T.borderAccent:T.border}`,
                color:sortBy===s?T.gold:T.textSub, padding:"6px 12px", borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:600 }}>{lbl}</button>
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
  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.textSub }}>Loading {municipality}…</div>;
  if (!muniData?.stats) return <div style={{ padding:60, textAlign:"center", color:T.textSub }}>No data.</div>;

  const { stats, listings, unit_type_mix, price_dist, trend } = muniData;

  const filteredListings = unitFilter.length
    ? listings.filter(l => unitFilter.some(ut => l.unit_types?.includes(ut)))
    : listings;
  const sortedListings = [...filteredListings].sort((a,b) => b.avg_price - a.avg_price);

  const ALL_UTS = ["Studio","1BR","2BR","3BR","4BR","5BR","Penthouse"];

  return (
    <div style={{ padding:"24px 36px", maxWidth:1500, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'DM Serif Display',serif", fontSize:26, color:T.text, fontWeight:400 }}>
            <em style={{ color:T.gold }}>{municipality}</em>
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

      {/* KPIs */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <StatCard label="Developments"     value={stats.total_listings} accent={T.text} />
        <StatCard label="Total Apartments" value={stats.total_units?.toLocaleString()} />
        <StatCard label="Avg Price"        value={fmt(stats.avg_price)} />
        <StatCard label="Avg €/m²"         value={`€${stats.avg_price_m2}`} accent={T.blue} />
        <StatCard label="Price Range"      value={`${fmt(stats.price_range?.[0])} – ${fmt(stats.price_range?.[1])}`} accent={T.textSub} />
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

        {/* ── RIGHT: Map + Charts ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Top row: Map (left) + Unit Type Summary table (right) */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {/* Map — single pin on active/first listing */}
            <div>
              {(() => {
                const pinTarget = mapMarkers.find(m => m.active) || mapMarkers[0];
                if (!pinTarget) return null;
                return (
                  <div style={{ position:"relative", width:"100%", height:280, borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}` }}>
                    <iframe
                      title="map"
                      src={`https://maps.google.com/maps?q=${pinTarget.lat},${pinTarget.lng}&z=14&output=embed`}
                      width="100%" height="100%"
                      style={{ border:0, display:"block" }}
                      allowFullScreen="" loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <a href={`https://www.google.com/maps?q=${pinTarget.lat},${pinTarget.lng}`}
                      target="_blank" rel="noreferrer"
                      style={{ position:"absolute", bottom:6, right:6, background:"rgba(255,255,255,0.92)",
                        borderRadius:4, fontSize:10, fontWeight:600, color:"#1a73e8",
                        padding:"2px 7px", textDecoration:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", zIndex:10 }}>
                      Open in Google Maps ↗
                    </a>
                  </div>
                );
              })()}
            </div>

            {/* Unit Type Summary table */}
            <ChartCard title="Unit Type Summary">
              <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:260 }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead style={{ position:"sticky", top:0, zIndex:1 }}>
                    <tr style={{ borderBottom:`2px solid ${T.border}`, background:T.bgStripe }}>
                      {["Type","Count","Min","Avg","Max","m²","€/m²"].map(h=>(
                        <th key={h} style={{ padding:"7px 10px", textAlign: h==="Type"?"left":"right",
                          color:T.textMuted, fontSize:10, textTransform:"uppercase",
                          letterSpacing:"0.07em", fontWeight:600, background:T.bgStripe }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(muniData.unit_type_stats||unit_type_mix).map((row,i)=>{
                      const uc = UNIT_COLORS[row.unit_type]||COLORS[i%COLORS.length];
                      return (
                        <tr key={row.unit_type} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgStripe:"#fff" }}>
                          <td style={{ padding:"7px 10px" }}>
                            <span style={{ background:uc, color:"#fff", fontWeight:700, fontSize:11, padding:"2px 8px", borderRadius:4 }}>{row.unit_type}</span>
                          </td>
                          <td style={{ padding:"7px 10px", textAlign:"right", color:T.text, fontWeight:600 }}>{row.count}</td>
                          <td style={{ padding:"7px 10px", textAlign:"right", color:T.green, fontWeight:500, fontSize:11 }}>{row.min_price!=null?`€${Math.round(row.min_price).toLocaleString()}`:"—"}</td>
                          <td style={{ padding:"7px 10px", textAlign:"right", color:T.gold, fontWeight:700 }}>{row.avg_price!=null?`€${Math.round(row.avg_price).toLocaleString()}`:"—"}</td>
                          <td style={{ padding:"7px 10px", textAlign:"right", color:T.red, fontSize:11 }}>{row.max_price!=null?`€${Math.round(row.max_price).toLocaleString()}`:"—"}</td>
                          <td style={{ padding:"7px 10px", textAlign:"right", color:T.textSub, fontSize:11 }}>{row.avg_size!=null?`${row.avg_size}m²`:"—"}</td>
                          <td style={{ padding:"7px 10px", textAlign:"right", color:T.blue, fontWeight:600 }}>{row.avg_pm2!=null?`€${Math.round(row.avg_pm2)}`:"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          {/* Bottom row: Price Distribution + Avg Price Over Time */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <PriceDistChart data={price_dist} height={160} />

            <ChartCard title="Avg Price Over Time">
              {(trend||[]).length < 2
                ? <NoDataNote msg="More snapshots needed" />
                : <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={trend||[]}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                      <XAxis dataKey="period" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="p" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="m" orientation="right" tickFormatter={v=>`€${v}`} tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }} />
                      <Legend wrapperStyle={{ fontSize:10 }} />
                      <Line yAxisId="p" type="monotone" dataKey="avg_price" name="Avg Price" stroke={T.gold} strokeWidth={2.5} dot={{ r:4, fill:T.gold }} />
                      <Line yAxisId="m" type="monotone" dataKey="avg_price_m2" name="€/m²" stroke={T.blue} strokeWidth={2} strokeDasharray="5 3" dot={{ r:3 }} />
                    </LineChart>
                  </ResponsiveContainer>}
            </ChartCard>
          </div>

        </div>{/* end right */}
      </div>{/* end two-col */}
    </div>
  );
}
