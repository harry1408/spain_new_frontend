import { useState, useEffect, useMemo } from "react";
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,
         ScatterChart,Scatter,Cell,LineChart,Line,Legend } from "recharts";
import { T,ChartCard,Tag,Pill,fmt,fmtFull,COLORS,UNIT_COLORS,ESG_COLORS } from "../components/shared.jsx";
import { API } from "../App.jsx";
import PriceMatrixTab from "./PriceMatrixTab.jsx";

function NoDataNote({ msg }) {
  return (
    <div style={{ height:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
      <div style={{ fontSize:28 }}>📅</div>
      <div style={{ color:T.textSub, fontSize:13 }}>{msg}</div>
      <div style={{ color:T.textMuted, fontSize:11 }}>Will populate as more snapshots are collected</div>
    </div>
  );
}

export default function ListingPage({ listingId, municipality, onBack }) {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [meta,          setMeta]          = useState(null);
  const [nearby,        setNearby]        = useState(null);
  const [nearbyApts,    setNearbyApts]    = useState(null);
  const [selectedApts,  setSelectedApts]  = useState(new Set());
  const [unitTypeFilter,setUnitTypeFilter]= useState([]);
  const [sortCol,       setSortCol]       = useState("price");
  const [sortDir,       setSortDir]       = useState("asc");
  const [tab,           setTab]           = useState("matrix");
  const [trackedApt,    setTrackedApt]    = useState(null);
  const [activeMapPin,  setActiveMapPin]  = useState(null);
  const [nearbyUTF,     setNearbyUTF]     = useState("2BR");
  const [nearbySort,    setNearbySort]    = useState("price");
  const [compareSet,    setCompareSet]    = useState(new Set()); // for nearby comparison

  useEffect(() => {
    setLoading(true); setSelectedApts(new Set()); setTab("matrix");
    setTrackedApt(null); setNearby(null); setNearbyApts(null); setCompareSet(new Set());
    Promise.all([
      fetch(`${API}/drilldown/listing/${listingId}`).then(r=>r.json()),
      fetch(`${API}/listing/meta/${listingId}`).then(r=>r.json()),
      fetch(`${API}/nearby/listings/${listingId}`).then(r=>r.json()),
    ]).then(([d,m,nb]) => { setData(d); setMeta(m); setNearby(nb); setLoading(false); })
      .catch(() => setLoading(false));
  }, [listingId]);

  useEffect(() => {
    if (!listingId || !nearbyUTF) return;
    fetch(`${API}/nearby/apartments/${listingId}?unit_type=${encodeURIComponent(nearbyUTF)}`)
      .then(r=>r.json()).then(setNearbyApts).catch(()=>{});
  }, [listingId, nearbyUTF]);

  const toggleApt     = id => setSelectedApts(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleCompare = id => setCompareSet(prev  => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  // ── Memos ──────────────────────────────────────────────────────────────
  const apartments = useMemo(() => {
    if (!data?.apartments) return [];
    let apts = data.apartments;
    if (unitTypeFilter.length) apts = apts.filter(a => unitTypeFilter.includes(a.unit_type));
    return [...apts].sort((a,b) => {
      const av=a[sortCol]??-Infinity, bv=b[sortCol]??-Infinity;
      return sortDir==="asc"?av-bv:bv-av;
    });
  }, [data, unitTypeFilter, sortCol, sortDir]);

  const selectedList   = useMemo(() => (!data?.apartments?[]:data.apartments.filter(a=>selectedApts.has(a.sub_listing_id))), [data,selectedApts]);
  const allUnitTypes   = useMemo(() => [...new Set((data?.apartments||[]).map(a=>a.unit_type))], [data]);
  const listingTrend   = useMemo(() => data?.listing_trend||[], [data]);
  const aptTrend       = useMemo(() => data?.apt_trend||[], [data]);
  const utTrend        = useMemo(() => data?.unit_type_trend||[], [data]);
  const hasTrend       = listingTrend.length >= 2;

  const utByPeriod     = useMemo(() => {
    const map={};
    utTrend.forEach(r=>{ if(!map[r.period]) map[r.period]={period:r.period}; map[r.period][r.unit_type]=r.avg_price; });
    return Object.values(map);
  }, [utTrend]);
  const utTrendLines   = useMemo(() => [...new Set(utTrend.map(r=>r.unit_type))], [utTrend]);

  const aptTimelines   = useMemo(() => {
    const byApt={};
    aptTrend.forEach(r=>{
      if(!byApt[r.sub_listing_id]) byApt[r.sub_listing_id]={sub_listing_id:r.sub_listing_id,unit_type:r.unit_type,floor:r.floor,size:r.size,bedrooms:r.bedrooms,unit_url:r.unit_url,points:[]};
      byApt[r.sub_listing_id].points.push({period:r.period,price:r.price,price_per_m2:r.price_per_m2});
    });
    return Object.values(byApt);
  }, [aptTrend]);
  const trackedAptData = useMemo(()=>(!trackedApt?[]:aptTimelines.find(a=>a.sub_listing_id===trackedApt)?.points||[]),[trackedApt,aptTimelines]);

  // Map markers for this listing (single pin) + nearby
  const singleMarker = useMemo(() => meta?.lat ? [{
    id:       listingId,
    lat:      meta.lat, lng: meta.lng,
    label:    data?.property_name || "",
    sublabel: municipality || "",
    active:   true,
    color:    T.gold,
  }] : [], [meta, listingId, data, municipality]);

  const nearbyMapMarkers = useMemo(() => (nearby?.listings||[]).map(l => ({
    id:       l.listing_id,
    lat:      l.lat, lng: l.lng,
    label:    l.property_name,
    sublabel: `${fmt(l.avg_price)} · ${l.units} apts`,
    active:   l.listing_id===listingId || l.listing_id===activeMapPin,
    color:    l.listing_id===listingId ? T.gold : T.blue,
  })), [nearby, listingId, activeMapPin]);

  // Compare set apartments details (from nearbyApts)
  const compareApts = useMemo(() => (!nearbyApts?.apartments?[]:nearbyApts.apartments.filter(a=>compareSet.has(a.sub_listing_id))), [nearbyApts,compareSet]);

  const sortedNearbyApts = useMemo(() => {
    if (!nearbyApts?.apartments) return [];
    return [...nearbyApts.apartments].sort((a,b)=>(a[nearbySort]||0)-(b[nearbySort]||0));
  }, [nearbyApts, nearbySort]);

  // ── Early returns ──────────────────────────────────────────────────────
  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.textSub }}>Loading…</div>;
  if (!data?.listing_id) return <div style={{ padding:60, textAlign:"center", color:T.textSub }}>Listing not found.</div>;

  const esgColor = ESG_COLORS[data.esg_grade]||"#999";

  const TABS = [
    ["matrix","Overview"],
    ["detail","Unit Summary"],
    ["compare",`Compare${selectedApts.size>0?` (${selectedApts.size})`:""}`],
    ["overtime","Over Time 📈"],
    ["nearby","Nearby Comparison 🗺"],
  ];

  return (
    <div style={{ padding:"24px 36px", maxWidth:1500, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <h2 style={{ margin:0, fontFamily:"'DM Serif Display',serif", fontSize:24, color:T.text, fontWeight:400 }}>{data.property_name}</h2>
            {data.esg_grade&&<Tag label={`ESG ${data.esg_grade}`} color={esgColor}/>}
          </div>
          <div style={{ color:T.textSub, fontSize:12, marginBottom:4 }}>
            by <strong style={{ color:T.text }}>{data.developer}</strong>
            {" · "}<span style={{ color:T.gold, fontWeight:600 }}>{data.municipality}</span>
            {" · "}<span>{data.delivery_date?.replace("Delivery : ","")}</span>
            {" · "}<span style={{ color:T.green, fontWeight:600 }}>{data.total_units} apartments</span>
          </div>
          {meta?.city_area && (
            <div style={{ color:T.textMuted, fontSize:11, display:"flex", alignItems:"center", gap:4 }}>
              <span>📍</span>
              <span>{String(meta.city_area).replace(/ NN/g,"").replace(/,\s*Valencia\s*$/i,"").trim()}</span>
            </div>
          )}
        </div>
        <button onClick={onBack} style={{ background:"#fff", border:`1px solid ${T.border}`, color:T.textSub,
          padding:"8px 16px", borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:600, boxShadow:T.shadow }}>
          ← Back to {data.municipality}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${T.border}`, marginBottom:22 }}>
        {TABS.map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            background:"none", border:"none", cursor:"pointer", padding:"10px 18px",
            borderBottom:tab===id?`3px solid ${T.gold}`:"3px solid transparent",
            color:tab===id?T.gold:T.textSub, fontSize:13, fontWeight:tab===id?700:500 }}>{lbl}</button>
        ))}
      </div>

      {/* ══ OVERVIEW — Price Matrix + All Apartments ════════════════════ */}
      {tab==="matrix" && (
        <div>
          <PriceMatrixTab listingId={listingId} />
          <div style={{ marginTop:28 }}>
            <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text }}>
                All Apartments
                <span style={{ color:T.textMuted, fontWeight:400, fontSize:12, marginLeft:6 }}>({apartments.length})</span>
              </div>
              {allUnitTypes.map(ut=>(
                <button key={ut} onClick={()=>setUnitTypeFilter(prev=>prev.includes(ut)?prev.filter(x=>x!==ut):[...prev,ut])}
                  style={{ background:unitTypeFilter.includes(ut)?UNIT_COLORS[ut]||T.gold:"#fff",
                    border:`1px solid ${unitTypeFilter.includes(ut)?UNIT_COLORS[ut]||T.gold:T.border}`,
                    color:unitTypeFilter.includes(ut)?"#fff":T.textSub,
                    padding:"4px 10px", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:700 }}>{ut}</button>
              ))}
              {selectedApts.size>0&&(
                <span style={{ marginLeft:"auto", color:T.gold, cursor:"pointer", fontWeight:700, fontSize:12 }}
                  onClick={()=>setTab("compare")}>{selectedApts.size} selected → Compare ↑</span>
              )}
            </div>
            <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${T.border}`, boxShadow:T.shadow }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:T.bgStripe, borderBottom:`1px solid ${T.border}` }}>
                    <th style={{ padding:"10px 12px", width:36 }}></th>
                    {[["unit_type","Type"],["floor","Floor"],["price","Price"],["size","Size"],["price_per_m2","€/m²"],["bedrooms","Beds"],["bathrooms","Baths"],["","Amenities"]].map(([col,lbl])=>(
                      <th key={lbl} onClick={()=>col&&(col===sortCol?setSortDir(d=>d==="asc"?"desc":"asc"):(setSortCol(col),setSortDir("asc")))}
                        style={{ padding:"10px 12px", textAlign:"right", color:sortCol===col?T.gold:T.textMuted,
                          fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em", cursor:col?"pointer":"default", whiteSpace:"nowrap" }}>
                        {lbl}{sortCol===col?(sortDir==="asc"?" ↑":" ↓"):""}
                      </th>
                    ))}
                    <th style={{ padding:"10px 12px", textAlign:"center", color:T.textMuted, fontSize:10, textTransform:"uppercase" }}>Track/Link</th>
                  </tr>
                </thead>
                <tbody>
                  {apartments.map((apt,i)=>{
                    const isSel=selectedApts.has(apt.sub_listing_id);
                    const utColor=UNIT_COLORS[apt.unit_type]||"#aaa";
                    return (
                      <tr key={apt.sub_listing_id}
                        style={{ background:isSel?T.goldLight:i%2===0?T.bgStripe:"#fff",
                          borderBottom:`1px solid ${T.border}`, cursor:"pointer",
                          borderLeft:isSel?`3px solid ${T.gold}`:"3px solid transparent" }}
                        onClick={()=>toggleApt(apt.sub_listing_id)}>
                        <td style={{ padding:"9px 12px" }}>
                          <div style={{ width:15, height:15, borderRadius:3, border:`2px solid ${isSel?T.gold:T.border}`,
                            background:isSel?T.gold:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            {isSel&&<span style={{ color:"#fff", fontSize:9, fontWeight:900 }}>✓</span>}
                          </div>
                        </td>
                        <td style={{ padding:"9px 12px" }}>
                          <span style={{ background:utColor, color:"#fff", fontWeight:700, fontSize:10, padding:"2px 8px", borderRadius:4 }}>{apt.unit_type}</span>
                        </td>
                        <td style={{ padding:"9px 12px", textAlign:"right", color:T.text }}>{apt.floor||"—"}</td>
                        <td style={{ padding:"9px 12px", textAlign:"right", color:T.gold, fontWeight:700, fontSize:13 }}>{fmtFull(apt.price)}</td>
                        <td style={{ padding:"9px 12px", textAlign:"right" }}>{apt.size} m²</td>
                        <td style={{ padding:"9px 12px", textAlign:"right", color:T.textSub }}>{fmt(apt.price_per_m2)}</td>
                        <td style={{ padding:"9px 12px", textAlign:"right" }}>{apt.bedrooms??"-"}</td>
                        <td style={{ padding:"9px 12px", textAlign:"right" }}>{apt.bathrooms??"-"}</td>
                        <td style={{ padding:"9px 12px", textAlign:"right" }}>
                          <div style={{ display:"flex", gap:3, justifyContent:"flex-end", flexWrap:"wrap" }}>
                            <Pill on={apt.has_terrace} label="T"/><Pill on={apt.has_parking} label="P"/>
                            <Pill on={apt.has_pool} label="Pool"/><Pill on={apt.has_ac} label="AC"/>
                            <Pill on={apt.has_lift} label="Lift"/>
                          </div>
                        </td>
                        <td style={{ padding:"9px 12px", textAlign:"center" }} onClick={e=>e.stopPropagation()}>
                          <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                            <button onClick={()=>{setTrackedApt(apt.sub_listing_id);setTab("overtime");}}
                              title="Track over time"
                              style={{ background:trackedApt===apt.sub_listing_id?T.goldLight:"#fff",
                                border:`1px solid ${T.border}`, color:T.gold, borderRadius:5, padding:"3px 8px", cursor:"pointer", fontSize:10 }}>📈</button>
                            {apt.unit_url&&<a href={apt.unit_url} target="_blank" rel="noreferrer"
                              style={{ color:T.blue, fontSize:11, textDecoration:"none" }}>↗</a>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {selectedApts.size>0&&(
              <div style={{ marginTop:12, display:"flex", gap:10 }}>
                <button onClick={()=>setTab("compare")} style={{ background:T.goldLight, border:`1px solid ${T.borderAccent}`, color:T.gold, padding:"7px 16px", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:700 }}>Compare Selected →</button>
                <button onClick={()=>setSelectedApts(new Set())} style={{ background:"#fff", border:`1px solid ${T.border}`, color:T.textSub, padding:"7px 12px", borderRadius:7, cursor:"pointer", fontSize:11 }}>Clear</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ UNIT SUMMARY ════════════════════════════════════════════════ */}
      {tab==="detail" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <ChartCard title="Price Range by Unit Type">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.unit_comparison} barSize={34}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="unit_type" tick={{ fill:T.textSub, fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v=>[fmtFull(v)]} contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }} />
                <Bar dataKey="avg_price" name="Avg Price" radius={[6,6,0,0]}>
                  {data.unit_comparison.map((e,i)=><Cell key={i} fill={UNIT_COLORS[e.unit_type]||COLORS[i]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Unit Type Summary">
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                    {["Type","Count","Min","Avg","Max","m²","€/m²"].map(h=>(
                      <th key={h} style={{ padding:"7px 10px", textAlign:"right", color:T.textMuted, fontSize:10, textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.unit_comparison.map((u,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                      <td style={{ padding:"7px 10px" }}><span style={{ color:UNIT_COLORS[u.unit_type], fontWeight:700 }}>{u.unit_type}</span></td>
                      <td style={{ padding:"7px 10px", textAlign:"right" }}>{u.count}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:T.green, fontWeight:600 }}>{fmt(u.min_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:T.gold, fontWeight:700 }}>{fmt(u.avg_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:T.red }}>{fmt(u.max_price)}</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:T.textSub }}>{u.avg_size}m²</td>
                      <td style={{ padding:"7px 10px", textAlign:"right", color:T.textSub }}>{fmt(u.avg_price_m2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}

      {/* ══ COMPARE ══════════════════════════════════════════════════════ */}
      {tab==="compare" && (
        selectedList.length<2
          ? <div style={{ padding:40, textAlign:"center", color:T.textSub }}>
              <div style={{ fontSize:15, marginBottom:12, fontWeight:600 }}>Select at least 2 apartments to compare</div>
              <button onClick={()=>setTab("matrix")} style={{ background:T.goldLight, border:`1px solid ${T.borderAccent}`, color:T.gold, padding:"8px 18px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700 }}>Go to Overview →</button>
            </div>
          : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
              {selectedList.map((apt,i)=>(
                <div key={apt.sub_listing_id} style={{ background:"#fff",
                  border:`2px solid ${UNIT_COLORS[apt.unit_type]||COLORS[i%COLORS.length]}`,
                  borderRadius:12, padding:"16px 18px", boxShadow:T.shadow }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ background:UNIT_COLORS[apt.unit_type]||COLORS[i%COLORS.length], color:"#fff",
                      padding:"2px 8px", borderRadius:4, fontSize:12, fontWeight:700 }}>Apt {i+1} · {apt.unit_type}</span>
                    <button onClick={()=>toggleApt(apt.sub_listing_id)} style={{ background:"none",border:"none",color:T.textMuted,cursor:"pointer",fontSize:18,lineHeight:1,padding:0 }}>×</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 10px", fontSize:12 }}>
                    {[["Floor",apt.floor||"—",T.text],["Price",fmtFull(apt.price),T.gold],
                      ["Size",`${apt.size}m²`,T.text],["€/m²",fmt(apt.price_per_m2),T.textSub],
                      ["Beds",apt.bedrooms??"-",T.text]].map(([l,v,c])=>(
                      <div key={l}>
                        <div style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase", fontWeight:600 }}>{l}</div>
                        <div style={{ color:c, fontWeight:600, marginTop:1 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:10, display:"flex", gap:4, flexWrap:"wrap" }}>
                    <Pill on={apt.has_terrace} label="Terrace"/><Pill on={apt.has_parking} label="Parking"/>
                    <Pill on={apt.has_pool} label="Pool"/><Pill on={apt.has_ac} label="A/C"/>
                  </div>
                  {apt.unit_url&&<a href={apt.unit_url} target="_blank" rel="noreferrer"
                    style={{ display:"block",marginTop:10,color:T.blue,fontSize:11 }}>Idealista ↗</a>}
                </div>
              ))}
            </div>
      )}

      {/* ══ OVER TIME ════════════════════════════════════════════════════ */}
      {tab==="overtime" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <ChartCard title="Development Avg Price Over Time">
            {!hasTrend?<NoDataNote msg="Need 2+ snapshots"/>
              :<ResponsiveContainer width="100%" height={240}>
                <LineChart data={listingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="period" tick={{ fill:T.textSub,fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis yAxisId="p" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:T.textSub,fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis yAxisId="m" orientation="right" tickFormatter={v=>`€${v}`} tick={{ fill:T.textSub,fontSize:11 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:12 }}/>
                  <Legend wrapperStyle={{ fontSize:11 }}/>
                  <Line yAxisId="p" type="monotone" dataKey="avg_price" name="Avg" stroke={T.gold} strokeWidth={2.5} dot={{ r:5,fill:T.gold }}/>
                  <Line yAxisId="p" type="monotone" dataKey="min_price" name="Min" stroke={T.green} strokeWidth={1.5} strokeDasharray="4 2" dot={{ r:3 }}/>
                  <Line yAxisId="p" type="monotone" dataKey="max_price" name="Max" stroke={T.red} strokeWidth={1.5} strokeDasharray="4 2" dot={{ r:3 }}/>
                  <Line yAxisId="m" type="monotone" dataKey="avg_price_m2" name="€/m²" stroke={T.blue} strokeWidth={2} strokeDasharray="5 3" dot={{ r:4 }}/>
                </LineChart>
              </ResponsiveContainer>}
          </ChartCard>
          <ChartCard title="Price by Unit Type Over Time">
            {utByPeriod.length<2?<NoDataNote msg="Need 2+ snapshots"/>
              :<ResponsiveContainer width="100%" height={240}>
                <LineChart data={utByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="period" tick={{ fill:T.textSub,fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:T.textSub,fontSize:11 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:12 }}/>
                  <Legend wrapperStyle={{ fontSize:11 }}/>
                  {utTrendLines.map(ut=><Line key={ut} type="monotone" dataKey={ut} stroke={UNIT_COLORS[ut]||"#aaa"} strokeWidth={2} dot={{ r:4 }}/>)}
                </LineChart>
              </ResponsiveContainer>}
          </ChartCard>
          <ChartCard title="Individual Apartment Price History" span={2}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {aptTimelines.map(apt=>{
                const isT=trackedApt===apt.sub_listing_id;
                const uc = UNIT_COLORS[apt.unit_type]||T.gold;
                return <button key={apt.sub_listing_id} onClick={()=>setTrackedApt(isT?null:apt.sub_listing_id)}
                  style={{ background:isT?uc:"#fff", border:`1px solid ${isT?uc:T.border}`,
                    color:isT?"#fff":T.textSub,
                    padding:"5px 11px", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:isT?700:500 }}>
                  {apt.unit_type} · {apt.floor||"?"} {apt.size&&`· ${apt.size}m²`}
                </button>;
              })}
            </div>
            {!trackedApt
              ? <div style={{ height:160,display:"flex",alignItems:"center",justifyContent:"center",color:T.textMuted,fontSize:13 }}>Select an apartment above to track its price history</div>
              : trackedAptData.length<2 ? <NoDataNote msg="Need 2+ snapshots" />
              : (()=>{
                  const apt=aptTimelines.find(a=>a.sub_listing_id===trackedApt);
                  const first=trackedAptData[0]?.price, last=trackedAptData[trackedAptData.length-1]?.price;
                  const diff=last-first, pct=first?((diff/first)*100).toFixed(2):0;
                  return <div>
                    <div style={{ display:"flex",gap:16,marginBottom:10,flexWrap:"wrap",fontSize:12 }}>
                      <span><span style={{ color:T.textMuted }}>Apt: </span>
                        <span style={{ background:UNIT_COLORS[apt?.unit_type]||T.gold,color:"#fff",padding:"1px 7px",borderRadius:4,fontWeight:700,fontSize:11 }}>{apt?.unit_type}</span>
                        <span style={{ color:T.textSub }}> · {apt?.floor||"?"} · {apt?.size}m²</span></span>
                      <span><span style={{ color:T.textMuted }}>Change: </span>
                        <span style={{ color:diff>0?T.red:diff<0?T.green:T.textSub,fontWeight:700 }}>{diff===0?"No change":`${diff>0?"▲":"▼"} ${fmtFull(Math.abs(diff))} (${Math.abs(pct)}%)`}</span></span>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trackedAptData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                        <XAxis dataKey="period" tick={{ fill:T.textSub,fontSize:11 }} axisLine={false} tickLine={false}/>
                        <YAxis yAxisId="p" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:T.textSub,fontSize:11 }} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{ background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:12 }}/>
                        <Legend wrapperStyle={{ fontSize:11 }}/>
                        <Line yAxisId="p" type="monotone" dataKey="price" name="Price" stroke={UNIT_COLORS[apt?.unit_type]||T.gold} strokeWidth={3} dot={{ r:6,strokeWidth:2,stroke:"#fff" }}/>
                        <Line yAxisId="p" type="monotone" dataKey="price_per_m2" name="€/m²" stroke={T.blue} strokeWidth={1.5} strokeDasharray="5 3" dot={{ r:3 }}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>;
                })()
            }
          </ChartCard>
        </div>
      )}

      {/* ══ NEARBY COMPARISON ════════════════════════════════════════════ */}
      {tab==="nearby" && (
        <div>
          {/* MAP AT TOP for nearby */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontWeight:600, fontSize:13, color:T.text, marginBottom:8 }}>
              🗺 {nearby?.comarca} — {nearby?.listings?.length||0} developments
              <span style={{ color:T.textSub, fontWeight:400, fontSize:12, marginLeft:8 }}>· ★ = this listing · click a pin or card</span>
            </div>
            <LeafletMap
              markers={nearbyMapMarkers}
              height="340px"
              onMarkerClick={id => {
                if (id===listingId) return;
                setActiveMapPin(id===activeMapPin?null:id);
                const el=document.getElementById(`nbcard-${id}`);
                if(el) el.scrollIntoView({behavior:"smooth",block:"center"});
              }}
            />
          </div>

          {/* Nearby bar chart + listing cards in a grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
            <ChartCard title={`Avg Price — ${nearby?.comarca}`}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={(nearby?.listings||[]).sort((a,b)=>a.avg_price-b.avg_price)} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false}/>
                  <XAxis type="number" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:T.textSub,fontSize:10 }} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="property_name" tick={{ fill:T.textSub,fontSize:9 }} axisLine={false} tickLine={false} width={130}/>
                  <Tooltip formatter={v=>[fmtFull(v)]} contentStyle={{ background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:12 }}/>
                  <Bar dataKey="avg_price" name="Avg Price" radius={[0,5,5,0]}>
                    {(nearby?.listings||[]).sort((a,b)=>a.avg_price-b.avg_price).map((l,i)=>(
                      <Cell key={i} fill={l.listing_id===listingId?T.gold:COLORS[i%COLORS.length]}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Apartment type compare panel — shows selected compare set */}
            <ChartCard title={`Compare Selected Apartments${compareSet.size>0?` (${compareSet.size})`:""}`}>
              {compareSet.size===0
                ? <div style={{ height:240,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8 }}>
                    <div style={{ fontSize:28 }}>🏠</div>
                    <div style={{ color:T.textSub,fontSize:13,textAlign:"center" }}>Click the <strong>+ Compare</strong> button on any apartment below to add it here</div>
                  </div>
                : <div style={{ overflowY:"auto", maxHeight:280 }}>
                    <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                          {["Development","Type","Floor","Price","Size","€/m²",""].map(h=>(
                            <th key={h} style={{ padding:"6px 8px",textAlign:"right",color:T.textMuted,fontSize:10,textTransform:"uppercase" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {compareApts.map((apt,i)=>{
                          const isCur=apt.is_current_listing;
                          const uc=UNIT_COLORS[apt.unit_type]||COLORS[i%COLORS.length];
                          return (
                            <tr key={apt.sub_listing_id} style={{ borderBottom:`1px solid ${T.border}`,background:isCur?T.goldLight:"transparent" }}>
                              <td style={{ padding:"6px 8px",textAlign:"right",color:isCur?T.gold:T.textSub,fontSize:11,fontWeight:isCur?700:400,maxWidth:120 }}>{apt.property_name}{isCur&&" ◀"}</td>
                              <td style={{ padding:"6px 8px",textAlign:"right" }}><span style={{ background:uc,color:"#fff",padding:"1px 6px",borderRadius:3,fontSize:10,fontWeight:700 }}>{apt.unit_type}</span></td>
                              <td style={{ padding:"6px 8px",textAlign:"right",color:T.text }}>{apt.floor||"—"}</td>
                              <td style={{ padding:"6px 8px",textAlign:"right",color:T.gold,fontWeight:700 }}>{fmtFull(apt.price)}</td>
                              <td style={{ padding:"6px 8px",textAlign:"right",color:T.text }}>{apt.size}m²</td>
                              <td style={{ padding:"6px 8px",textAlign:"right",color:T.textSub }}>{apt.price_per_m2?`€${Math.round(apt.price_per_m2)}`:"—"}</td>
                              <td style={{ padding:"6px 8px",textAlign:"center" }}>
                                <button onClick={()=>toggleCompare(apt.sub_listing_id)} style={{ background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:14 }}>×</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {compareSet.size>0&&(
                      <button onClick={()=>setCompareSet(new Set())} style={{ marginTop:8,background:"none",border:"none",color:T.textMuted,cursor:"pointer",fontSize:11 }}>✕ Clear all</button>
                    )}
                  </div>
              }
            </ChartCard>
          </div>

          {/* Apartment comparison table with + Compare button */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12, flexWrap:"wrap" }}>
              <div style={{ fontWeight:700,fontSize:15,color:T.text }}>
                Apartments across {nearby?.comarca}
              </div>
              <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                {["Studio","1BR","2BR","3BR","4BR","Penthouse"].map(ut=>(
                  <button key={ut} onClick={()=>setNearbyUTF(ut)}
                    style={{ background:nearbyUTF===ut?UNIT_COLORS[ut]||T.gold:"#fff",
                      border:`1px solid ${nearbyUTF===ut?UNIT_COLORS[ut]||T.gold:T.border}`,
                      color:nearbyUTF===ut?"#fff":T.textSub,
                      padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:nearbyUTF===ut?700:500 }}>{ut}</button>
                ))}
                <span style={{ color:T.textMuted,fontSize:11,alignSelf:"center",marginLeft:8 }}>Sort</span>
                {[["price","Price"],["size","Size"],["price_per_m2","€/m²"]].map(([k,lbl])=>(
                  <button key={k} onClick={()=>setNearbySort(k)}
                    style={{ background:nearbySort===k?T.goldLight:"#fff",
                      border:`1px solid ${nearbySort===k?T.borderAccent:T.border}`,
                      color:nearbySort===k?T.gold:T.textSub,
                      padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:11 }}>{lbl}</button>
                ))}
              </div>
              {compareSet.size>0 && (
                <span style={{ marginLeft:"auto",color:T.gold,fontWeight:600,fontSize:12 }}>{compareSet.size} apartments in comparison panel ↑</span>
              )}
            </div>
            <div style={{ overflowX:"auto",borderRadius:12,border:`1px solid ${T.border}`,boxShadow:T.shadow }}>
              <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
                <thead>
                  <tr style={{ background:T.bgStripe,borderBottom:`1px solid ${T.border}` }}>
                    {["Development","Municipality","Floor","Price","Size","€/m²","Beds","Amenities","+ Compare","Link"].map(h=>(
                      <th key={h} style={{ padding:"9px 12px",textAlign:"right",color:T.textMuted,fontSize:10,textTransform:"uppercase",whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedNearbyApts.map((apt,i)=>{
                    const isCur=apt.is_current_listing;
                    const inCmp=compareSet.has(apt.sub_listing_id);
                    const uc=UNIT_COLORS[apt.unit_type]||COLORS[i%COLORS.length];
                    return (
                      <tr key={apt.sub_listing_id}
                        style={{ background:isCur?T.goldLight:inCmp?T.blueBg:i%2===0?T.bgStripe:"#fff",
                          borderBottom:`1px solid ${T.border}`,
                          borderLeft:isCur?`3px solid ${T.gold}`:inCmp?`3px solid ${T.blue}`:"3px solid transparent" }}>
                        <td style={{ padding:"9px 12px",textAlign:"right",maxWidth:160 }}>
                          <div style={{ fontWeight:isCur?700:500,color:isCur?T.gold:T.text,fontSize:11 }}>{apt.property_name}</div>
                          {isCur&&<div style={{ fontSize:9,color:T.gold,fontWeight:700 }}>◀ Current</div>}
                        </td>
                        <td style={{ padding:"9px 12px",textAlign:"right",color:T.textSub,fontSize:11 }}>{apt.municipality}</td>
                        <td style={{ padding:"9px 12px",textAlign:"right",color:T.text }}>{apt.floor||"—"}</td>
                        <td style={{ padding:"9px 12px",textAlign:"right",color:T.gold,fontWeight:700 }}>{fmtFull(apt.price)}</td>
                        <td style={{ padding:"9px 12px",textAlign:"right" }}>{apt.size}m²</td>
                        <td style={{ padding:"9px 12px",textAlign:"right",color:T.textSub }}>{apt.price_per_m2?`€${Math.round(apt.price_per_m2)}`:"—"}</td>
                        <td style={{ padding:"9px 12px",textAlign:"right" }}>{apt.bedrooms??"—"}</td>
                        <td style={{ padding:"9px 12px",textAlign:"right" }}>
                          <div style={{ display:"flex",gap:3,justifyContent:"flex-end" }}>
                            <Pill on={apt.has_terrace} label="T"/><Pill on={apt.has_parking} label="P"/>
                            <Pill on={apt.has_pool} label="Pool"/><Pill on={apt.has_lift} label="Lift"/>
                          </div>
                        </td>
                        <td style={{ padding:"9px 12px",textAlign:"center" }}>
                          <button onClick={()=>toggleCompare(apt.sub_listing_id)}
                            style={{ background:inCmp?T.blue:T.goldLight,
                              border:`1px solid ${inCmp?T.blue:T.borderAccent}`,
                              color:inCmp?"#fff":T.gold,
                              padding:"3px 9px",borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:700,whiteSpace:"nowrap" }}>
                            {inCmp?"✓ Added":"+ Compare"}
                          </button>
                        </td>
                        <td style={{ padding:"9px 12px",textAlign:"center" }}>
                          {apt.unit_url&&<a href={apt.unit_url} target="_blank" rel="noreferrer" style={{ color:T.blue,textDecoration:"none" }}>↗</a>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ color:T.textMuted,fontSize:11,marginTop:8 }}>
              {nearbyUTF} apartments · {nearby?.comarca} comarca · {sortedNearbyApts.length} total
            </div>
          </div>

          {/* All developments in comarca */}
          <div>
            <div style={{ fontWeight:700,fontSize:15,color:T.text,marginBottom:12 }}>All Developments in {nearby?.comarca}</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12 }}>
              {(nearby?.listings||[]).sort((a,b)=>a.avg_price-b.avg_price).map(l=>{
                const isCur=l.listing_id===listingId;
                const isAct=l.listing_id===activeMapPin;
                return (
                  <div key={l.listing_id} id={`nbcard-${l.listing_id}`}
                    style={{ background:isCur?T.goldLight:isAct?T.blueBg:"#fff",
                      border:`2px solid ${isCur?T.borderAccent:isAct?T.blue:T.border}`,
                      borderRadius:12,padding:"14px 18px",boxShadow:T.shadow,
                      cursor:isCur?"default":"pointer",transition:"all 0.15s" }}
                    onMouseEnter={()=>!isCur&&setActiveMapPin(l.listing_id)}
                    onMouseLeave={()=>setActiveMapPin(null)}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                      <div>
                        <div style={{ fontWeight:700,fontSize:13,color:isCur?T.gold:T.text }}>
                          {l.property_name}
                          {isCur&&<span style={{ marginLeft:6,fontSize:10,background:T.gold,color:"#fff",padding:"1px 6px",borderRadius:4 }}>Current</span>}
                        </div>
                        <div style={{ color:T.textSub,fontSize:11,marginTop:2 }}>{l.developer}</div>
                      </div>
                      {l.esg_grade&&l.esg_grade!=="nan"&&<Tag label={`ESG ${l.esg_grade}`} color={ESG_COLORS[l.esg_grade]||"#999"}/>}
                    </div>
                    <AddressBreadcrumb cityArea={l.city_area} municipality={l.municipality} style={{ marginBottom:8 }}/>
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"5px 8px",fontSize:12,marginBottom:8 }}>
                      {[["Apts",l.units,T.text],["Avg",fmt(l.avg_price),T.gold],["Min",fmt(l.min_price),T.green],["€/m²",`€${l.avg_price_m2}`,T.textSub]].map(([label,val,color])=>(
                        <div key={label}>
                          <div style={{ color:T.textMuted,fontSize:9,textTransform:"uppercase",fontWeight:600 }}>{label}</div>
                          <div style={{ color,fontWeight:600,fontSize:12 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
