import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, Legend } from "recharts";
import { T, Pill, fmt, fmtFull, UNIT_COLORS, COLORS, ESG_COLORS, Tag } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";
import GoogleStaticMap, { MapThumbnail } from "../components/GoogleStaticMap.jsx";

// ── AVM Section ───────────────────────────────────────────────────────────
function AVMSection({ apt, comparables, utColor }) {
  const allIds = useMemo(() => new Set(comparables.map(a => a.sub_listing_id)), [comparables]);
  const [selected, setSelected] = useState(new Set());

  // Auto-select all on first load
  useEffect(() => { setSelected(new Set(allIds)); }, [comparables]);

  const toggle = id => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => setSelected(s => s.size === allIds.size ? new Set() : new Set(allIds));

  const selComps = comparables.filter(a => selected.has(a.sub_listing_id) && a.price_per_m2);

  // Median €/m² of selected comparables
  const median = useMemo(() => {
    if (!selComps.length) return null;
    const vals = [...selComps].map(a => a.price_per_m2).sort((a,b) => a - b);
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 ? vals[mid] : (vals[mid-1] + vals[mid]) / 2;
  }, [selComps]);

  const estimate  = median && apt.size ? Math.round(median * apt.size) : null;
  const listed    = apt.price;
  const diff      = estimate && listed ? estimate - listed : null;
  const diffPct   = diff && listed ? ((diff / listed) * 100).toFixed(1) : null;
  const overUnder = diff > 0 ? "underpriced" : diff < 0 ? "overpriced" : "fairly priced";
  const diffColor = diff > 0 ? T.green : diff < 0 ? T.red : T.textSub;

  const allSelected = selected.size === allIds.size;
  const noneSelected = selected.size === 0;

  return (
    <div style={{ marginBottom:32 }}>
      {/* Section header */}
      <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:16,
        display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ background:utColor, color:"#fff", width:24, height:24, borderRadius:"50%",
          display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800 }}>3</span>
        Automatic Valuation (AVM)
        <span style={{ color:T.textMuted, fontWeight:400, fontSize:12 }}>
          · select comparables to include
        </span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16, alignItems:"start" }}>

        {/* Left: Comparable selector table */}
        <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden", boxShadow:T.shadow }}>
          {/* Toolbar */}
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
            borderBottom:`1px solid ${T.border}`, background:T.bgStripe }}>
            <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = !allSelected && !noneSelected; }}
              onChange={toggleAll}
              style={{ width:14, height:14, cursor:"pointer", accentColor:"#0B1239" }} />
            <span style={{ fontSize:11, color:T.textMuted, fontWeight:600 }}>
              {selected.size} of {comparables.length} comparables selected
            </span>
            {!allSelected && (
              <button onClick={() => setSelected(new Set(allIds))}
                style={{ marginLeft:"auto", fontSize:10, color:T.navy, background:"none",
                  border:`1px solid ${T.borderAccent}`, borderRadius:5, padding:"2px 8px", cursor:"pointer" }}>
                Select all
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ maxHeight:360, overflowY:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:T.bgStripe, position:"sticky", top:0, zIndex:1 }}>
                  {["","Development","Floor","Size","€/m²","Price","Beds"].map((h,i) => (
                    <th key={i} style={{ padding:"7px 10px", color:T.textMuted, fontSize:9,
                      textTransform:"uppercase", textAlign: i<=1 ? "left":"right",
                      borderBottom:`1px solid ${T.border}`, fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparables.map((a, i) => {
                  const isThis   = a.sub_listing_id === apt.sub_listing_id;
                  const checked  = selected.has(a.sub_listing_id);
                  const rowBg    = isThis ? "rgba(201,168,76,0.12)" : checked ? "#fff" : "#F8F9AF9";
                  return (
                    <tr key={a.sub_listing_id}
                      onClick={() => !isThis && toggle(a.sub_listing_id)}
                      style={{ background:rowBg, borderBottom:`1px solid ${T.border}`,
                        borderLeft:`3px solid ${isThis ? T.navy : checked ? T.green : "#E5E7EB"}`,
                        cursor: isThis ? "default" : "pointer",
                        opacity: checked || isThis ? 1 : 0.45,
                        transition:"all 0.12s" }}>
                      <td style={{ padding:"8px 10px", textAlign:"center" }}>
                        {isThis
                          ? <span style={{ fontSize:10, color:T.navy, fontWeight:700 }}>★</span>
                          : <input type="checkbox" checked={checked} onChange={() => toggle(a.sub_listing_id)}
                              onClick={e => e.stopPropagation()}
                              style={{ width:13, height:13, cursor:"pointer", accentColor:T.green }} />
                        }
                      </td>
                      <td style={{ padding:"8px 10px", maxWidth:130 }}>
                        <div style={{ fontWeight: isThis?700:500, color: isThis?T.navy:T.text,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {a.property_name}
                          {isThis && <span style={{ marginLeft:5, fontSize:9, color:T.navy }}>(this apt)</span>}
                        </div>
                        <div style={{ color:T.textMuted, fontSize:10 }}>{a.municipality}</div>
                      </td>
                      <td style={{ padding:"8px 10px", textAlign:"right", color:T.textSub }}>{a.floor||"—"}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right" }}>{a.size ? `${a.size}m²` : "—"}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:600,
                        color: checked && !isThis ? T.navyMid : T.textSub }}>
                        {a.price_per_m2 ? `€${Math.round(a.price_per_m2)}` : "—"}
                      </td>
                      <td style={{ padding:"8px 10px", textAlign:"right", color: isThis?T.navy:T.text,
                        fontWeight: isThis?700:500 }}>{fmtFull(a.price)}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", color:T.textSub }}>{a.bedrooms??"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: AVM result card */}
        <div style={{ position:"sticky", top:16 }}>
          {/* Estimate box */}
          <div style={{ background: estimate ? "linear-gradient(135deg,#1A1A2E 0%,#2D2D4A 100%)" : T.bgCard,
            border:`2px solid ${estimate ? "#0B1239" : T.border}`,
            borderRadius:16, padding:"24px 22px", marginBottom:12, boxShadow:T.shadowMd }}>

            <div style={{ color:"#0B1239", fontSize:10, textTransform:"uppercase",
              letterSpacing:"0.1em", fontWeight:700, marginBottom:8 }}>
              AVM Estimate
            </div>

            {noneSelected ? (
              <div style={{ color:"#8A96B4", fontSize:13, textAlign:"center", padding:"12px 0" }}>
                Select comparables to generate estimate
              </div>
            ) : !estimate ? (
              <div style={{ color:"#8A96B4", fontSize:13 }}>Insufficient data</div>
            ) : (
              <>
                <div style={{ color:"#FFFFFF", fontWeight:800, fontSize:32, marginBottom:4 }}>
                  {fmtFull(estimate)}
                </div>
                <div style={{ color:"#8A96B4", fontSize:11, marginBottom:16 }}>
                  {selected.size} comparable{selected.size!==1?"s":""} ·
                  median €{Math.round(median)}/m² × {apt.size}m²
                </div>

                {/* vs listed price */}
                {diff !== null && (
                  <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:10,
                    padding:"12px 14px", marginBottom:14 }}>
                    <div style={{ color:"#8A96B4", fontSize:10, textTransform:"uppercase",
                      fontWeight:600, marginBottom:6 }}>vs Listed Price</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <span style={{ color: diffColor, fontWeight:800, fontSize:18 }}>
                          {diff > 0 ? "+" : ""}{fmtFull(diff)}
                        </span>
                        <span style={{ color:"#8A96B4", fontSize:11, marginLeft:6 }}>
                          ({diff > 0 ? "+" : ""}{diffPct}%)
                        </span>
                      </div>
                      <span style={{ background: diffColor + "22", color: diffColor,
                        fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20,
                        border:`1px solid ${diffColor}55` }}>
                        {diff === 0 ? "Fair" : diff > 0 ? "Below Market" : "Above Market"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Breakdown */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    ["Median €/m²", `€${Math.round(median)}`, T.navyMid],
                    ["Your size", `${apt.size} m²`, "#8A96B4"],
                    ["Listed at", fmtFull(listed), T.navy],
                    ["Estimate", fmtFull(estimate), "#0B1239"],
                  ].map(([lbl, val, color]) => (
                    <div key={lbl} style={{ background:"rgba(255,255,255,0.05)",
                      borderRadius:8, padding:"8px 10px" }}>
                      <div style={{ color:"#6B7A9F", fontSize:9, textTransform:"uppercase",
                        fontWeight:600, marginBottom:2 }}>{lbl}</div>
                      <div style={{ color, fontWeight:700, fontSize:13 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Distribution mini-chart */}
          {selComps.length > 1 && (
            <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:12,
              padding:"10px 14px", boxShadow:T.shadow }}>
              <div style={{ color:T.textMuted, fontSize:9, textTransform:"uppercase",
                fontWeight:600, marginBottom:8 }}>€/m² distribution of selected</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:1, height:36, overflow:"hidden" }}>
                {(() => {
                  const vals = selComps.map(a => a.price_per_m2).sort((a,b) => a-b);
                  // Bucket into max 60 bars so it never overflows
                  const MAX_BARS = 60;
                  const bSize = Math.ceil(vals.length / MAX_BARS);
                  const buckets = [];
                  for (let i = 0; i < vals.length; i += bSize)
                    buckets.push(vals.slice(i, i+bSize).reduce((s,v)=>s+v,0) / Math.min(bSize, vals.length-i));
                  const mn = Math.min(...buckets), mx = Math.max(...buckets), range = mx-mn||1;
                  return buckets.map((v, i) => {
                    const isMedian = Math.abs(v-median) === Math.min(...buckets.map(x=>Math.abs(x-median)));
                    const h = Math.max(5, Math.round(((v-mn)/range)*30)+5);
                    return (
                      <div key={i} title={`€${Math.round(v)}/m²`}
                        style={{ flex:1, height:h, borderRadius:"2px 2px 0 0",
                          background: isMedian ? T.navyMid : "#C5CBE9",
                          transition:"height 0.3s" }} />
                    );
                  });
                })()}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between",
                color:T.textMuted, fontSize:9, marginTop:3 }}>
                <span>€{Math.round(Math.min(...selComps.map(a=>a.price_per_m2)))}</span>
                <span style={{ color:T.navyMid, fontWeight:700 }}>med €{Math.round(median)}</span>
                <span>€{Math.round(Math.max(...selComps.map(a=>a.price_per_m2)))}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function ApartmentPage({ apt, listingId, listingName, onBack, municipality }) {
  const [aptTrend,      setAptTrend]      = useState([]);
  const [nearbyApts,    setNearbyApts]    = useState(null);
  const [nearbyListings,setNearbyListings]= useState(null);
  const [activePin,     setActivePin]     = useState(null);
  const [sortCol,       setSortCol]       = useState("price");
  const [radiusKm,      setRadiusKm]      = useState(null); // null = comarca mode
  const [loading,       setLoading]       = useState(true);

  const utColor = UNIT_COLORS[apt.unit_type] || T.navy;

  const periodSort = p => {
    const MO = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
    const [m, y] = (p||"").split(" ");
    return (parseInt(y||"0")-2000)*100 + (MO[m]||0);
  };

  useEffect(() => {
    setLoading(true);
    const radiusQ = radiusKm ? `&radius_km=${radiusKm}` : "";
    Promise.all([
      fetch(`${API}/drilldown/listing/${listingId}`).then(r=>r.json()),
      fetch(`${API}/nearby/apartments/${listingId}?unit_type=${encodeURIComponent(apt.unit_type)}${radiusQ}`).then(r=>r.json()),
      fetch(`${API}/nearby/listings/${listingId}?${radiusQ.slice(1)}`).then(r=>r.json()),
    ]).then(([detail, nbApts, nbListings]) => {
      const history = (detail.apt_trend || [])
        .filter(r => r.sub_listing_id === apt.sub_listing_id)
        .sort((a,b) => periodSort(a.period) - periodSort(b.period));
      setAptTrend(history);
      setNearbyApts(nbApts);
      setNearbyListings(nbListings);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [apt.sub_listing_id, listingId, apt.unit_type, radiusKm]);

  const mapMarkers = useMemo(() => {
    if (!nearbyListings?.listings) return [];
    return nearbyListings.listings
      .filter(l => l.lat && l.lng && !(Math.abs(l.lat - 39.47) < 0.001 && Math.abs(l.lng + 0.38) < 0.001))
      .map(l => ({
      id:       l.listing_id,
      lat:      l.lat, lng: l.lng,
      label:    l.property_name,
      sublabel: `${fmt(l.avg_price)} avg · ${l.units} apts`,
      active:   l.listing_id === listingId || l.listing_id === activePin,
      color:    l.listing_id === listingId ? T.navy
              : l.listing_id === activePin ? T.navyMid : "#8A96B4",
    }));
  }, [nearbyListings, listingId, activePin]);

  const sortedApts = useMemo(() => {
    if (!nearbyApts?.apartments) return [];
    return [...nearbyApts.apartments].sort((a,b) => (a[sortCol]||0)-(b[sortCol]||0));
  }, [nearbyApts, sortCol]);

  const priceStats = useMemo(() => {
    if (aptTrend.length < 2) return null;
    const first = aptTrend[0].price, last = aptTrend[aptTrend.length-1].price;
    const diff = last - first;
    const pct  = first ? ((diff/first)*100).toFixed(1) : 0;
    return { first, last, diff, pct };
  }, [aptTrend]);

  const SortBtn = ({ col, label }) => (
    <button onClick={() => setSortCol(col)}
      style={{ background: sortCol===col ? T.navyLight : "#fff",
        border: `1px solid ${sortCol===col ? T.borderAccent : T.border}`,
        color: sortCol===col ? T.navy : T.textSub,
        padding:"4px 10px", borderRadius:6, cursor:"pointer", fontSize:11,
        fontWeight: sortCol===col?700:500 }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#F2F4F6" }}>
      <div style={{ maxWidth:1700, margin:"0 auto" }}>

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
              <div style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase" }}>Listed Price</div>
              <div style={{ color:T.navy, fontWeight:800, fontSize:22 }}>{fmtFull(apt.price)}</div>
              <div style={{ color:T.textSub, fontSize:11 }}>€{apt.price_per_m2 ? Math.round(apt.price_per_m2) : "—"}/m²</div>
              {apt.last_updated && (
                <div style={{ color:"#6B7A9F", fontSize:10, marginTop:3 }}>
                  🕒 {apt.last_updated.replace("Listing updated on ","").replace("listing updated on ","")}
                </div>
              )}
            </div>
            {priceStats && (
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase" }}>Total Change</div>
                <div style={{ color: priceStats.diff>0?T.red:priceStats.diff<0?T.green:T.textSub,
                  fontWeight:700, fontSize:15 }}>
                  {priceStats.diff===0 ? "No change"
                    : `${priceStats.diff>0?"▲":"▼"} ${fmtFull(Math.abs(priceStats.diff))} (${Math.abs(priceStats.pct)}%)`}
                </div>
                <div style={{ color:T.textMuted, fontSize:10 }}>
                  {aptTrend[0]?.period} → {aptTrend[aptTrend.length-1]?.period}
                </div>
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
                  color:"#fff", background:T.navyMid, fontSize:12, fontWeight:700,
                  textDecoration:"none", padding:"6px 14px", borderRadius:7 }}>
                Idealista ↗
              </a>
            )}
            <button onClick={onBack}
              style={{ background:"#fff", border:`1px solid ${T.border}`, color:T.textSub,
                padding:"8px 16px", borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:600,
                boxShadow:"0 1px 3px rgba(0,0,0,0.08)" }}>← Back</button>
          </div>
        </div>

        <div style={{ padding:"28px 28px 36px" }}>
          {loading ? (
            <div style={{ padding:60, textAlign:"center", color:T.textSub }}>Loading analysis…</div>
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
                    <div style={{ display:"flex", gap:24, marginBottom:16, flexWrap:"wrap" }}>
                      {aptTrend.map((pt,i) => (
                        <div key={pt.period} style={{ textAlign:"center" }}>
                          <div style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase" }}>{pt.period}</div>
                          <div style={{ color: i===aptTrend.length-1 ? T.navy : T.text,
                            fontWeight: i===aptTrend.length-1 ? 700 : 600, fontSize:14 }}>{fmtFull(pt.price)}</div>
                          <div style={{ color:T.textSub, fontSize:10 }}>€{pt.price_per_m2}/m²</div>
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
                          stroke={T.navyMid} strokeWidth={2} strokeDasharray="5 3"
                          dot={{ r:4, fill:T.navyMid }}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* ── Section 2: Similar Apts Nearby + Map ────────────── */}
              <div style={{ marginBottom:32 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
                  <div style={{ fontWeight:700, fontSize:15, color:T.text,
                    display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ background:utColor, color:"#fff", width:24, height:24, borderRadius:"50%",
                      display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800 }}>2</span>
                    Similar {apt.unit_type} Apartments Nearby
                    <span style={{ color:T.textMuted, fontWeight:400, fontSize:12 }}>· {nearbyApts?.comarca}</span>
                  </div>
                  {/* Radius slider */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto",
                    background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px" }}>
                    <span style={{ fontSize:11, color:T.textMuted, whiteSpace:"nowrap" }}>📍 Search radius:</span>
                    <input type="range" min="1" max="30" step="1"
                      value={radiusKm ?? 0}
                      onChange={e => setRadiusKm(+e.target.value === 0 ? null : +e.target.value)}
                      style={{ width:100, accentColor:utColor, cursor:"pointer" }}
                    />
                    <span style={{ fontSize:12, fontWeight:700, color:utColor, minWidth:90 }}>
                      {radiusKm ? `${radiusKm} km radius` : `Comarca`}
                    </span>
                    {radiusKm && (
                      <button onClick={() => setRadiusKm(null)}
                        style={{ background:"none", border:"none", color:T.textMuted, fontSize:11,
                          cursor:"pointer", padding:0, fontWeight:600 }}>✕ reset</button>
                    )}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:16, alignItems:"start" }}>
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
                            {["Development","Floor","Price","€/m²","Beds","Amenities","Updated","Link"].map((h,hi)=>(
                              <th key={hi} style={{ padding:"8px 10px", position:"sticky", top:0, zIndex:1,
                                background:T.bgStripe, color:T.textMuted,
                                fontSize:9, textTransform:"uppercase", whiteSpace:"nowrap",
                                textAlign: h==="Development"?"left":"right",
                                borderBottom:`1px solid ${T.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                      </table>
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
                              const borderColor = isThis ? T.navy : isPinned ? T.navyMid : isCur ? "rgba(201,168,76,0.4)" : "transparent";
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
                                      color:isThis?T.navy:isPinned?T.navyMid:isCur?T.navy:T.text, fontSize:11,
                                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:130 }}>{a.property_name}</div>
                                    <div style={{ color:T.textMuted, fontSize:10 }}>{a.municipality}</div>
                                    {isThis&&<div style={{ fontSize:9,color:T.navy,fontWeight:700 }}>◀ This apt</div>}
                                    {isPinned&&!isThis&&<div style={{ fontSize:9,color:T.navyMid,fontWeight:700 }}>📍 Pinned</div>}
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"right", whiteSpace:"nowrap" }}>{a.floor||"—"}</td>
                                  <td style={{ padding:"8px 10px", textAlign:"right", whiteSpace:"nowrap" }}>
                                    <div style={{ color:isThis?T.navy:T.text, fontWeight:isThis?700:600 }}>{fmtFull(a.price)}</div>
                                    <DiffTag d={pDiff} isEur={false}/>
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"right", whiteSpace:"nowrap" }}>
                                    <div style={{ color:T.textSub }}>{a.price_per_m2?`€${Math.round(a.price_per_m2)}`:"—"}</div>
                                    <DiffTag d={mDiff} isEur={true}/>
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"right" }}>{a.bedrooms??"—"}</td>
                                  <td style={{ padding:"8px 10px", textAlign:"right" }}>
                                    <div style={{ display:"flex", gap:3, justifyContent:"flex-end" }}>
                                      <Pill on={a.has_terrace} label="T"/><Pill on={a.has_parking} label="P"/>
                                      <Pill on={a.has_pool} label="Pool"/><Pill on={a.has_lift} label="Lift"/>
                                    </div>
                                  </td>
                                  <td style={{ padding:"8px 10px", whiteSpace:"nowrap", fontSize:10, color:"#6B7A9F" }}>
                                    {a.last_updated ? a.last_updated.replace("Listing updated on ","").replace("listing updated on ","") : "—"}
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"center" }}>
                                    {a.unit_url&&<a href={a.unit_url} target="_blank" rel="noreferrer"
                                      style={{ display:"inline-flex", alignItems:"center", gap:3,
                                        color:"#fff", background:T.navyMid, fontSize:10, fontWeight:700,
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
                  <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`,
                    boxShadow:T.shadow, height:510, position:"sticky", top:16 }}>
                    <LeafletMap markers={mapMarkers} height="510px" zoom={12}
                      onMarkerClick={id => setActivePin(p => p===id ? null : id)} />
                  </div>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
