import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, Legend,
} from "recharts";
import { StatCard, ChartCard, CustomTooltip, Tag, Pill, fmt, fmtFull, COLORS, UNIT_COLORS, ESG_COLORS } from "../components/shared.jsx";
import { API } from "../App.jsx";

export default function ListingPage({ listingId, onBack }) {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [selectedApts, setSelectedApts] = useState(new Set());
  const [unitTypeFilter, setUnitTypeFilter] = useState([]);
  const [sortCol, setSortCol]         = useState("price");
  const [sortDir, setSortDir]         = useState("asc");
  const [tab, setTab]                 = useState("overview");

  useEffect(() => {
    setLoading(true);
    setSelectedApts(new Set());
    setTab("overview");
    fetch(`${API}/drilldown/listing/${listingId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [listingId]);

  const toggleApt = (id) => {
    setSelectedApts(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ── ALL hooks/useMemo BEFORE any conditional returns ──────────────────────
  const apartments = useMemo(() => {
    if (!data?.apartments) return [];
    let apts = data.apartments;
    if (unitTypeFilter.length > 0) apts = apts.filter(a => unitTypeFilter.includes(a.unit_type));
    return [...apts].sort((a, b) => {
      const av = a[sortCol] ?? -Infinity, bv = b[sortCol] ?? -Infinity;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, unitTypeFilter, sortCol, sortDir]);

  const selectedList = useMemo(() => {
    if (!data?.apartments) return [];
    return data.apartments.filter(a => selectedApts.has(a.sub_listing_id));
  }, [data, selectedApts]);

  const floorPriceData = useMemo(() => data?.floor_price || [], [data]);

  const floorChartData = useMemo(() => {
    const map = {};
    floorPriceData.forEach(d => {
      if (d.floor_num == null) return;
      if (!map[d.floor_num]) map[d.floor_num] = {
        floor: d.floor_num === 0 ? "GF" : `F${d.floor_num}`,
        floor_num: d.floor_num, prices: [],
      };
      map[d.floor_num].prices.push(d.price);
    });
    return Object.values(map).sort((a, b) => a.floor_num - b.floor_num).map(d => ({
      ...d,
      avg_price: Math.round(d.prices.reduce((s, v) => s + v, 0) / d.prices.length),
      min_price: Math.min(...d.prices),
      max_price: Math.max(...d.prices),
      count: d.prices.length,
    }));
  }, [floorPriceData]);

  const allUnitTypes = useMemo(() =>
    [...new Set((data?.apartments || []).map(a => a.unit_type))],
  [data]);

  // ── Conditional returns AFTER all hooks ───────────────────────────────────
  if (loading) return (
    <div style={{ padding: 60, textAlign: "center", color: "#8fa0b0", fontSize: 15 }}>
      Loading listing data...
    </div>
  );
  if (!data || !data.listing_id) return (
    <div style={{ padding: 60, textAlign: "center", color: "#8fa0b0", fontSize: 15 }}>
      Listing not found.
    </div>
  );

  const esgColor = ESG_COLORS[data.esg_grade] || "#555";

  return (
    <div style={{ padding: "24px 36px", maxWidth: 1500, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <h2 style={{ margin:0, fontFamily:"'DM Serif Display',serif", fontSize:26, color:"#f0e8d5" }}>
              {data.property_name}
            </h2>
            {data.esg_grade && <Tag label={`ESG ${data.esg_grade}`} color={esgColor} />}
          </div>
          <div style={{ color:"#8fa0b0", fontSize:12 }}>
            by <span style={{ color:"#f0e8d5" }}>{data.developer}</span>
            {" · "}
            <span style={{ color:"#E8A838" }}>{data.municipality}</span>
            {" · "}
            <span>{data.delivery_date?.replace("Delivery : ","") || "TBD"}</span>
            {" · "}
            <span style={{ color:"#3DAA6E" }}>{data.total_units} apartments</span>
          </div>
        </div>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"#8fa0b0", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:12 }}>
          &larr; Back to {data.municipality}
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <StatCard label="Total Apartments" value={data.total_units} />
        {data.unit_comparison.slice(0,5).map(u => (
          <StatCard key={u.unit_type} label={u.unit_type}
            value={fmt(u.avg_price)}
            sub={`${u.count} units · from ${fmt(u.min_price)}`}
            accent={UNIT_COLORS[u.unit_type]} />
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid rgba(255,255,255,0.08)", marginBottom:20 }}>
        {[["overview","Overview"],["apartments","All Apartments"],["floors","Floor Analysis"],["compare",`Compare${selectedApts.size>0?" ("+selectedApts.size+")":""}`]].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background:"none", border:"none", cursor:"pointer",
            padding:"10px 20px",
            borderBottom: tab===id ? "2px solid #E8A838" : "2px solid transparent",
            color: tab===id ? "#E8A838" : "#8fa0b0",
            fontSize:13, fontWeight: tab===id ? 600 : 400,
          }}>{lbl}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════ OVERVIEW */}
      {tab === "overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

          <ChartCard title="Price Range by Unit Type">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.unit_comparison} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="unit_type" tick={{ fill:"#8fa0b0", fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_price" name="Avg Price" radius={[5,5,0,0]}>
                  {data.unit_comparison.map((e,i) => <Cell key={i} fill={UNIT_COLORS[e.unit_type]||COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Unit Type Summary">
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                    {["Type","Count","Min","Avg","Max","Avg m²","€/m²"].map(h => (
                      <th key={h} style={{ padding:"6px 10px", textAlign:"right", color:"#3a4555", fontWeight:600, fontSize:10, textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.unit_comparison.map((u,i) => (
                    <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding:"7px 10px" }}><span style={{ color:UNIT_COLORS[u.unit_type], fontWeight:600 }}>{u.unit_type}</span></td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#f0e8d5" }}>{u.count}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#3DAA6E" }}>{fmt(u.min_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#E8A838", fontWeight:600 }}>{fmt(u.avg_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#C0392B" }}>{fmt(u.max_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#f0e8d5" }}>{u.avg_size} m²</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#f0e8d5" }}>{fmt(u.avg_price_m2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard title="Size vs Price — click to select" span={2}>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top:10, right:20, bottom:30, left:10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="size" name="Size (m²)" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false}
                  label={{ value:"Size (m²)", position:"insideBottom", fill:"#8fa0b0", fontSize:11, dy:18 }} />
                <YAxis dataKey="price" name="Price" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ strokeDasharray:"3 3" }} content={({ active, payload }) => {
                  if (!active||!payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.35)", borderRadius:8, padding:"10px 14px", fontSize:12 }}>
                      <div style={{ color:UNIT_COLORS[d?.unit_type]||"#E8A838", fontWeight:600, marginBottom:3 }}>{d?.unit_type}</div>
                      <div>Floor: <strong>{d?.floor||"—"}</strong></div>
                      <div>Size: <strong>{d?.size} m²</strong></div>
                      <div>Price: <strong>{fmtFull(d?.price)}</strong></div>
                      <div>€/m²: <strong>{fmt(d?.price_per_m2)}</strong></div>
                    </div>
                  );
                }} />
                <Scatter data={data.apartments} shape={(props) => {
                  const apt = props.payload;
                  const sel = selectedApts.has(apt.sub_listing_id);
                  return <circle cx={props.cx} cy={props.cy} r={sel?7:5}
                    fill={UNIT_COLORS[apt.unit_type]||"#E8A838"} opacity={sel?1:0.6}
                    stroke={sel?"#fff":"none"} strokeWidth={sel?1.5:0} style={{ cursor:"pointer" }}
                    onClick={() => toggleApt(apt.sub_listing_id)} />;
                }} />
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ color:"#3a4555", fontSize:11, marginTop:6 }}>Click dots to select apartments for comparison tab</div>
          </ChartCard>
        </div>
      )}

      {/* ════════════════════════════════════════════ APARTMENTS */}
      {tab === "apartments" && (
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center", flexWrap:"wrap" }}>
            {allUnitTypes.map(ut => (
              <button key={ut}
                onClick={() => setUnitTypeFilter(prev => prev.includes(ut) ? prev.filter(x=>x!==ut) : [...prev,ut])}
                style={{
                  background: unitTypeFilter.includes(ut) ? `${UNIT_COLORS[ut]}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${unitTypeFilter.includes(ut) ? UNIT_COLORS[ut] : "rgba(255,255,255,0.1)"}`,
                  color: unitTypeFilter.includes(ut) ? UNIT_COLORS[ut] : "#8fa0b0",
                  padding:"5px 11px", borderRadius:5, cursor:"pointer", fontSize:11,
                }}>{ut}</button>
            ))}
            <div style={{ marginLeft:"auto", color:"#8fa0b0", fontSize:12, display:"flex", gap:12, alignItems:"center" }}>
              {selectedApts.size > 0 && (
                <span style={{ color:"#E8A838", cursor:"pointer" }} onClick={() => setTab("compare")}>
                  {selectedApts.size} selected &rarr; Compare
                </span>
              )}
              {apartments.length} apartments
            </div>
          </div>

          <div style={{ overflowX:"auto", borderRadius:12, border:"1px solid rgba(255,255,255,0.07)" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ padding:"10px 12px", width:36 }}></th>
                  {[["unit_type","Type"],["floor","Floor"],["price","Price"],["size","Size"],["price_per_m2","€/m²"],["bedrooms","Beds"],["bathrooms","Baths"],["floor_area_m2","Floor Area"],["","Amenities"]].map(([col, lbl]) => (
                    <th key={lbl}
                      onClick={() => col && (col===sortCol ? setSortDir(d=>d==="asc"?"desc":"asc") : (setSortCol(col),setSortDir("asc")))}
                      style={{ padding:"10px 12px", textAlign:"right", color:sortCol===col?"#E8A838":"#3a4555", fontSize:10, textTransform:"uppercase", cursor:col?"pointer":"default", whiteSpace:"nowrap" }}>
                      {lbl}{sortCol===col?(sortDir==="asc"?" ↑":" ↓"):""}
                    </th>
                  ))}
                  <th style={{ padding:"10px 12px", textAlign:"center", color:"#3a4555", fontSize:10, textTransform:"uppercase" }}>Link</th>
                </tr>
              </thead>
              <tbody>
                {apartments.map((apt, i) => {
                  const isSel = selectedApts.has(apt.sub_listing_id);
                  return (
                    <tr key={apt.sub_listing_id}
                      style={{ background:isSel?"rgba(232,168,56,0.07)":i%2===0?"rgba(255,255,255,0.015)":"transparent", borderBottom:"1px solid rgba(255,255,255,0.05)", cursor:"pointer" }}
                      onClick={() => toggleApt(apt.sub_listing_id)}>
                      <td style={{ padding:"8px 12px" }}>
                        <div style={{ width:14, height:14, borderRadius:3, border:`2px solid ${isSel?"#E8A838":"rgba(255,255,255,0.2)"}`, background:isSel?"#E8A838":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {isSel && <span style={{ color:"#0e1118", fontSize:9, fontWeight:900 }}>&#10003;</span>}
                        </div>
                      </td>
                      <td style={{ padding:"8px 12px" }}><span style={{ color:UNIT_COLORS[apt.unit_type]||"#aaa", fontWeight:600 }}>{apt.unit_type}</span></td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#f0e8d5" }}>{apt.floor||"—"}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#E8A838", fontWeight:700, fontSize:13 }}>{fmtFull(apt.price)}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#f0e8d5" }}>{apt.size} m²</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#8fa0b0" }}>{fmt(apt.price_per_m2)}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#f0e8d5" }}>{apt.bedrooms??"-"}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#f0e8d5" }}>{apt.bathrooms??"-"}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#f0e8d5" }}>{apt.floor_area_m2 ? `${apt.floor_area_m2} m²` : "—"}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right" }}>
                        <div style={{ display:"flex", gap:3, justifyContent:"flex-end", flexWrap:"wrap" }}>
                          <Pill on={apt.has_terrace} label="T" />
                          <Pill on={apt.has_parking} label="P" />
                          <Pill on={apt.has_pool}    label="Pool" />
                          <Pill on={apt.has_ac}      label="AC" />
                          <Pill on={apt.has_storage} label="Str" />
                          <Pill on={apt.has_lift}    label="Lift" />
                        </div>
                      </td>
                      <td style={{ padding:"8px 12px", textAlign:"center" }} onClick={e => e.stopPropagation()}>
                        {apt.unit_url && <a href={apt.unit_url} target="_blank" rel="noreferrer" style={{ color:"#2A6496", fontSize:11, textDecoration:"none" }}>View &#8599;</a>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedApts.size > 0 && (
            <div style={{ marginTop:12, display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ color:"#8fa0b0", fontSize:12 }}>{selectedApts.size} selected</span>
              <button onClick={() => setTab("compare")} style={{ background:"rgba(232,168,56,0.18)", border:"1px solid rgba(232,168,56,0.4)", color:"#E8A838", padding:"7px 16px", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600 }}>Compare Selected &rarr;</button>
              <button onClick={() => setSelectedApts(new Set())} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"#8fa0b0", padding:"7px 12px", borderRadius:7, cursor:"pointer", fontSize:11 }}>Clear</button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ FLOOR ANALYSIS */}
      {tab === "floors" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <ChartCard title="Average Price by Floor">
            <ResponsiveContainer width="100%" height={Math.max(240, floorChartData.length * 36)}>
              <BarChart data={floorChartData} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="floor" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={({ active, payload }) => {
                  if (!active||!payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.35)", borderRadius:8, padding:"10px 14px", fontSize:12 }}>
                      <div style={{ color:"#E8A838", fontWeight:600, marginBottom:3 }}>Floor {d?.floor}</div>
                      <div>Units: <strong>{d?.count}</strong></div>
                      <div>Min: <strong style={{ color:"#3DAA6E" }}>{fmt(d?.min_price)}</strong></div>
                      <div>Avg: <strong style={{ color:"#E8A838" }}>{fmt(d?.avg_price)}</strong></div>
                      <div>Max: <strong style={{ color:"#C0392B" }}>{fmt(d?.max_price)}</strong></div>
                    </div>
                  );
                }} />
                <Bar dataKey="avg_price" name="Avg Price" radius={[0,5,5,0]}>
                  {floorChartData.map((d, i) => {
                    const pct = floorChartData.length > 1 ? i/(floorChartData.length-1) : 0.5;
                    const r = Math.round(42+pct*(232-42)), g = Math.round(100+pct*(168-100)), b = Math.round(150-pct*100);
                    return <Cell key={i} fill={`rgb(${r},${g},${b})`} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Floor Price Detail">
            <div style={{ overflowY:"auto", maxHeight:320 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                    {["Floor","Units","Min","Avg","Max"].map(h => (
                      <th key={h} style={{ padding:"6px 10px", textAlign: h==="Floor"?"left":"right", color:"#3a4555", fontSize:10, textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {floorChartData.map((d,i) => (
                    <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding:"7px 10px", fontWeight:600, color:"#f0e8d5" }}>{d.floor}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#8fa0b0" }}>{d.count}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#3DAA6E" }}>{fmt(d.min_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#E8A838", fontWeight:600 }}>{fmt(d.avg_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#C0392B" }}>{fmt(d.max_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard title="All Unit Prices by Floor" span={2}>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top:10, right:20, bottom:30, left:10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="floor_num" name="Floor" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false}
                  label={{ value:"Floor Number", position:"insideBottom", fill:"#8fa0b0", fontSize:11, dy:18 }} />
                <YAxis type="number" dataKey="price" name="Price" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ strokeDasharray:"3 3" }} content={({ active, payload }) => {
                  if (!active||!payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.35)", borderRadius:8, padding:"10px 14px", fontSize:12 }}>
                      <div style={{ color:UNIT_COLORS[d?.unit_type]||"#E8A838", fontWeight:600 }}>{d?.unit_type}</div>
                      <div>Floor: <strong>{d?.floor_num}</strong></div>
                      <div>Price: <strong>{fmtFull(d?.price)}</strong></div>
                      <div>Size: <strong>{d?.size} m²</strong></div>
                    </div>
                  );
                }} />
                <Scatter data={floorPriceData} shape={(props) => {
                  const d = props.payload;
                  const sel = selectedApts.has(d.sub_listing_id);
                  return <circle cx={props.cx} cy={props.cy} r={sel?7:5} fill={UNIT_COLORS[d.unit_type]||"#E8A838"} opacity={sel?1:0.7} stroke={sel?"#fff":"none"} strokeWidth={sel?1.5:0} />;
                }} />
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", gap:14, marginTop:8, flexWrap:"wrap" }}>
              {allUnitTypes.map(ut => (
                <div key={ut} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#8fa0b0" }}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:UNIT_COLORS[ut]||"#aaa" }} />{ut}
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}

      {/* ════════════════════════════════════════════ COMPARE */}
      {tab === "compare" && (
        <div>
          {selectedList.length < 2 ? (
            <div style={{ padding:40, textAlign:"center", color:"#8fa0b0" }}>
              <div style={{ fontSize:16, marginBottom:12 }}>Select at least 2 apartments to compare</div>
              <button onClick={() => setTab("apartments")} style={{ background:"rgba(232,168,56,0.18)", border:"1px solid rgba(232,168,56,0.4)", color:"#E8A838", padding:"8px 18px", borderRadius:8, cursor:"pointer", fontSize:13 }}>
                Go to Apartments &rarr;
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                <ChartCard title="Price Comparison">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={selectedList.map((a,i) => ({ name:`Apt ${i+1} (${a.floor||"?"})`, price:a.price, unit_type:a.unit_type }))} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill:"#8fa0b0", fontSize:10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="price" name="Price" radius={[5,5,0,0]}>
                        {selectedList.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Price per m² Comparison">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={selectedList.map((a,i) => ({ name:`Apt ${i+1} (${a.floor||"?"})`, price_per_m2:a.price_per_m2 }))} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill:"#8fa0b0", fontSize:10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v=>`€${v}`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="price_per_m2" name="EUR/m2" radius={[5,5,0,0]}>
                        {selectedList.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:14 }}>
                {selectedList.map((apt, i) => (
                  <div key={apt.sub_listing_id} style={{ background:"rgba(255,255,255,0.03)", border:`2px solid ${COLORS[i%COLORS.length]}55`, borderRadius:12, padding:"16px 18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <div style={{ fontWeight:700, color:COLORS[i%COLORS.length], fontSize:15 }}>Apt {i+1}</div>
                      <button onClick={() => toggleApt(apt.sub_listing_id)} style={{ background:"none", border:"none", color:"#3a4555", cursor:"pointer", fontSize:16, padding:0 }}>&times;</button>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 12px", fontSize:12 }}>
                      {[
                        ["Type",       apt.unit_type,                              UNIT_COLORS[apt.unit_type]||"#aaa"],
                        ["Floor",      apt.floor||"—",                             "#f0e8d5"],
                        ["Price",      fmtFull(apt.price),                         "#E8A838"],
                        ["Size",       `${apt.size} m²`,                      "#f0e8d5"],
                        ["€/m²", fmt(apt.price_per_m2),                  "#f0e8d5"],
                        ["Bedrooms",   apt.bedrooms??"-",                          "#f0e8d5"],
                        ["Bathrooms",  apt.bathrooms??"-",                         "#f0e8d5"],
                        ["Floor Area", apt.floor_area_m2?`${apt.floor_area_m2}m²`:"—", "#f0e8d5"],
                      ].map(([label, val, color]) => (
                        <div key={label}>
                          <div style={{ color:"#3a4555", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</div>
                          <div style={{ color, fontWeight:600 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:10, display:"flex", gap:4, flexWrap:"wrap" }}>
                      <Pill on={apt.has_terrace}   label="Terrace" />
                      <Pill on={apt.has_parking}   label="Parking" />
                      <Pill on={apt.has_pool}      label="Pool" />
                      <Pill on={apt.has_ac}        label="A/C" />
                      <Pill on={apt.has_storage}   label="Storage" />
                      <Pill on={apt.has_wardrobes} label="Wardrobes" />
                      <Pill on={apt.has_lift}      label="Lift" />
                      <Pill on={apt.has_garden}    label="Garden" />
                    </div>
                    {apt.unit_url && (
                      <a href={apt.unit_url} target="_blank" rel="noreferrer"
                        style={{ display:"block", marginTop:10, color:"#2A6496", fontSize:11, textDecoration:"none" }}>
                        View on Idealista &#8599;
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
