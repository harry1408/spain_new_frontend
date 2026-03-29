import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, Legend } from "recharts";
import { T, Pill, fmt, fmtFull, UNIT_COLORS, COLORS, ESG_COLORS, Tag } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";
import LoadingHouse from "../components/LoadingHouse.jsx";

export default function ApartmentModal({ apt, listingId, listingName, onClose }) {
  const [aptTrend,      setAptTrend]      = useState([]);
  const [nearbyApts,    setNearbyApts]    = useState(null);
  const [nearbyListings,setNearbyListings]= useState(null);
  const [activePin,     setActivePin]     = useState(null);
  const [sortCol,       setSortCol]       = useState("price");
  const [loading,       setLoading]       = useState(true);

  const utColor = UNIT_COLORS[apt.unit_type] || T.navy;

  const periodSort = p => {
    const MO = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
    const [m, y] = (p||"").split(" ");
    return (parseInt(y||"0")-2000)*100 + (MO[m]||0);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/drilldown/listing/${listingId}`).then(r=>r.json()),
      fetch(`${API}/nearby/apartments/${listingId}?unit_type=${encodeURIComponent(apt.unit_type)}`).then(r=>r.json()),
      fetch(`${API}/nearby/listings/${listingId}`).then(r=>r.json()),
    ]).then(([detail, nbApts, nbListings]) => {
      const history = (detail.apt_trend || [])
        .filter(r => r.sub_listing_id === apt.sub_listing_id)
        .sort((a,b) => periodSort(a.period) - periodSort(b.period));
      setAptTrend(history);
      setNearbyApts(nbApts);
      setNearbyListings(nbListings);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [apt.sub_listing_id, listingId, apt.unit_type]);

  // Map markers: current listing = gold star, activePin = blue, rest = gray
  const mapMarkers = useMemo(() => {
    if (!nearbyListings?.listings) return [];
    return nearbyListings.listings.map(l => ({
      id:       l.listing_id,
      lat:      l.lat, lng: l.lng,
      label:    l.property_name,
      sublabel: `${fmt(l.avg_price)} avg · ${l.units} apts`,
      active:   l.listing_id === listingId || l.listing_id === activePin,
      color:    l.listing_id === listingId ? T.navy
              : l.listing_id === activePin ? T.blue
              : "#8A96B4",
    }));
  }, [nearbyListings, listingId, activePin]);

  // Similar apts sorted
  const sortedApts = useMemo(() => {
    if (!nearbyApts?.apartments) return [];
    return [...nearbyApts.apartments].sort((a,b) => (a[sortCol]||0)-(b[sortCol]||0));
  }, [nearbyApts, sortCol]);

  // Price change stats
  const priceStats = useMemo(() => {
    if (aptTrend.length < 2) return null;
    const first = aptTrend[0].price, last = aptTrend[aptTrend.length-1].price;
    const diff = last - first;
    const pct  = first ? ((diff/first)*100).toFixed(1) : 0;
    return { first, last, diff, pct };
  }, [aptTrend]);

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const SortBtn = ({ col, label }) => (
    <button onClick={() => setSortCol(col)}
      style={{ background: sortCol===col ? T.navyLight : "#fff",
        border: `1px solid ${sortCol===col ? T.borderAccent : T.border}`,
        color: sortCol===col ? "#fff" : T.textSub,
        padding:"4px 10px", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight: sortCol===col?700:500 }}>
      {label}
    </button>
  );

  return (
    /* Backdrop */
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000,
        display:"flex", alignItems:"flex-start", justifyContent:"center",
        overflowY:"auto", padding:"32px 16px" }}>

      {/* Modal panel */}
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"#f5f2ed", borderRadius:16, width:"100%", maxWidth:1100,
          boxShadow:"0 24px 80px rgba(0,0,0,0.22)", overflow:"hidden", marginBottom:32 }}>

        {/* ── Header ────────────────────────────────────────────────── */}
        <div style={{ background:"#fff", borderBottom:`1px solid ${T.border}`,
          padding:"18px 28px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
          <span style={{ background:utColor, color:"#fff", fontWeight:800, fontSize:14,
            padding:"4px 12px", borderRadius:6 }}>{apt.unit_type}</span>
          <div>
            <div style={{ fontWeight:700, fontSize:17, color:T.text }}>{listingName}</div>
            <div style={{ color:T.textSub, fontSize:12, marginTop:2 }}>
              {apt.floor || "—"} &nbsp;·&nbsp; {apt.size} m²
              {apt.bedrooms != null && ` · ${apt.bedrooms} beds`}
              {apt.bathrooms != null && ` · ${apt.bathrooms} baths`}
            </div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:24, alignItems:"center" }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase" }}>Latest Price</div>
              <div style={{ color:T.navy, fontWeight:800, fontSize:22 }}>{fmtFull(apt.price)}</div>
              <div style={{ color:T.textSub, fontSize:11 }}>€{apt.price_per_m2 ? Math.round(apt.price_per_m2).toLocaleString("en") : "—"}/m²</div>
            </div>
            {priceStats && (
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase" }}>Total Change</div>
                <div style={{ color: priceStats.diff>0?T.red:priceStats.diff<0?T.green:T.textSub,
                  fontWeight:700, fontSize:15 }}>
                  {priceStats.diff===0 ? "No change" : `${priceStats.diff>0?"▲":"▼"} ${fmtFull(Math.abs(priceStats.diff))} (${Math.abs(priceStats.pct)}%)`}
                </div>
                <div style={{ color:T.textMuted, fontSize:10 }}>{aptTrend[0]?.period} → {aptTrend[aptTrend.length-1]?.period}</div>
              </div>
            )}
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              <Pill on={apt.has_terrace} label="Terrace"/>
              <Pill on={apt.has_parking} label="Parking"/>
              <Pill on={apt.has_pool}    label="Pool"/>
              <Pill on={apt.has_ac}      label="AC"/>
              <Pill on={apt.has_lift}    label="Lift"/>
            </div>
            {apt.unit_url && (
              <a href={apt.unit_url} target="_blank" rel="noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:4,
                  color:"#fff", background:T.blue, fontSize:12, fontWeight:700,
                  textDecoration:"none", padding:"6px 14px", borderRadius:7 }}>
                Idealista ↗
              </a>
            )}
            <button onClick={onClose}
              style={{ background:"none", border:`1px solid ${T.border}`, color:T.textMuted,
                borderRadius:8, width:34, height:34, cursor:"pointer", fontSize:20, lineHeight:1,
                display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
          </div>
        </div>

        <div style={{ padding:"28px 28px 36px" }}>
          {loading ? (
            <div style={{ padding:60, textAlign:"center" }}><LoadingHouse message="Loading analysis…" /></div>
          ) : (
            <>
              {/* ── Section 1: Price History ─────────────────────────── */}
              <div style={{ marginBottom:32 }}>
                <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:16,
                  display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ background:utColor, color:"#fff", width:24, height:24, borderRadius:"50%",
                    display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800 }}>1</span>
                  Price History for this Apartment
                </div>
                {aptTrend.length < 2 ? (
                  <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${T.border}`,
                    padding:"32px", textAlign:"center", color:T.textSub }}>
                    <div style={{ fontSize:22, marginBottom:8 }}>📅</div>
                    <div>Only 1 snapshot so far — price history will appear as more data is collected</div>
                    <div style={{ marginTop:12, background:T.bgStripe, borderRadius:8, padding:"10px 18px", display:"inline-block" }}>
                      <span style={{ color:T.textMuted, fontSize:11 }}>Current: </span>
                      <span style={{ color:T.navy, fontWeight:700 }}>{fmtFull(apt.price)}</span>
                      <span style={{ color:T.textMuted, fontSize:11 }}> ({aptTrend[0]?.period || "—"})</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${T.border}`, padding:"20px 24px" }}>
                    {/* Stats row */}
                    <div style={{ display:"flex", gap:24, marginBottom:16, flexWrap:"wrap" }}>
                      {aptTrend.map((pt,i) => (
                        <div key={pt.period} style={{ textAlign:"center" }}>
                          <div style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase" }}>{pt.period}</div>
                          <div style={{ color: i===aptTrend.length-1 ? T.navy : T.text,
                            fontWeight: i===aptTrend.length-1 ? 700 : 600, fontSize:14 }}>{fmtFull(pt.price)}</div>
                          <div style={{ color:T.textSub, fontSize:10 }}>€{pt.price_per_m2 ? Math.round(pt.price_per_m2).toLocaleString("en") : "—"}/m²</div>
                        </div>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={aptTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                        <XAxis dataKey="period" tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false}/>
                        <YAxis yAxisId="p" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`}
                          tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false}/>
                        <YAxis yAxisId="m" orientation="right" tickFormatter={v=>`€${v}`}
                          tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false}/>
                        <Tooltip formatter={v=>[fmtFull(v)]}
                          contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }}/>
                        <Legend wrapperStyle={{ fontSize:11 }}/>
                        <Line yAxisId="p" type="monotone" dataKey="price" name="Price"
                          stroke={utColor} strokeWidth={3} dot={{ r:6, fill:utColor, stroke:"#fff", strokeWidth:2 }}/>
                        <Line yAxisId="m" type="monotone" dataKey="price_per_m2" name="€/m²"
                          stroke={T.blue} strokeWidth={2} strokeDasharray="5 3"
                          dot={{ r:4, fill:T.blue }}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* ── Section 2: Similar Apts Nearby + Map ────────────── */}
              <div style={{ marginBottom:32 }}>
                <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:16,
                  display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ background:utColor, color:"#fff", width:24, height:24, borderRadius:"50%",
                    display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800 }}>2</span>
                  Similar {apt.unit_type} Apartments Nearby
                  <span style={{ color:T.textMuted, fontWeight:400, fontSize:12 }}>· {nearbyApts?.comarca}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:16, alignItems:"start" }}>
                  {/* Table — max 10 rows then scroll */}
                  <div style={{ borderRadius:12, border:`1px solid ${T.border}`, boxShadow:T.shadow, overflow:"hidden" }}>
                    <div style={{ display:"flex", gap:6, padding:"10px 14px", borderBottom:`1px solid ${T.border}`,
                      background:T.bgStripe, alignItems:"center", flexWrap:"wrap" }}>
                      <span style={{ color:T.textMuted, fontSize:11 }}>Sort:</span>
                      {[["price","Price"],["size","Size"],["price_per_m2","€/m²"]].map(([k,l])=>(
                        <SortBtn key={k} col={k} label={l}/>
                      ))}
                      <span style={{ marginLeft:"auto", color:T.textMuted, fontSize:11 }}>
                        {sortedApts.length} apartments
                      </span>
                    </div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                        <thead>
                          <tr style={{ background:T.bgStripe, borderBottom:`1px solid ${T.border}` }}>
                            {["Development","Floor","Price","€/m²","Beds","Amenities","Link"].map((h,hi)=>(
                              <th key={hi} style={{ padding:"8px 10px", position:"sticky", top:0, zIndex:1,
                                background:T.bgStripe, color:T.textMuted,
                                fontSize:9, textTransform:"uppercase", whiteSpace:"nowrap",
                                textAlign: h==="Development"?"left":"right",
                                borderBottom:`1px solid ${T.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                      </table>
                      {/* Scrollable body */}
                      <div style={{ maxHeight: 460, overflowY:"auto" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                          <tbody>
                            {sortedApts.map((a,i)=>{
                              const isCur    = a.is_current_listing;
                              const isThis   = a.sub_listing_id === apt.sub_listing_id;
                              const isPinned = a.listing_id === activePin;
                              const pDiff = isThis || !apt.price ? null : a.price - apt.price;
                              const mDiff = isThis || !apt.price_per_m2 ? null : (a.price_per_m2||0) - apt.price_per_m2;
                              const rowBg = isThis   ? "rgba(201,168,76,0.15)"
                                          : isPinned ? "rgba(74,128,176,0.10)"
                                          : isCur    ? T.navyLight
                                          : i%2===0  ? T.bgStripe : "#fff";
                              const borderColor = isThis  ? T.navy
                                                : isPinned? T.blue
                                                : isCur   ? "rgba(201,168,76,0.4)"
                                                : "transparent";
                              const DiffTag = ({ d, isEur }) => {
                                if (isThis || d == null) return null;
                                const up = d > 0;
                                return (
                                  <div style={{ fontSize:9, fontWeight:700, marginTop:2,
                                    color: up?T.red:T.green,
                                    display:"flex", alignItems:"center", justifyContent:"flex-end", gap:1 }}>
                                    {up?"▲":"▼"} {isEur ? `€${Math.abs(Math.round(d))}` : fmtFull(Math.abs(d))}
                                  </div>
                                );
                              };
                              return (
                                <tr key={a.sub_listing_id}
                                  onClick={() => setActivePin(p => p===a.listing_id ? null : a.listing_id)}
                                  style={{ background:rowBg, borderBottom:`1px solid ${T.border}`,
                                    borderLeft:`3px solid ${borderColor}`,
                                    cursor:"pointer", transition:"background 0.1s" }}>
                                  <td style={{ padding:"8px 10px", maxWidth:140 }}>
                                    <div style={{ fontWeight:isCur||isPinned?700:500,
                                      color:isThis?T.navy:isPinned?T.blue:isCur?"#fff":T.text, fontSize:11,
                                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:130 }}>{a.property_name}</div>
                                    <div style={{ color:isCur?"rgba(255,255,255,0.7)":T.textMuted, fontSize:10 }}>{a.municipality}</div>
                                    {isThis&&<div style={{ fontSize:9,color:T.navy,fontWeight:700 }}>◀ This apt</div>}
                                    {isPinned&&!isThis&&<div style={{ fontSize:9,color:T.blue,fontWeight:700 }}>📍 Pinned</div>}
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"right", whiteSpace:"nowrap" }}>{a.floor||"—"}</td>
                                  <td style={{ padding:"8px 10px", textAlign:"right", whiteSpace:"nowrap" }}>
                                    <div style={{ color:isThis?T.navy:T.text, fontWeight:isThis?700:600 }}>{fmtFull(a.price)}</div>
                                    <DiffTag d={pDiff} isEur={false}/>
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"right", whiteSpace:"nowrap" }}>
                                    <div style={{ color:T.textSub }}>{a.price_per_m2?`€${Math.round(a.price_per_m2).toLocaleString("en")}`:"—"}</div>
                                    <DiffTag d={mDiff} isEur={true}/>
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"right" }}>{a.bedrooms??"—"}</td>
                                  <td style={{ padding:"8px 10px", textAlign:"right" }}>
                                    <div style={{ display:"flex", gap:3, justifyContent:"flex-end" }}>
                                      <Pill on={a.has_terrace} label="T"/><Pill on={a.has_parking} label="P"/>
                                      <Pill on={a.has_pool} label="Pool"/><Pill on={a.has_lift} label="Lift"/>
                                    </div>
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"center" }}>
                                    {a.unit_url&&<a href={a.unit_url} target="_blank" rel="noreferrer"
                                      style={{ display:"inline-flex", alignItems:"center", gap:3,
                                        color:"#fff", background:T.blue, fontSize:10, fontWeight:700,
                                        textDecoration:"none", padding:"3px 9px", borderRadius:5,
                                        whiteSpace:"nowrap" }}>Idealista ↗</a>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  {/* Map — fixed height, gold=current, blue=pinned, gray=others */}
                  <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`,
                    boxShadow:T.shadow, height:510, position:"sticky", top:16 }}>
                    <LeafletMap markers={mapMarkers} height="510px" zoom={12}
                      onMarkerClick={id => setActivePin(p => p===id ? null : id)} />
                  </div>
                </div>
              </div>

              {/* ── Section 3: All Nearby Developments ──────────────── */}
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:16,
                  display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ background:utColor, color:"#fff", width:24, height:24, borderRadius:"50%",
                    display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800 }}>3</span>
                  All Nearby Developments — {nearbyListings?.comarca}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
                  {(nearbyListings?.listings||[]).sort((a,b)=>a.avg_price-b.avg_price).map(l=>{
                    const isCur  = l.listing_id === listingId;
                    const isPinned = l.listing_id === activePin;
                    return (
                      <div key={l.listing_id}
                        onClick={() => !isCur && setActivePin(p => p===l.listing_id ? null : l.listing_id)}
                        style={{ background: isCur?T.navyLight:isPinned?"rgba(74,128,176,0.10)":"#fff",
                          border:`2px solid ${isCur?T.borderAccent:isPinned?T.blue:T.border}`,
                          borderRadius:12, padding:"14px 18px", boxShadow:T.shadow,
                          cursor:isCur?"default":"pointer", transition:"border-color 0.15s" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:13, color:isCur?T.navy:isPinned?T.blue:T.text }}>
                              {l.property_name}
                              {isCur&&<span style={{ marginLeft:6, fontSize:10, background:T.navy, color:"#fff",
                                padding:"1px 6px", borderRadius:4 }}>Current</span>}
                              {isPinned&&!isCur&&<span style={{ marginLeft:6, fontSize:9, background:T.blue, color:"#fff",
                                padding:"1px 6px", borderRadius:4 }}>📍 Pinned</span>}
                            </div>
                            <div style={{ color:T.textSub, fontSize:11, marginTop:2 }}>{l.municipality}</div>
                          </div>
                          {l.esg_grade&&l.esg_grade!=="nan"&&
                            <Tag label={`ESG ${l.esg_grade}`} color={ESG_COLORS[l.esg_grade]||"#999"}/>}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"4px 8px", fontSize:12 }}>
                          {[["Apts",l.units,T.text],["Avg",fmt(l.avg_price),T.navy],
                            ["Min",fmt(l.min_price),T.green],["€/m²",`€${l.avg_price_m2}`,T.textSub]].map(([label,val,color])=>(
                            <div key={label}>
                              <div style={{ color:T.textMuted, fontSize:9, textTransform:"uppercase", fontWeight:600 }}>{label}</div>
                              <div style={{ color, fontWeight:600, fontSize:12 }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
