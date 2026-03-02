import { useState, useEffect, useCallback } from "react";
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,
         LineChart,Line,ScatterChart,Scatter,PieChart,Pie,Cell,Legend } from "recharts";
import { T,StatCard,ChartCard,fmt,fmtFull,COLORS,UNIT_COLORS,ESG_COLORS } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";

function MultiSelect({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setOpen(o=>!o)} style={{ background:"#fff", border:`1px solid ${T.border}`, color: value.length?T.gold:T.textSub, padding:"7px 12px", borderRadius:8, cursor:"pointer", fontSize:12, whiteSpace:"nowrap" }}>
        {label}{value.length?` (${value.length})`:""} ▾
      </button>
      {open && (
        <div style={{ position:"absolute", top:"110%", left:0, background:"#fff", border:"1px solid #E4E0D8", borderRadius:8, padding:8, zIndex:100, minWidth:160, maxHeight:200, overflowY:"auto" }}>
          {options.map(opt => (
            <div key={opt} onClick={() => onChange(value.includes(opt)?value.filter(v=>v!==opt):[...value,opt])}
              style={{ padding:"6px 10px", cursor:"pointer", borderRadius:5, fontSize:12,
                background: value.includes(opt)?T.goldLight:"transparent",
                color: value.includes(opt)?T.gold:T.text }}>
              {value.includes(opt)?"✓ ":""}{opt}
            </div>
          ))}
          {value.length>0 && <div onClick={()=>onChange([])} style={{ padding:"6px 10px", cursor:"pointer", color:"#DC2626", fontSize:11 }}>✕ Clear</div>}
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
    <div style={{ fontSize:10, marginTop:2, color: zero?T.textMuted: up?T.gold:T.green }}>
      {zero ? "↔ No change" : `${up?"▲":"▼"} ${format ? format(Math.abs(diff)) : Math.abs(diff).toLocaleString()} (${Math.abs(pct)}%)`}
      <span style={{ color:"#9CA3AF", marginLeft:4 }}>vs prev</span>
    </div>
  );
}

export default function SummaryPage({ onDrilldown }) {
  const [filters, setFilters] = useState({ municipalities:[], unit_types:[], delivery_years:[], esg_grades:[], periods:[], latest_period:"", prev_period:null });
  const [sel, setSel] = useState({ municipality:[], unit_type:[], year:[], esg:[] });
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
      const [st, byType, dl, pdist, muni, esgR, scatter] = await Promise.all([
        fetch(`${API}/stats?${qs}`).then(r=>r.json()),
        fetch(`${API}/charts/price-by-unit-type?${qs}`).then(r=>r.json()),
        fetch(`${API}/charts/delivery-timeline?${qs}`).then(r=>r.json()),
        fetch(`${API}/charts/price-distribution?${qs}`).then(r=>r.json()),
        fetch(`${API}/charts/municipality-overview?${qs}`).then(r=>r.json()),
        fetch(`${API}/charts/esg-breakdown?${qs}`).then(r=>r.json()),
        fetch(`${API}/charts/size-vs-price?${qs}`).then(r=>r.json()),
      ]);
      setStats(st);
      setCharts({ byType, dl, pdist, muni, esgR, scatter });
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
    <div style={{ padding:"24px 36px", maxWidth:1500, margin:"0 auto" }}>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <MultiSelect label="Municipality" options={filters.municipalities} value={sel.municipality} onChange={v=>setSel(s=>({...s,municipality:v}))} />
        <MultiSelect label="Unit Type"    options={filters.unit_types}     value={sel.unit_type}    onChange={v=>setSel(s=>({...s,unit_type:v}))} />
        <MultiSelect label="Delivery Year" options={filters.delivery_years.map(String)} value={sel.year} onChange={v=>setSel(s=>({...s,year:v}))} />
        <MultiSelect label="ESG Grade"    options={filters.esg_grades}     value={sel.esg}          onChange={v=>setSel(s=>({...s,esg:v}))} />
        {(sel.municipality.length||sel.unit_type.length||sel.year.length||sel.esg.length) ? (
          <button onClick={()=>setSel({municipality:[],unit_type:[],year:[],esg:[]})} style={{ background:"#FEF2F2", border:"1px solid rgba(192,57,43,0.4)", color:"#DC2626", padding:"7px 12px", borderRadius:8, cursor:"pointer", fontSize:11 }}>✕ Clear</button>
        ) : null}
        <div style={{ marginLeft:"auto", color:"#9CA3AF", fontSize:12 }}>
          {filters.latest_period && <span style={{ color:"#C9A84C" }}>Snapshot: {filters.latest_period}</span>}
          {filters.prev_period && <span style={{ color:"#9CA3AF" }}> &middot; prev: {filters.prev_period}</span>}
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
            borderBottom: tab===id?`3px solid ${T.gold}`:"3px solid transparent",
            color: tab===id?T.gold:T.textSub, fontSize:13, fontWeight:tab===id?600:400
          }}>{lbl}</button>
        ))}
      </div>

      {/* ═══════ SNAPSHOT TAB ═══════ */}
      {tab === "snapshot" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>

            <ChartCard title="Price by Unit Type">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.byType||[]} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="unit_type" tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v,n)=>[fmtFull(v),n]} contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="avg_price" name="Avg Price" radius={[5,5,0,0]}>
                    {(charts.byType||[]).map((e,i)=><Cell key={i} fill={UNIT_COLORS[e.unit_type]||COLORS[i]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Delivery Timeline">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.dl||[]} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="delivery_quarter" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:T.textSub, fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="count" name="Units" fill={T.blue} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Price Distribution">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.pdist||[]} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="bin" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:T.textSub, fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="count" name="Units" radius={[4,4,0,0]}>
                    {(charts.pdist||[]).map((_,i)=><Cell key={i} fill={`hsl(${200+i*15},60%,${42+i*3}%)`}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

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
                      <span style={{ color:T.gold, fontWeight:600 }}>{e.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            {/* Size vs Price — click dot to reveal detail + map */}
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
                          <div style={{ fontWeight:700, color:UNIT_COLORS[d.unit_type]||T.gold, marginBottom:4 }}>{d.unit_type} — {d.property_name}</div>
                          <div style={{ color:T.text }}>Price: <strong style={{ color:T.gold }}>{fmtFull(d.price)}</strong></div>
                          <div style={{ color:T.text }}>Size: <strong>{d.size} m²</strong></div>
                          {d.price_per_m2 && <div style={{ color:T.textSub }}>€/m²: {Math.round(d.price_per_m2)}</div>}
                          <div style={{ color:T.textMuted, marginTop:4, fontSize:11 }}>{d.municipality} · {d.floor||"—"}</div>
                          <div style={{ color:T.blue, fontSize:11, marginTop:3 }}>Click to see on map ↓</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={charts.scatter||[]}
                    onClick={(pt) => setSelectedDot(d => d?.sub_listing_id===pt.sub_listing_id ? null : pt)}
                    shape={(props) => {
                      const d = props.payload;
                      const isSelected = selectedDot?.sub_listing_id === d.sub_listing_id;
                      return (
                        <circle
                          cx={props.cx} cy={props.cy}
                          r={isSelected ? 8 : 5}
                          fill={UNIT_COLORS[d.unit_type]||T.gold}
                          opacity={isSelected ? 1 : 0.85}
                          stroke={isSelected ? "#fff" : "none"}
                          strokeWidth={isSelected ? 2 : 0}
                          style={{ cursor:"pointer" }}
                        />
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:6 }}>
                {Object.entries(UNIT_COLORS).map(([ut, color]) => (
                  <div key={ut} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:T.textSub }}>
                    <div style={{ width:9, height:9, borderRadius:"50%", background:color }}/>
                    {ut}
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Selected dot detail panel + map */}
          {selectedDot && (
            <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"320px 1fr", gap:16, alignItems:"start" }}>
              {/* Detail card */}
              <div style={{ background:"#fff", border:`2px solid ${UNIT_COLORS[selectedDot.unit_type]||T.borderAccent}`, borderRadius:14, padding:"20px 22px", boxShadow:T.shadowMd }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:UNIT_COLORS[selectedDot.unit_type]||T.gold }}>{selectedDot.unit_type}</div>
                    <div style={{ fontWeight:600, fontSize:14, color:T.text, marginTop:2 }}>{selectedDot.property_name}</div>
                  </div>
                  <button onClick={()=>setSelectedDot(null)}
                    style={{ background:"none", border:"none", color:T.textMuted, fontSize:20, cursor:"pointer", lineHeight:1, padding:0 }}>×</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 14px", fontSize:13, marginBottom:14 }}>
                  {[
                    ["Price",    fmtFull(selectedDot.price),                    T.gold ],
                    ["Size",     `${selectedDot.size} m²`,                      T.text ],
                    ["€/m²",     selectedDot.price_per_m2 ? `€${Math.round(selectedDot.price_per_m2)}` : "—", T.textSub],
                    ["Floor",    selectedDot.floor || "—",                       T.text ],
                    ["Bedrooms", selectedDot.bedrooms ?? "—",                    T.text ],
                    ["Location", selectedDot.municipality,                       T.textSub],
                  ].map(([label, val, color]) => (
                    <div key={label}>
                      <div style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase", fontWeight:600, letterSpacing:"0.06em" }}>{label}</div>
                      <div style={{ color, fontWeight:600, marginTop:1 }}>{val}</div>
                    </div>
                  ))}
                </div>
                {selectedDot.unit_url && (
                  <a href={selectedDot.unit_url} target="_blank" rel="noreferrer"
                    style={{ display:"flex", alignItems:"center", gap:6, color:T.blue, fontSize:12, fontWeight:600, textDecoration:"none" }}>
                    View on Idealista ↗
                  </a>
                )}
              </div>
              {/* Map showing the highlighted apartment */}
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:T.textSub, marginBottom:8 }}>
                  📍 {selectedDot.property_name} — {selectedDot.municipality}
                </div>
                <LeafletMap
                  height="280px"
                  center={[selectedDot.lat, selectedDot.lng]}
                  zoom={13}
                  markers={[{
                    id:       selectedDot.sub_listing_id,
                    lat:      selectedDot.lat,
                    lng:      selectedDot.lng,
                    label:    selectedDot.property_name,
                    sublabel: `${selectedDot.unit_type} · ${fmtFull(selectedDot.price)} · ${selectedDot.size}m²`,
                    active:   true,
                    color:    UNIT_COLORS[selectedDot.unit_type] || T.gold,
                  }]}
                />
              </div>
            </div>
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
                    <XAxis dataKey="period" tick={{ fill:"#6B7280", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="price" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#6B7280", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="m2" orientation="right" tickFormatter={v=>`€${v}`} tick={{ fill:"#6B7280", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v,n)=>n==="Avg Price"?[fmtFull(v),n]:[`€${v}`,n]} contentStyle={{ background:"#fff", border:"1px solid #C9A84C", borderRadius:8, fontSize:12 }} />
                    <Legend wrapperStyle={{ fontSize:11, color:"#6B7280" }} />
                    <Line yAxisId="price" type="monotone" dataKey="avg_price" name="Avg Price" stroke={T.gold} strokeWidth={2.5} dot={{ r:5, fill:T.gold }} />
                    <Line yAxisId="m2" type="monotone" dataKey="avg_price_m2" name="Avg €/m²" stroke="#5B9BD5" strokeWidth={2.5} dot={{ r:5, fill:"#5B9BD5" }} strokeDasharray="5 3" />
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
                    <XAxis dataKey="period" tick={{ fill:"#6B7280", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"#6B7280", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:"#fff", border:"1px solid #C9A84C", borderRadius:8, fontSize:12 }} />
                    <Legend wrapperStyle={{ fontSize:11, color:"#6B7280" }} />
                    <Bar dataKey="total" name="Total Units" fill="#5B9BD5" radius={[4,4,0,0]} />
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
                    <XAxis dataKey="period" tick={{ fill:"#6B7280", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#6B7280", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v)=>[fmtFull(v)]} contentStyle={{ background:"#fff", border:"1px solid #C9A84C", borderRadius:8, fontSize:12 }} />
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
                      <th key={h} style={{ padding:"6px 10px", textAlign:"right", color:"#9CA3AF", fontSize:10, textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(trend.mkt||[]).map((row,i)=>(
                    <tr key={i} style={{ borderBottom:"1px solid "+T.border, background: row.period===filters.latest_period?"rgba(232,168,56,0.06)":"transparent" }}>
                      <td style={{ padding:"7px 10px", textAlign:"right", color: row.period===filters.latest_period?T.gold:T.text, fontWeight: row.period===filters.latest_period?600:400 }}>{row.period} {row.period===filters.latest_period&&"★"}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#1A1A2E" }}>{fmt(row.avg_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#1A1A2E" }}>€{row.avg_price_m2}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#1A1A2E" }}>{row.total_units?.toLocaleString()}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#1A1A2E" }}>{row.avg_size} m²</td>
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
      <div style={{ color:"#6B7280", fontSize:12, textAlign:"center" }}>{msg}</div>
      <div style={{ color:"#9CA3AF", fontSize:11 }}>Data will appear as more monthly snapshots are collected</div>
    </div>
  );
}
