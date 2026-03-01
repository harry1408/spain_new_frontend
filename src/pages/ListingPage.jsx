import { useState, useEffect, useMemo } from "react";
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,
         ScatterChart,Scatter,Cell,LineChart,Line,Legend,ReferenceLine } from "recharts";
import { StatCard,ChartCard,Tag,Pill,fmt,fmtFull,COLORS,UNIT_COLORS,ESG_COLORS } from "../components/shared.jsx";
import { API } from "../App.jsx";
import PriceMatrixTab from "./PriceMatrixTab.jsx";

function NoDataNote({ msg }) {
  return (
    <div style={{ height:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
      <div style={{ fontSize:28 }}>📅</div>
      <div style={{ color:"#8fa0b0", fontSize:13 }}>{msg}</div>
      <div style={{ color:"#3a4555", fontSize:11 }}>Will populate as more monthly snapshots are collected</div>
    </div>
  );
}

export default function ListingPage({ listingId, onBack }) {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [selectedApts, setSelectedApts] = useState(new Set());
  const [unitTypeFilter, setUnitTypeFilter] = useState([]);
  const [sortCol, setSortCol]         = useState("price");
  const [sortDir, setSortDir]         = useState("asc");
  const [tab, setTab]                 = useState("matrix");
  // apartment timeline: which apt is being tracked
  const [trackedApt, setTrackedApt]   = useState(null);

  useEffect(() => {
    setLoading(true);
    setSelectedApts(new Set());
    setTab("matrix");
    setTrackedApt(null);
    fetch(`${API}/drilldown/listing/${listingId}`)
      .then(r=>r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [listingId]);

  const toggleApt = (id) => setSelectedApts(prev => {
    const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n;
  });

  // ── ALL hooks before any early returns ──────────────────────────────────
  const apartments = useMemo(() => {
    if (!data?.apartments) return [];
    let apts = data.apartments;
    if (unitTypeFilter.length > 0) apts = apts.filter(a => unitTypeFilter.includes(a.unit_type));
    return [...apts].sort((a,b) => {
      const av = a[sortCol]??-Infinity, bv = b[sortCol]??-Infinity;
      return sortDir==="asc" ? av-bv : bv-av;
    });
  }, [data, unitTypeFilter, sortCol, sortDir]);

  const selectedList = useMemo(() => {
    if (!data?.apartments) return [];
    return data.apartments.filter(a => selectedApts.has(a.sub_listing_id));
  }, [data, selectedApts]);

  const floorPriceData = useMemo(() => data?.floor_price||[], [data]);

  const floorChartData = useMemo(() => {
    const map = {};
    floorPriceData.forEach(d => {
      if (d.floor_num==null) return;
      if (!map[d.floor_num]) map[d.floor_num] = { floor: d.floor_num===0?"GF":`F${d.floor_num}`, floor_num:d.floor_num, prices:[] };
      map[d.floor_num].prices.push(d.price);
    });
    return Object.values(map).sort((a,b)=>a.floor_num-b.floor_num).map(d=>({
      ...d, count:d.prices.length,
      avg_price: Math.round(d.prices.reduce((s,v)=>s+v,0)/d.prices.length),
      min_price: Math.min(...d.prices), max_price: Math.max(...d.prices),
    }));
  }, [floorPriceData]);

  const allUnitTypes = useMemo(() => [...new Set((data?.apartments||[]).map(a=>a.unit_type))], [data]);

  // listing trend data
  const listingTrend  = useMemo(() => data?.listing_trend||[], [data]);
  const utTrend       = useMemo(() => data?.unit_type_trend||[], [data]);
  const aptTrend      = useMemo(() => data?.apt_trend||[], [data]);
  const hasTrend      = listingTrend.length >= 2;

  // unit-type trend: pivot by period
  const utByPeriod = useMemo(() => {
    const map = {};
    utTrend.forEach(r => {
      if (!map[r.period]) map[r.period] = { period:r.period };
      map[r.period][r.unit_type] = r.avg_price;
    });
    return Object.values(map);
  }, [utTrend]);

  // per-apt timeline: build a series per apartment
  const aptTimelines = useMemo(() => {
    const byApt = {};
    aptTrend.forEach(r => {
      if (!byApt[r.sub_listing_id]) byApt[r.sub_listing_id] = {
        sub_listing_id: r.sub_listing_id,
        unit_type: r.unit_type, floor: r.floor, size: r.size,
        bedrooms: r.bedrooms, unit_url: r.unit_url, points: []
      };
      byApt[r.sub_listing_id].points.push({ period:r.period, price:r.price, price_per_m2:r.price_per_m2 });
    });
    return Object.values(byApt);
  }, [aptTrend]);

  // data for the apartment comparison over time chart
  const trackedAptData = useMemo(() => {
    if (!trackedApt) return [];
    return aptTimelines.find(a=>a.sub_listing_id===trackedApt)?.points||[];
  }, [trackedApt, aptTimelines]);

  // For multi-apt overlay: pivot apt timelines into period rows
  const aptComparisonData = useMemo(() => {
    const periods = [...new Set(aptTrend.map(r=>r.period))].sort();
    return periods.map(period => {
      const row = { period };
      selectedApts.forEach(id => {
        const at = aptTimelines.find(a=>a.sub_listing_id===id);
        if (at) {
          const pt = at.points.find(p=>p.period===period);
          if (pt) row[`apt_${id}`] = pt.price;
        }
      });
      return row;
    });
  }, [selectedApts, aptTimelines, aptTrend]);

  const utTrendLines = useMemo(() => [...new Set(utTrend.map(r=>r.unit_type))], [utTrend]);

  // ── Early returns (after all hooks) ───────────────────────────────────
  if (loading) return <div style={{ padding:60, textAlign:"center", color:"#8fa0b0" }}>Loading…</div>;
  if (!data||!data.listing_id) return <div style={{ padding:60, textAlign:"center", color:"#8fa0b0" }}>Listing not found.</div>;

  const esgColor = ESG_COLORS[data.esg_grade]||"#555";

  const TABS = [
    ["matrix","Overview"],
    ["detail","Unit Summary"],
    ["apartments","All Apartments"],
    ["compare",`Compare${selectedApts.size>0?` (${selectedApts.size})`:""}`],
    ["overtime","Over Time 📈"],
  ];

  return (
    <div style={{ padding:"24px 36px", maxWidth:1500, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <h2 style={{ margin:0, fontFamily:"'DM Serif Display',serif", fontSize:26, color:"#f0e8d5" }}>{data.property_name}</h2>
            {data.esg_grade&&<Tag label={`ESG ${data.esg_grade}`} color={esgColor}/>}
          </div>
          <div style={{ color:"#8fa0b0", fontSize:12 }}>
            by <span style={{ color:"#f0e8d5" }}>{data.developer}</span>
            {" · "}
            <span style={{ color:"#E8A838" }}>{data.municipality}</span>
            {" · "}
            <span>{data.delivery_date?.replace("Delivery : ","")}</span>
            {" · "}
            <span style={{ color:"#3DAA6E" }}>{data.total_units} apartments</span>
          </div>
        </div>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"#8fa0b0", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:12 }}>
          ← Back to {data.municipality}
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap" }}>
        <StatCard label="Total Apartments" value={data.total_units} />
        {data.unit_comparison.slice(0,5).map(u=>(
          <StatCard key={u.unit_type} label={u.unit_type} value={fmt(u.avg_price)}
            sub={`${u.count} units · from ${fmt(u.min_price)}`} accent={UNIT_COLORS[u.unit_type]} />
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid rgba(255,255,255,0.08)", marginBottom:20 }}>
        {TABS.map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            background:"none", border:"none", cursor:"pointer", padding:"10px 18px",
            borderBottom: tab===id?"2px solid #E8A838":"2px solid transparent",
            color: tab===id?"#E8A838":"#8fa0b0", fontSize:13, fontWeight:tab===id?600:400
          }}>{lbl}</button>
        ))}
      </div>

      {/* ═══════════════════════════════════ PRICE MATRIX (default overview) */}
      {tab==="matrix" && (
        <PriceMatrixTab listingId={listingId} />
      )}

      {/* ═══════════════════════════════════ UNIT SUMMARY */}
      {tab==="detail" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <ChartCard title="Price Range by Unit Type">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.unit_comparison} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="unit_type" tick={{ fill:"#8fa0b0", fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v)=>[fmtFull(v)]} contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                <Bar dataKey="avg_price" name="Avg Price" radius={[5,5,0,0]}>
                  {data.unit_comparison.map((e,i)=><Cell key={i} fill={UNIT_COLORS[e.unit_type]||COLORS[i]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Unit Type Summary">
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                    {["Type","Count","Min","Avg","Max","Avg m²","€/m²"].map(h=>(
                      <th key={h} style={{ padding:"6px 10px", textAlign:"right", color:"#3a4555", fontSize:10, textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.unit_comparison.map((u,i)=>(
                    <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding:"7px 10px" }}><span style={{ color:UNIT_COLORS[u.unit_type], fontWeight:600 }}>{u.unit_type}</span></td>
                      <td style={{ padding:"7px 10px", textAlign:"right" }}>{u.count}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#3DAA6E" }}>{fmt(u.min_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#E8A838", fontWeight:600 }}>{fmt(u.avg_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:"#C0392B" }}>{fmt(u.max_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right" }}>{u.avg_size} m²</td>
                      <td style={{ padding:"7px 10px", textAlign:"right" }}>{fmt(u.avg_price_m2)}</td>
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
                <XAxis dataKey="size" name="Size" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} label={{ value:"Size (m²)", position:"insideBottom", fill:"#8fa0b0", fontSize:11, dy:18 }} />
                <YAxis dataKey="price" name="Price" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ strokeDasharray:"3 3" }} content={({ active,payload }) => {
                  if (!active||!payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (<div style={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.35)", borderRadius:8, padding:"10px 14px", fontSize:12 }}>
                    <div style={{ color:UNIT_COLORS[d?.unit_type]||"#E8A838", fontWeight:600, marginBottom:3 }}>{d?.unit_type}</div>
                    <div>Floor: <strong>{d?.floor||"—"}</strong></div>
                    <div>Size: <strong>{d?.size} m²</strong></div>
                    <div>Price: <strong>{fmtFull(d?.price)}</strong></div>
                  </div>);
                }} />
                <Scatter data={data.apartments} shape={(props) => {
                  const apt=props.payload;
                  const sel=selectedApts.has(apt.sub_listing_id);
                  return <circle cx={props.cx} cy={props.cy} r={sel?7:5} fill={UNIT_COLORS[apt.unit_type]||"#E8A838"} opacity={sel?1:0.6} stroke={sel?"#fff":"none"} strokeWidth={sel?1.5:0} style={{ cursor:"pointer" }} onClick={()=>toggleApt(apt.sub_listing_id)} />;
                }} />
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ color:"#3a4555", fontSize:11, marginTop:4 }}>Click dots to select for comparison</div>
          </ChartCard>
        </div>
      )}

      {/* ═══════════════════════════════════ APARTMENTS */}
      {tab==="apartments" && (
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center", flexWrap:"wrap" }}>
            {allUnitTypes.map(ut=>(
              <button key={ut} onClick={()=>setUnitTypeFilter(prev=>prev.includes(ut)?prev.filter(x=>x!==ut):[...prev,ut])}
                style={{ background:unitTypeFilter.includes(ut)?`${UNIT_COLORS[ut]}22`:"rgba(255,255,255,0.04)", border:`1px solid ${unitTypeFilter.includes(ut)?UNIT_COLORS[ut]:"rgba(255,255,255,0.1)"}`, color:unitTypeFilter.includes(ut)?UNIT_COLORS[ut]:"#8fa0b0", padding:"5px 11px", borderRadius:5, cursor:"pointer", fontSize:11 }}>{ut}</button>
            ))}
            <div style={{ marginLeft:"auto", color:"#8fa0b0", fontSize:12, display:"flex", gap:12, alignItems:"center" }}>
              {selectedApts.size>0&&<span style={{ color:"#E8A838", cursor:"pointer" }} onClick={()=>setTab("compare")}>{selectedApts.size} selected → Compare</span>}
              {apartments.length} apartments
            </div>
          </div>

          <div style={{ overflowX:"auto", borderRadius:12, border:"1px solid rgba(255,255,255,0.07)" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ padding:"10px 12px", width:36 }}></th>
                  {[["unit_type","Type"],["floor","Floor"],["price","Price"],["size","Size"],["price_per_m2","€/m²"],["bedrooms","Beds"],["bathrooms","Baths"],["floor_area_m2","Floor Area"],["","Amenities"]].map(([col,lbl])=>(
                    <th key={lbl} onClick={()=>col&&(col===sortCol?setSortDir(d=>d==="asc"?"desc":"asc"):(setSortCol(col),setSortDir("asc")))}
                      style={{ padding:"10px 12px", textAlign:"right", color:sortCol===col?"#E8A838":"#3a4555", fontSize:10, textTransform:"uppercase", cursor:col?"pointer":"default", whiteSpace:"nowrap" }}>
                      {lbl}{sortCol===col?(sortDir==="asc"?" ↑":" ↓"):""}
                    </th>
                  ))}
                  <th style={{ padding:"10px 12px", textAlign:"center", color:"#3a4555", fontSize:10, textTransform:"uppercase" }}>Track / Link</th>
                </tr>
              </thead>
              <tbody>
                {apartments.map((apt,i)=>{
                  const isSel = selectedApts.has(apt.sub_listing_id);
                  const isTracked = trackedApt===apt.sub_listing_id;
                  return (
                    <tr key={apt.sub_listing_id}
                      style={{ background:isSel?"rgba(232,168,56,0.07)":i%2===0?"rgba(255,255,255,0.015)":"transparent", borderBottom:"1px solid rgba(255,255,255,0.05)", cursor:"pointer" }}
                      onClick={()=>toggleApt(apt.sub_listing_id)}>
                      <td style={{ padding:"8px 12px" }}>
                        <div style={{ width:14, height:14, borderRadius:3, border:`2px solid ${isSel?"#E8A838":"rgba(255,255,255,0.2)"}`, background:isSel?"#E8A838":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {isSel&&<span style={{ color:"#0e1118", fontSize:9, fontWeight:900 }}>✓</span>}
                        </div>
                      </td>
                      <td style={{ padding:"8px 12px" }}><span style={{ color:UNIT_COLORS[apt.unit_type]||"#aaa", fontWeight:600 }}>{apt.unit_type}</span></td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#f0e8d5" }}>{apt.floor||"—"}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#E8A838", fontWeight:700, fontSize:13 }}>{fmtFull(apt.price)}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right" }}>{apt.size} m²</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#8fa0b0" }}>{fmt(apt.price_per_m2)}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right" }}>{apt.bedrooms??"-"}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right" }}>{apt.bathrooms??"-"}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right" }}>{apt.floor_area_m2?`${apt.floor_area_m2} m²`:"—"}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right" }}>
                        <div style={{ display:"flex", gap:3, justifyContent:"flex-end", flexWrap:"wrap" }}>
                          <Pill on={apt.has_terrace} label="T"/><Pill on={apt.has_parking} label="P"/>
                          <Pill on={apt.has_pool}    label="Pool"/><Pill on={apt.has_ac}   label="AC"/>
                          <Pill on={apt.has_storage} label="Str"/><Pill on={apt.has_lift}  label="Lift"/>
                        </div>
                      </td>
                      <td style={{ padding:"8px 12px", textAlign:"center" }} onClick={e=>e.stopPropagation()}>
                        <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                          <button onClick={()=>{ setTrackedApt(apt.sub_listing_id); setTab("overtime"); }}
                            title="Track this apartment over time"
                            style={{ background:isTracked?"rgba(232,168,56,0.2)":"rgba(255,255,255,0.06)", border:`1px solid ${isTracked?"#E8A838":"rgba(255,255,255,0.15)"}`, color:isTracked?"#E8A838":"#8fa0b0", borderRadius:5, padding:"3px 8px", cursor:"pointer", fontSize:10 }}>📈</button>
                          {apt.unit_url&&<a href={apt.unit_url} target="_blank" rel="noreferrer" style={{ color:"#2A6496", fontSize:11, textDecoration:"none" }}>↗</a>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedApts.size>0&&(
            <div style={{ marginTop:12, display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ color:"#8fa0b0", fontSize:12 }}>{selectedApts.size} selected</span>
              <button onClick={()=>setTab("compare")} style={{ background:"rgba(232,168,56,0.18)", border:"1px solid rgba(232,168,56,0.4)", color:"#E8A838", padding:"7px 16px", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600 }}>Compare Selected →</button>
              <button onClick={()=>setSelectedApts(new Set())} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"#8fa0b0", padding:"7px 12px", borderRadius:7, cursor:"pointer", fontSize:11 }}>Clear</button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════ COMPARE */}
      {tab==="compare" && (
        <div>
          {selectedList.length < 2 ? (
            <div style={{ padding:40, textAlign:"center", color:"#8fa0b0" }}>
              <div style={{ fontSize:16, marginBottom:12 }}>Select at least 2 apartments to compare</div>
              <button onClick={()=>setTab("apartments")} style={{ background:"rgba(232,168,56,0.18)", border:"1px solid rgba(232,168,56,0.4)", color:"#E8A838", padding:"8px 18px", borderRadius:8, cursor:"pointer", fontSize:13 }}>Go to Apartments →</button>
            </div>
          ) : (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                <ChartCard title="Price Comparison">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={selectedList.map((a,i)=>({ name:`Apt ${i+1} (${a.floor||"?"})`, price:a.price, type:a.unit_type }))} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill:"#8fa0b0", fontSize:10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v)=>[fmtFull(v)]} contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                      <Bar dataKey="price" name="Price" radius={[5,5,0,0]}>
                        {selectedList.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Price per m² Comparison">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={selectedList.map((a,i)=>({ name:`Apt ${i+1} (${a.floor||"?"})`, price_per_m2:a.price_per_m2 }))} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill:"#8fa0b0", fontSize:10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v=>`€${v}`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v)=>[`€${v}`]} contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                      <Bar dataKey="price_per_m2" name="€/m²" radius={[5,5,0,0]}>
                        {selectedList.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:14 }}>
                {selectedList.map((apt,i)=>(
                  <div key={apt.sub_listing_id} style={{ background:"rgba(255,255,255,0.03)", border:`2px solid ${COLORS[i%COLORS.length]}55`, borderRadius:12, padding:"16px 18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <div style={{ fontWeight:700, color:COLORS[i%COLORS.length], fontSize:15 }}>Apt {i+1}</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>{ setTrackedApt(apt.sub_listing_id); setTab("overtime"); }} title="Track over time" style={{ background:"none", border:"1px solid rgba(232,168,56,0.3)", color:"#E8A838", borderRadius:5, padding:"2px 7px", cursor:"pointer", fontSize:10 }}>📈 Track</button>
                        <button onClick={()=>toggleApt(apt.sub_listing_id)} style={{ background:"none", border:"none", color:"#3a4555", cursor:"pointer", fontSize:16 }}>×</button>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 12px", fontSize:12 }}>
                      {[["Type",apt.unit_type,UNIT_COLORS[apt.unit_type]||"#aaa"],
                        ["Floor",apt.floor||"—","#f0e8d5"],
                        ["Price",fmtFull(apt.price),"#E8A838"],
                        ["Size",`${apt.size} m²`,"#f0e8d5"],
                        ["€/m²",fmt(apt.price_per_m2),"#f0e8d5"],
                        ["Beds",apt.bedrooms??"-","#f0e8d5"],
                        ["Baths",apt.bathrooms??"-","#f0e8d5"],
                        ["Floor Area",apt.floor_area_m2?`${apt.floor_area_m2}m²`:"—","#f0e8d5"],
                      ].map(([label,val,color])=>(
                        <div key={label}>
                          <div style={{ color:"#3a4555", fontSize:10, textTransform:"uppercase" }}>{label}</div>
                          <div style={{ color, fontWeight:600 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:10, display:"flex", gap:4, flexWrap:"wrap" }}>
                      <Pill on={apt.has_terrace} label="Terrace"/><Pill on={apt.has_parking} label="Parking"/>
                      <Pill on={apt.has_pool} label="Pool"/><Pill on={apt.has_ac} label="A/C"/>
                      <Pill on={apt.has_storage} label="Storage"/><Pill on={apt.has_lift} label="Lift"/>
                    </div>
                    {apt.unit_url&&<a href={apt.unit_url} target="_blank" rel="noreferrer" style={{ display:"block", marginTop:10, color:"#2A6496", fontSize:11, textDecoration:"none" }}>View on Idealista ↗</a>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════ OVER TIME 📈 */}
      {tab==="overtime" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

          {/* ─ Listing-level avg price trend ─ */}
          <ChartCard title="Development Avg Price Over Time">
            {!hasTrend
              ? <NoDataNote msg="Need 2+ monthly snapshots for trend lines" />
              : <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={listingTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="p" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="m" orientation="right" tickFormatter={v=>`€${v}`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v,n)=>n==="Avg Price"?[fmtFull(v),n]:n==="Avg €/m²"?[`€${v}`,n]:[v,n]} contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                    <Line yAxisId="p" type="monotone" dataKey="avg_price"    name="Avg Price" stroke="#E8A838" strokeWidth={2.5} dot={{ r:5, fill:"#E8A838" }}/>
                    <Line yAxisId="p" type="monotone" dataKey="min_price"    name="Min Price" stroke="#3DAA6E" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r:3 }}/>
                    <Line yAxisId="p" type="monotone" dataKey="max_price"    name="Max Price" stroke="#C0392B" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r:3 }}/>
                    <Line yAxisId="m" type="monotone" dataKey="avg_price_m2" name="Avg €/m²"  stroke="#5B9BD5" strokeWidth={2} strokeDasharray="5 3" dot={{ r:4, fill:"#5B9BD5" }}/>
                  </LineChart>
                </ResponsiveContainer>}
          </ChartCard>

          {/* ─ Inventory over time ─ */}
          <ChartCard title="Units Available Over Time">
            {!hasTrend
              ? <NoDataNote msg="Need 2+ monthly snapshots" />
              : <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={listingTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                    <Bar dataKey="total_units" name="Units Available" fill="#5B9BD5" radius={[5,5,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>}
          </ChartCard>

          {/* ─ Price by unit type over time ─ */}
          <ChartCard title="Price Trend by Unit Type">
            {utByPeriod.length < 2
              ? <NoDataNote msg="Need 2+ monthly snapshots" />
              : <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={utByPeriod}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v)=>[fmtFull(v)]} contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                    {utTrendLines.map(ut=>(
                      <Line key={ut} type="monotone" dataKey={ut} stroke={UNIT_COLORS[ut]||"#aaa"} strokeWidth={2} dot={{ r:4, fill:UNIT_COLORS[ut]||"#aaa" }}/>
                    ))}
                  </LineChart>
                </ResponsiveContainer>}
          </ChartCard>

          {/* ─ Snapshot comparison table ─ */}
          <ChartCard title="Period-by-Period Snapshot">
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                  {["Period","Min","Avg Price","Max","Avg €/m²","Units"].map(h=>(
                    <th key={h} style={{ padding:"6px 10px", textAlign:"right", color:"#3a4555", fontSize:10, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listingTrend.map((row,i)=>(
                  <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.05)", background:i===listingTrend.length-1?"rgba(232,168,56,0.05)":"transparent" }}>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:i===listingTrend.length-1?"#E8A838":"#f0e8d5", fontWeight:i===listingTrend.length-1?600:400 }}>{row.period} {i===listingTrend.length-1&&"★"}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:"#3DAA6E" }}>{fmt(row.min_price)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:"#E8A838", fontWeight:600 }}>{fmt(row.avg_price)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:"#C0392B" }}>{fmt(row.max_price)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right" }}>€{row.avg_price_m2}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right" }}>{row.total_units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>

          {/* ─ Individual apartment price history ─ */}
          <ChartCard title="Individual Apartment Price History" span={2}>
            {/* Apt selector */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {aptTimelines.map(apt=>{
                const isT = trackedApt===apt.sub_listing_id;
                return (
                  <button key={apt.sub_listing_id}
                    onClick={()=>setTrackedApt(isT?null:apt.sub_listing_id)}
                    style={{ background:isT?`${UNIT_COLORS[apt.unit_type]||"#E8A838"}22`:"rgba(255,255,255,0.04)", border:`1px solid ${isT?UNIT_COLORS[apt.unit_type]||"#E8A838":"rgba(255,255,255,0.1)"}`, color:isT?UNIT_COLORS[apt.unit_type]||"#E8A838":"#8fa0b0", padding:"5px 11px", borderRadius:6, cursor:"pointer", fontSize:11 }}>
                    {apt.unit_type} · {apt.floor||"?"} {apt.size&&`· ${apt.size}m²`}
                  </button>
                );
              })}
            </div>

            {!trackedApt
              ? <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", color:"#3a4555", fontSize:13 }}>Select an apartment above to see its price history</div>
              : trackedAptData.length < 2
                ? <NoDataNote msg="This apartment needs 2+ snapshots for a trend line" />
                : (() => {
                    const apt = aptTimelines.find(a=>a.sub_listing_id===trackedApt);
                    const firstPrice = trackedAptData[0]?.price;
                    const lastPrice  = trackedAptData[trackedAptData.length-1]?.price;
                    const totalChange = lastPrice - firstPrice;
                    const pctChange   = firstPrice ? ((totalChange/firstPrice)*100).toFixed(2) : 0;
                    return (
                      <div>
                        <div style={{ display:"flex", gap:16, marginBottom:12, flexWrap:"wrap" }}>
                          <div style={{ fontSize:12 }}>
                            <span style={{ color:"#3a4555" }}>Apartment: </span>
                            <span style={{ color:UNIT_COLORS[apt?.unit_type]||"#E8A838", fontWeight:600 }}>{apt?.unit_type}</span>
                            <span style={{ color:"#8fa0b0" }}> · Floor: {apt?.floor||"?"} · {apt?.size}m² · {apt?.bedrooms} bed</span>
                          </div>
                          <div style={{ fontSize:12 }}>
                            <span style={{ color:"#3a4555" }}>Change: </span>
                            <span style={{ color: totalChange>0?"#C0392B":totalChange<0?"#3DAA6E":"#8fa0b0", fontWeight:600 }}>
                              {totalChange===0?"No change":`${totalChange>0?"▲":"▼"} ${fmtFull(Math.abs(totalChange))} (${Math.abs(pctChange)}%)`}
                            </span>
                          </div>
                          {apt?.unit_url&&<a href={apt.unit_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:"#2A6496", textDecoration:"none" }}>View on Idealista ↗</a>}
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={trackedAptData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="period" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="p" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="m" orientation="right" tickFormatter={v=>`€${v}`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v,n)=>n==="Price"?[fmtFull(v),n]:[`€${v}`,n]} contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                            <Legend wrapperStyle={{ fontSize:11 }} />
                            <Line yAxisId="p" type="monotone" dataKey="price" name="Price" stroke={UNIT_COLORS[apt?.unit_type]||"#E8A838"} strokeWidth={3} dot={{ r:6, fill:UNIT_COLORS[apt?.unit_type]||"#E8A838", strokeWidth:2, stroke:"#fff" }}/>
                            <Line yAxisId="m" type="monotone" dataKey="price_per_m2" name="€/m²" stroke="#5B9BD5" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r:4, fill:"#5B9BD5" }}/>
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()
            }
          </ChartCard>

          {/* ─ Multi-apartment price comparison over time ─ */}
          {selectedApts.size >= 2 && (
            <ChartCard title={`Selected Apartments Price Over Time (${selectedApts.size} apartments)`} span={2}>
              {aptComparisonData.length < 2
                ? <NoDataNote msg="Need 2+ monthly snapshots" />
                : <div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                      {selectedList.map((apt,i)=>(
                        <div key={apt.sub_listing_id} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#8fa0b0" }}>
                          <div style={{ width:10, height:3, background:COLORS[i%COLORS.length] }}/>
                          <span style={{ color:COLORS[i%COLORS.length], fontWeight:600 }}>Apt {i+1}</span>
                          <span>{apt.unit_type} · {apt.floor||"?"} · {fmtFull(apt.price)}</span>
                        </div>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={aptComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="period" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v)=>[fmtFull(v)]} contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                        <Legend wrapperStyle={{ fontSize:11 }} />
                        {selectedList.map((apt,i)=>(
                          <Line key={apt.sub_listing_id} type="monotone" dataKey={`apt_${apt.sub_listing_id}`}
                            name={`Apt ${i+1} (${apt.unit_type} ${apt.floor||""})`}
                            stroke={COLORS[i%COLORS.length]} strokeWidth={2.5} dot={{ r:5, fill:COLORS[i%COLORS.length] }}/>
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
              }
            </ChartCard>
          )}
        </div>
      )}
    </div>
  );
}
