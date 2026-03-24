import React, { useState, useEffect, useCallback } from "react";
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,
         LineChart,Line,ScatterChart,Scatter,PieChart,Pie,Cell,Legend } from "recharts";
import { T,StatCard,ChartCard,fmt,fmtFull,COLORS,UNIT_COLORS,ESG_COLORS,PRICE_COLOR,M2_COLOR } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";

// ── Price / €/m² toggle hook ─────────────────────────────────────────────
function usePriceToggle() {
  const [showM2, setShowM2] = React.useState(false);
  return [showM2, setShowM2];
}

// ── Toggle pill button ────────────────────────────────────────────────────
function ToggleBtn({ showM2, onToggle }) {
  return (
    <div onClick={onToggle}
      style={{ display:"inline-flex", alignItems:"center", gap:0, borderRadius:20,
        border:`1px solid ${T.border}`, overflow:"hidden", cursor:"pointer",
        fontSize:10, fontWeight:700, userSelect:"none", flexShrink:0 }}>
      <span style={{ padding:"3px 10px",
        background: !showM2 ? PRICE_COLOR : "transparent",
        color: !showM2 ? "#fff" : T.textMuted,
        transition:"all 0.2s" }}>Price</span>
      <span style={{ padding:"3px 10px",
        background: showM2 ? M2_COLOR : "transparent",
        color: showM2 ? "#fff" : T.textMuted,
        transition:"all 0.2s" }}>€/m²</span>
    </div>
  );
}

function TypeSearchMultiSelect({ label, options, value, onChange, width=200 }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = React.useRef(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const hasVal = value.length > 0;

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ background:"#fff", border:`1px solid ${hasVal ? T.borderAccent : T.border}`,
          borderRadius:8, padding:"6px 10px", cursor:"pointer",
          display:"flex", alignItems:"center", gap:6, minWidth:width, boxShadow:T.shadow }}>
        <span style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase", fontWeight:600, whiteSpace:"nowrap" }}>{label}</span>
        {hasVal
          ? <span style={{ background:T.navy, color:"#fff", borderRadius:4, fontSize:10,
              fontWeight:700, padding:"1px 6px", whiteSpace:"nowrap" }}>{value.length}</span>
          : <span style={{ color:T.textSub, fontSize:12, flex:1 }}>All</span>}
        <span style={{ color:T.textMuted, fontSize:10, marginLeft:"auto" }}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:200,
          background:"#fff", border:`1px solid ${T.border}`, borderRadius:10,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)", minWidth:Math.max(width, 220), overflow:"hidden" }}>
          {/* Search input */}
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${T.border}` }}>
            <input autoFocus value={query} onChange={e=>setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              onClick={e=>e.stopPropagation()}
              style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:6,
                padding:"6px 10px", fontSize:12, outline:"none", color:T.text, background:T.bgStripe, boxSizing:"border-box" }}/>
          </div>
          {/* Selected tags */}
          {value.length>0 && (
            <div style={{ padding:"6px 10px", borderBottom:`1px solid ${T.border}`,
              display:"flex", flexWrap:"wrap", gap:4 }}>
              {value.map(v=>(
                <span key={v} onClick={e=>{e.stopPropagation();onChange(value.filter(x=>x!==v));}}
                  style={{ background:T.navyLight, border:`1px solid ${T.borderAccent}`,
                    color:T.navy, fontSize:10, fontWeight:700, padding:"2px 6px",
                    borderRadius:4, cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}>
                  {v} <span style={{ fontSize:11 }}>×</span>
                </span>
              ))}
              <span onClick={e=>{e.stopPropagation();onChange([]);setQuery("");}}
                style={{ color:"#6B2A2A", fontSize:10, cursor:"pointer", alignSelf:"center", marginLeft:2 }}>Clear all</span>
            </div>
          )}
          {/* Options list */}
          <div style={{ maxHeight:200, overflowY:"auto" }}>
            {filtered.length===0
              ? <div style={{ padding:"12px 10px", color:T.textMuted, fontSize:12, textAlign:"center" }}>No matches</div>
              : filtered.map(opt=>{
                  const sel = value.includes(opt);
                  return (
                    <div key={opt} onClick={e=>{e.stopPropagation();onChange(sel?value.filter(v=>v!==opt):[...value,opt]);}}
                      style={{ padding:"7px 12px", cursor:"pointer", fontSize:12,
                        background:sel?T.navyLight:"transparent",
                        color:sel?T.navy:T.text,
                        borderLeft:`3px solid ${sel?T.navy:"transparent"}`,
                        display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:14, height:14, borderRadius:3,
                        border:`2px solid ${sel?T.navy:T.border}`,
                        background:sel?T.navy:"transparent",
                        display:"inline-flex", alignItems:"center", justifyContent:"center",
                        flexShrink:0 }}>
                        {sel&&<span style={{ color:"#fff", fontSize:8, fontWeight:900 }}>✓</span>}
                      </span>
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

function MultiSelect({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setOpen(o=>!o)} style={{ background:"#fff", border:`1px solid ${T.border}`, color: value.length?T.navy:T.textSub, padding:"7px 12px", borderRadius:8, cursor:"pointer", fontSize:12, whiteSpace:"nowrap" }}>
        {label}{value.length?` (${value.length})`:""} ▾
      </button>
      {open && (
        <div style={{ position:"absolute", top:"110%", left:0, background:"#fff", border:"1px solid #E2E0DB", borderRadius:8, padding:8, zIndex:100, minWidth:160, maxHeight:200, overflowY:"auto" }}>
          {options.map(opt => (
            <div key={opt} onClick={() => onChange(value.includes(opt)?value.filter(v=>v!==opt):[...value,opt])}
              style={{ padding:"6px 10px", cursor:"pointer", borderRadius:5, fontSize:12,
                background: value.includes(opt)?T.navyLight:"transparent",
                color: value.includes(opt)?T.navy:T.text }}>
              {value.includes(opt)?"✓ ":""}{opt}
            </div>
          ))}
          {value.length>0 && <div onClick={()=>onChange([])} style={{ padding:"6px 10px", cursor:"pointer", color:"#6B2A2A", fontSize:11 }}>✕ Clear</div>}
        </div>
      )}
    </div>
  );
}

function Delta({ cur, prev, field, format }) {
  if (!prev || !prev[field]) return null;
  const diff = cur[field] - prev[field];
  const pct = ((diff / prev[field]) * 100).toFixed(1);
  const up = diff > 0;
  const zero = diff === 0;
  return (
    <div style={{ fontSize:10, marginTop:2, color: zero?T.textMuted: up?T.navy:T.green }}>
      {zero ? "↔ No change" : `${up?"▲":"▼"} ${format ? format(Math.abs(diff)) : Math.abs(diff).toLocaleString()} (${Math.abs(pct)}%)`}
      <span style={{ color:"#8A96B4", marginLeft:4 }}>vs prev</span>
    </div>
  );
}

// ── Price by Unit Type — toggle chart ────────────────────────────────────
function PriceByUnitTypeChart({ data }) {
  const [showM2, setShowM2] = usePriceToggle();
  const dataKey = showM2 ? "avg_price_m2" : "avg_price";
  const yFmt = showM2 ? v=>`€${Number(v/1000).toFixed(1)}K` : v=>`€${Number(v/1000).toFixed(0)}K`;
  const ttFmt = showM2 ? v=>`€${Math.round(Number(v)).toLocaleString()}/m²` : v=>fmtFull(v);
  // Normalise data so avg_price_m2 is always a number
  const safe = (data||[]).map(d=>({ ...d, avg_price_m2: Number(d.avg_price_m2)||0 }));
  const maxVal = safe.length ? Math.max(...safe.map(d=>d[dataKey]||0)) : 1;
  return (
    <ChartCard title="Price by Unit Type">
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:-28, marginBottom:8 }}>
        <ToggleBtn showM2={showM2} onToggle={()=>setShowM2(v=>!v)}/>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={safe} barSize={30}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="unit_type" tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={yFmt} tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false}
            domain={[0, Math.ceil(maxVal * 1.15)]} />
          <Tooltip formatter={v=>[ttFmt(v), showM2?"Avg €/m²":"Avg Price"]}
            contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} />
          <Bar dataKey={dataKey} name={showM2?"Avg €/m²":"Avg Price"} radius={[5,5,0,0]} isAnimationActive={false}>
            {safe.map((e,i)=><Cell key={i} fill={showM2?M2_COLOR:(UNIT_COLORS[e.unit_type]||COLORS[i])}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Price Distribution — toggle chart ────────────────────────────────────
function PriceDistributionChart({ data, m2data, height=220 }) {
  const [showM2, setShowM2] = usePriceToggle();
  const safe = showM2
    ? (m2data||[]).map(d=>({ ...d, count: Number(d.count)||0 }))
    : (data||[]).map(d=>({ ...d, count: Number(d.count)||0 }));
  const yFmt = v => v;
  const ttFmt = v => `${v} units`;
  const label = showM2 ? "Units (by €/m²)" : "Units (by price)";
  const maxVal = safe.length ? Math.max(...safe.map(d=>d.count||0)) : 1;
  return (
    <ChartCard title="Price Distribution">
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:-28, marginBottom:8 }}>
        <ToggleBtn showM2={showM2} onToggle={()=>setShowM2(v=>!v)}/>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={safe} barSize={26}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="bin" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={yFmt} tick={{ fill:T.textSub, fontSize:10 }} axisLine={false} tickLine={false}
            domain={[0, Math.ceil(maxVal * 1.15)]} />
          <Tooltip formatter={v=>[ttFmt(v), label]}
            contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} />
          <Bar dataKey="count" name={label} radius={[4,4,0,0]} isAnimationActive={false}>
            {safe.map((_,i)=><Cell key={i} fill={showM2?M2_COLOR:`hsl(${200+i*15},60%,${42+i*3}%)`}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Scatter Popup Modal ───────────────────────────────────────────────────
function ScatterPopup({ dot, allDots, onClose, onGoListing }) {
  const [selectedIds, setSelectedIds] = React.useState(new Set([dot.sub_listing_id]));
  const [unitFilter, setUnitFilter] = React.useState([]);

  // Close on Escape
  React.useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const toggleId = (id) => setSelectedIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const unitTypes = [...new Set(allDots.map(d=>d.unit_type))].sort();
  const visibleDots = unitFilter.length ? allDots.filter(d=>unitFilter.includes(d.unit_type)) : allDots;
  const selectedDots = allDots.filter(d => selectedIds.has(d.sub_listing_id));

  const mapMarkers = selectedDots.filter(d => d.lat && d.lng && !(Math.abs(d.lat - 39.47) < 0.001 && Math.abs(d.lng + 0.38) < 0.001)).map(d => ({
    id: d.sub_listing_id, lat: d.lat, lng: d.lng,
    label: d.property_name,
    sublabel: `${d.unit_type} · ${fmtFull(d.price)} · ${d.size}m²${d.price_per_m2 ? ` · €${Math.round(d.price_per_m2)}/m²` : ""}`,
    active: true,
    color: UNIT_COLORS[d.unit_type] || T.navy,
  }));

  // Center map on first selected dot
  const mapCenter = selectedDots[0] ? [selectedDots[0].lat, selectedDots[0].lng] : [39.47, -0.38];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:900 }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }}/>

      {/* Modal */}
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        background:"#fff", borderRadius:18, width:"min(92vw, 1200px)", maxHeight:"90vh",
        boxShadow:"0 24px 80px rgba(0,0,0,0.25)", display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"16px 22px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, color:T.text, fontWeight:400 }}>
            Size vs Price <span style={{ color:T.navy }}>· {selectedIds.size} selected</span>
          </div>
          {/* Unit type filter chips */}
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginLeft:8 }}>
            {unitTypes.map(ut => {
              const active = unitFilter.includes(ut);
              return (
                <button key={ut} onClick={() => setUnitFilter(p => active ? p.filter(x=>x!==ut) : [...p,ut])}
                  style={{ background:active?`${UNIT_COLORS[ut]}20`:"#f5f5f5",
                    border:`1.5px solid ${active?UNIT_COLORS[ut]:T.border}`,
                    color:active?UNIT_COLORS[ut]:T.textSub,
                    padding:"3px 10px", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:active?700:500 }}>
                  <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:UNIT_COLORS[ut]||"#aaa", marginRight:4 }}/>
                  {ut}
                </button>
              );
            })}
            {unitFilter.length>0 && <button onClick={()=>setUnitFilter([])} style={{ background:"#FEF2F2", border:"1px solid rgba(220,38,38,0.3)", color:"#6B2A2A", padding:"3px 9px", borderRadius:6, cursor:"pointer", fontSize:11 }}>✕ Clear</button>}
          </div>
          {selectedIds.size>0 && (
            <button onClick={()=>setSelectedIds(new Set())}
              style={{ marginLeft:"auto", background:"#FEF2F2", border:"1px solid rgba(220,38,38,0.3)", color:"#6B2A2A", padding:"5px 10px", borderRadius:7, cursor:"pointer", fontSize:11 }}>
              Clear selection
            </button>
          )}
          <button onClick={onClose}
            style={{ background:"none", border:"none", cursor:"pointer", color:T.textMuted, fontSize:26, lineHeight:1, padding:"0 0 0 8px", marginLeft: selectedIds.size>0 ? 0 : "auto" }}>×</button>
        </div>

        {/* Body: chart left, map right */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", flex:1, overflow:"hidden", minHeight:0 }}>

          {/* Left: scatter chart + selected list */}
          <div style={{ padding:"18px 20px", borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ fontSize:11, color:T.textMuted, marginBottom:8 }}>Click dots to select · selected show on map</div>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top:5, right:10, bottom:24, left:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                <XAxis dataKey="size" name="Size (m²)" tick={{ fill:T.textSub, fontSize:10 }} axisLine={false} tickLine={false}
                  label={{ value:"Size (m²)", position:"insideBottom", fill:T.textSub, fontSize:10, dy:16 }}/>
                <YAxis dataKey="price" name="Price" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`}
                  tick={{ fill:T.textSub, fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip cursor={{ strokeDasharray:"3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, padding:"9px 12px", fontSize:11, boxShadow:T.shadowMd }}>
                        <div style={{ fontWeight:700, color:UNIT_COLORS[d.unit_type]||T.navy }}>{d.unit_type} — {d.property_name}</div>
                        <div>{fmtFull(d.price)} · {d.size}m²</div>
                        <div style={{ color:T.textMuted }}>{d.municipality}</div>
                        <div style={{ color:T.navyMid, marginTop:3 }}>Click to {selectedIds.has(d.sub_listing_id)?"deselect":"select"}</div>
                      </div>
                    );
                  }}/>
                <Scatter data={visibleDots} onClick={pt => toggleId(pt.sub_listing_id)}
                  shape={props => {
                    const d = props.payload;
                    const isSel = selectedIds.has(d.sub_listing_id);
                    const color = UNIT_COLORS[d.unit_type] || T.navy;
                    return (
                      <circle cx={props.cx} cy={props.cy}
                        r={isSel ? 9 : 5}
                        fill={isSel ? color : color}
                        fillOpacity={isSel ? 1 : 0.5}
                        stroke={isSel ? "#fff" : color}
                        strokeWidth={isSel ? 2.5 : 0}
                        style={{ cursor:"pointer", filter: isSel ? `drop-shadow(0 0 4px ${color})` : "none" }}/>
                    );
                  }}/>
              </ScatterChart>
            </ResponsiveContainer>

            {/* Selected items list */}
            {selectedDots.length > 0 && (
              <div style={{ flex:1, overflowY:"auto", marginTop:12, borderTop:`1px solid ${T.border}`, paddingTop:10 }}>
                <div style={{ fontSize:10, color:T.textMuted, textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>Selected apartments</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {selectedDots.map(d => (
                    <div key={d.sub_listing_id}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px",
                        background:T.bgStripe, borderRadius:7, fontSize:11,
                        borderLeft:`3px solid ${UNIT_COLORS[d.unit_type]||T.navy}` }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.property_name}</div>
                        <div style={{ color:T.textMuted }}>{d.unit_type} · {fmtFull(d.price)}{d.price_per_m2 ? ` · €${Math.round(d.price_per_m2)}/m²` : ""} · {d.size}m² · {d.municipality}</div>
                      </div>
                      {onGoListing && (
                        <button
                          onClick={() => { onClose(); onGoListing(d.listing_id, d.property_name, d.municipality); }}
                          style={{ background:T.navy, border:"none", color:"#fff",
                            padding:"4px 10px", borderRadius:6, cursor:"pointer",
                            fontSize:10, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>
                          Go to listing →
                        </button>
                      )}
                      <button onClick={()=>toggleId(d.sub_listing_id)}
                        style={{ background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:15, lineHeight:1, padding:0, flexShrink:0 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: map */}
          <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"12px 16px 8px", borderBottom:`1px solid ${T.border}`, fontSize:12, color:T.textSub, flexShrink:0 }}>
              📍 {selectedIds.size === 0 ? "Select dots on the chart to pin them here" : `${selectedIds.size} apartment${selectedIds.size>1?"s":""} pinned`}
            </div>
            <div style={{ flex:1, minHeight:0 }}>
              {selectedIds.size === 0
                ? <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:T.textMuted, fontSize:13 }}>
                    Select dots on the chart →
                  </div>
                : <LeafletMap markers={mapMarkers} height="100%" zoom={11} center={mapCenter}/>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SummaryPage({ onDrilldown, onGoListing }) {
  const [filters, setFilters] = useState({ municipalities:[], provinces:[], province_munis:{}, unit_types:[], delivery_years:[], esg_grades:[], periods:[], latest_period:"", prev_period:null });
  const [sel, setSel] = useState({ province:[], municipality:[], unit_type:[], year:[], esg:[] });
  const [stats, setStats]   = useState(null);
  const [charts, setCharts] = useState({});
  const [trend, setTrend]   = useState({});
  const [loading, setLoading] = useState(false);
  const [tab, setTab]       = useState("snapshot");
  const [selectedDot, setSelectedDot] = useState(null); // clicked scatter apt

  useEffect(() => {
    fetch(`${API}/filters`).then(r=>r.json()).then(f => {
      setFilters(f);
    });
  }, []);

  const q = useCallback(() => {
    const p = new URLSearchParams();
    sel.province.forEach(v=>p.append("province",v));
    sel.municipality.forEach(v=>p.append("municipality",v));
    sel.unit_type.forEach(v=>p.append("unit_type",v));
    sel.year.forEach(v=>p.append("year",v));
    sel.esg.forEach(v=>p.append("esg",v));
    return p.toString();
  }, [sel]);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = q();
    try {
      const [st, byType, dl, distData, muni, esgR, scatter] = await Promise.all([
        fetch(`${API}/stats?${qs}`).then(r=>r.json()),
        fetch(`${API}/charts/price-by-unit-type?${qs}`).then(r=>r.json()),
        fetch(`${API}/charts/delivery-timeline?${qs}`).then(r=>r.json()),
        fetch(`${API}/charts/price-distribution?${qs}`).then(r=>r.json()).then(d=>({ price_dist: d.price_dist||[], m2_dist: d.m2_dist||[] })),
        fetch(`${API}/charts/municipality-overview?${qs}`).then(r=>r.json()),
        fetch(`${API}/charts/esg-breakdown?${qs}`).then(r=>r.json()),
        fetch(`${API}/charts/size-vs-price?${qs}`).then(r=>r.json()),
      ]);
      setStats(st);
      setCharts({ byType, dl, price_dist: distData.price_dist, m2_dist: distData.m2_dist, muni, esgR, scatter });
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [q]);

  const loadTrend = useCallback(async () => {
    const muniQs = sel.municipality.map(m=>`municipality=${encodeURIComponent(m)}`).join("&");
    const utQs   = sel.unit_type.map(u=>`unit_type=${encodeURIComponent(u)}`).join("&");
    const qs = [muniQs, utQs].filter(Boolean).join("&");
    try {
      const [mkt, utTrend, muniTrend, inv] = await Promise.all([
        fetch(`${API}/temporal/market-trend?${qs}`).then(r=>r.json()),
        fetch(`${API}/temporal/unit-type-trend?${qs}`).then(r=>r.json()),
        fetch(`${API}/temporal/municipality-trend?${qs}`).then(r=>r.json()),
        fetch(`${API}/temporal/inventory-trend?${qs}`).then(r=>r.json()),
      ]);
      setTrend({ mkt, utTrend, muniTrend, inv });
    } catch(e) { console.error(e); }
  }, [sel.municipality, sel.unit_type]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "trend") loadTrend(); }, [tab, loadTrend]);

  const TABS = [["snapshot","Market Snapshot"],["trend","Trends Over Time"]];

  const ut_lines = [...new Set((trend.utTrend||[]).map(d=>d.unit_type))];
  const periods  = [...new Set((trend.mkt||[]).map(d=>d.period))];

  // For muni trend: pivot by period→muni
  const muniTrendByPeriod = {};
  (trend.muniTrend||[]).forEach(r => {
    if(!muniTrendByPeriod[r.period]) muniTrendByPeriod[r.period] = {period:r.period};
    muniTrendByPeriod[r.period][r.municipality] = r.avg_price;
  });
  const topMunis = [...new Set((trend.muniTrend||[]).map(d=>d.municipality))].slice(0,8);
  const muniTrendRows = Object.values(muniTrendByPeriod);

  // For unit-type trend: pivot
  const utByPeriod = {};
  (trend.utTrend||[]).forEach(r => {
    if(!utByPeriod[r.period]) utByPeriod[r.period] = {period:r.period};
    utByPeriod[r.period][r.unit_type] = r.avg_price;
  });

  return (
    <div style={{ padding:"20px 20px", maxWidth:1700, margin:"0 auto" }}>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <TypeSearchMultiSelect label="Province" options={filters.provinces||[]}
          value={sel.province} width={160}
          onChange={v=>{
            setSel(s=>({...s, province:v,
              municipality: v.length ? s.municipality.filter(m => v.some(c => (filters.province_munis||{})[c]?.includes(m))) : s.municipality
            }));
          }} />
        <TypeSearchMultiSelect label="Municipality"
          options={sel.province.length
            ? sel.province.flatMap(c=>(filters.province_munis||{})[c]||[]).filter((v,i,a)=>a.indexOf(v)===i).sort()
            : filters.municipalities}
          value={sel.municipality} width={200}
          onChange={v=>setSel(s=>({...s,municipality:v}))} />
        <MultiSelect label="Unit Type"    options={filters.unit_types}     value={sel.unit_type}    onChange={v=>setSel(s=>({...s,unit_type:v}))} />
        <MultiSelect label="Delivery Year" options={filters.delivery_years.map(String)} value={sel.year} onChange={v=>setSel(s=>({...s,year:v}))} />
        <MultiSelect label="ESG Grade"    options={filters.esg_grades}     value={sel.esg}          onChange={v=>setSel(s=>({...s,esg:v}))} />
        {(sel.province.length||sel.municipality.length||sel.unit_type.length||sel.year.length||sel.esg.length) ? (
          <button onClick={()=>setSel({province:[],municipality:[],unit_type:[],year:[],esg:[]})} style={{ background:"#FEF2F2", border:"1px solid rgba(192,57,43,0.4)", color:"#6B2A2A", padding:"7px 12px", borderRadius:8, cursor:"pointer", fontSize:11 }}>✕ Clear all</button>
        ) : null}
        <div style={{ marginLeft:"auto", color:"#8A96B4", fontSize:12 }}>
          {filters.latest_period && <span style={{ color:"#0B1239" }}>Snapshot: {filters.latest_period}</span>}
          {filters.prev_period && <span style={{ color:"#8A96B4" }}> &middot; prev: {filters.prev_period}</span>}
        </div>
      </div>

      {/* KPI row */}
      {stats && (
        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          {[
            { label:"Total Apartments", field:"total_units", fmt:v=>v.toLocaleString() },
            { label:"Avg Price",        field:"avg_price",   fmt:fmt },
            { label:"Avg €/m²",         field:"avg_price_m2",fmt:v=>`€${v}` },
            { label:"Avg Size",         field:"avg_size",    fmt:v=>`${v}m²` },
            { label:"Developments",     field:"total_developments", fmt:v=>v },
          ].map(({ label, field, fmt:f }) => (
            <StatCard key={label} label={label} value={f(stats[field])}>
              <Delta cur={stats} prev={stats.prev} field={field} format={f} />
            </StatCard>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid rgba(255,255,255,0.08)", marginBottom:20 }}>
        {TABS.map(([id,lbl]) => (
          <button key={id} onClick={()=>setTab(id)} style={{
            background:"none", border:"none", cursor:"pointer", padding:"10px 22px",
            borderBottom: tab===id?`3px solid ${T.navy}`:"3px solid transparent",
            color: tab===id?T.navy:T.textSub, fontSize:13, fontWeight:tab===id?600:400
          }}>{lbl}</button>
        ))}
      </div>

      {/* ═══════ SNAPSHOT TAB ═══════ */}
      {tab === "snapshot" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>

            <PriceByUnitTypeChart data={charts.byType||[]} />

            <ChartCard title="Delivery Timeline">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.dl||[]} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="delivery_quarter" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:T.textSub, fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="count" name="Units" fill={T.navyMid} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <PriceDistributionChart data={charts.price_dist||[]} m2data={charts.m2_dist||[]} />

            <ChartCard title="Top Municipalities — click to explore">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(charts.muni||[]).slice(0,15)} layout="vertical" barSize={14}
                  onClick={d=>d&&d.activePayload&&onDrilldown&&onDrilldown(d.activePayload[0].payload.municipality)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
                  <XAxis type="number" tick={{ fill:T.textSub, fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="municipality" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="units" name="Units" radius={[0,5,5,0]} cursor="pointer">
                    {(charts.muni||[]).slice(0,15).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="ESG Grade Breakdown">
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <ResponsiveContainer width="45%" height={190}>
                  <PieChart>
                    <Pie data={(charts.esgR||[]).filter(d=>d.esg_grade!=="Unknown")} dataKey="count" nameKey="esg_grade" cx="50%" cy="50%" outerRadius={72} innerRadius={36}>
                      {(charts.esgR||[]).map((e,i)=><Cell key={i} fill={ESG_COLORS[e.esg_grade]||"#999"}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1, fontSize:12 }}>
                  {(charts.esgR||[]).map((e,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:ESG_COLORS[e.esg_grade]||"#999" }}/>
                        <span style={{ color:T.text }}>{e.esg_grade}</span>
                      </div>
                      <span style={{ color:T.navy, fontWeight:600 }}>{e.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            {/* Size vs Price — click dot to open popup */}
            <ChartCard title="Size vs Price — click any dot for details">
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top:5, right:20, bottom:20, left:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="size" name="Size (m²)" tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false}
                    label={{ value:"Size (m²)", position:"insideBottom", fill:T.textSub, fontSize:11, dy:16 }} />
                  <YAxis dataKey="price" name="Price" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ strokeDasharray:"3 3" }}
                    contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", boxShadow:T.shadowMd, fontSize:12, pointerEvents:"none" }}>
                          <div style={{ fontWeight:700, color:UNIT_COLORS[d.unit_type]||T.navy, marginBottom:4 }}>{d.unit_type} — {d.property_name}</div>
                          <div style={{ color:T.text }}>Price: <strong style={{ color:T.navy }}>{fmtFull(d.price)}</strong>{d.price_per_m2 ? <span style={{ color:T.textSub, fontSize:11 }}> · €{Math.round(d.price_per_m2)}/m²</span> : ""}</div>
                          <div style={{ color:T.text }}>Size: <strong>{d.size} m²</strong></div>
                          {d.price_per_m2 && <div style={{ color:T.textSub }}>€/m²: {Math.round(d.price_per_m2)}</div>}
                          <div style={{ color:T.textMuted, marginTop:4, fontSize:11 }}>{d.municipality} · {d.floor||"—"}</div>
                          <div style={{ color:T.navyMid, fontSize:11, marginTop:3 }}>Click to open details ↗</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={charts.scatter||[]}
                    onClick={(pt) => setSelectedDot(pt)}
                    shape={(props) => {
                      const d = props.payload;
                      const isSelected = selectedDot?.sub_listing_id === d.sub_listing_id;
                      return (
                        <circle cx={props.cx} cy={props.cy} r={isSelected ? 8 : 5}
                          fill={UNIT_COLORS[d.unit_type]||T.navy} opacity={isSelected ? 1 : 0.85}
                          stroke={isSelected ? "#fff" : "none"} strokeWidth={isSelected ? 2 : 0}
                          style={{ cursor:"pointer" }}/>
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:6 }}>
                {Object.entries(UNIT_COLORS).map(([ut, color]) => (
                  <div key={ut} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:T.textSub }}>
                    <div style={{ width:9, height:9, borderRadius:"50%", background:color }}/>{ut}
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* ── Scatter popup modal ─────────────────────────────────── */}
          {selectedDot && (
            <ScatterPopup
              dot={selectedDot}
              allDots={charts.scatter||[]}
              onClose={() => setSelectedDot(null)}
              onGoListing={onGoListing}
            />
          )}
        </div>
      )}

      {/* ═══════ TREND TAB ═══════ */}
      {tab === "trend" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>

          {/* Market-wide avg price over time */}
          <ChartCard title="Market Average Price — Month over Month">
            {(trend.mkt||[]).length < 2
              ? <NoDataNote msg="More snapshots needed for trend lines" />
              : <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trend.mkt||[]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="period" tick={{ fill:"#6B7A9F", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="price" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#6B7A9F", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="m2" orientation="right" tickFormatter={v=>`€${v}`} tick={{ fill:"#6B7A9F", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v,n)=>n==="Avg Price"?[fmtFull(v),n]:[`€${v}`,n]} contentStyle={{ background:"#fff", border:"1px solid #0B1239", borderRadius:8, fontSize:12 }} />
                    <Legend wrapperStyle={{ fontSize:11, color:"#6B7A9F" }} />
                    <Line yAxisId="price" type="monotone" dataKey="avg_price" name="Avg Price" stroke={T.navy} strokeWidth={2.5} dot={{ r:5, fill:T.navy }} />
                    <Line yAxisId="m2" type="monotone" dataKey="avg_price_m2" name="Avg €/m²" stroke={M2_COLOR} strokeWidth={2.5} dot={{ r:5, fill:M2_COLOR }} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>}
          </ChartCard>

          {/* Inventory over time */}
          <ChartCard title="Inventory — Units on Market">
            {(trend.inv||[]).length < 2
              ? <NoDataNote msg="More snapshots needed for inventory trend" />
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trend.inv||[]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="period" tick={{ fill:"#6B7A9F", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"#6B7A9F", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:"#fff", border:"1px solid #0B1239", borderRadius:8, fontSize:12 }} />
                    <Legend wrapperStyle={{ fontSize:11, color:"#6B7A9F" }} />
                    <Bar dataKey="total" name="Total Units" fill={M2_COLOR} radius={[4,4,0,0]} />
                    <Bar dataKey="new"   name="New Listings" fill={T.green} radius={[4,4,0,0]} />
                    <Bar dataKey="removed" name="Removed"   fill={T.red} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>}
          </ChartCard>

          {/* Price by unit type over time */}
          <ChartCard title="Price Trend by Unit Type">
            {Object.keys(utByPeriod).length < 2
              ? <NoDataNote msg="More snapshots needed for per-type trends" />
              : <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={Object.values(utByPeriod)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="period" tick={{ fill:"#6B7A9F", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#6B7A9F", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v)=>[fmtFull(v)]} contentStyle={{ background:"#fff", border:"1px solid #0B1239", borderRadius:8, fontSize:12 }} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                    {ut_lines.map(ut=>(
                      <Line key={ut} type="monotone" dataKey={ut} stroke={UNIT_COLORS[ut]||"#aaa"} strokeWidth={2} dot={{ r:4, fill:UNIT_COLORS[ut]||"#aaa" }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>}
          </ChartCard>

          {/* Snapshot comparison table */}
          <ChartCard title="Snapshot Comparison — All Periods">
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid "+T.border }}>
                    {["Period","Avg Price","Avg €/m²","Total Units","Avg Size"].map(h=>(
                      <th key={h} style={{ padding:"6px 10px", textAlign:"right", color:"#8A96B4", fontSize:10, textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(trend.mkt||[]).map((row,i)=>(
                    <tr key={i} style={{ borderBottom:"1px solid "+T.border, background: row.period===filters.latest_period?"rgba(232,168,56,0.06)":"transparent" }}>
                      <td style={{ padding:"7px 10px", textAlign:"right", color: row.period===filters.latest_period?T.navy:T.text, fontWeight: row.period===filters.latest_period?600:400 }}>{row.period} {row.period===filters.latest_period&&"★"}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#0b1239" }}>{fmt(row.avg_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#0b1239" }}>€{row.avg_price_m2}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#0b1239" }}>{row.total_units?.toLocaleString()}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#0b1239" }}>{row.avg_size} m²</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

        </div>
      )}
    </div>
  );
}

function NoDataNote({ msg }) {
  return (
    <div style={{ height:220, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
      <div style={{ fontSize:28 }}>📅</div>
      <div style={{ color:"#6B7A9F", fontSize:12, textAlign:"center" }}>{msg}</div>
      <div style={{ color:"#8A96B4", fontSize:11 }}>Data will appear as more monthly snapshots are collected</div>
    </div>
  );
}
