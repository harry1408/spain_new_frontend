import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, Cell } from "recharts";
import { T, ChartCard, Tag, Pill, fmt, fmtFull, COLORS, UNIT_COLORS, ESG_COLORS } from "../components/shared.jsx";
import { API } from "../App.jsx";
import PriceMatrixTab from "./PriceMatrixTab.jsx";
import LeafletMap from "../components/LeafletMap.jsx";
import ApartmentModal from "./ApartmentModal.jsx";

// ── Comparison popup ──────────────────────────────────────────────────────
function ComparePanel({ listing, current, onGoListing, onClose }) {
  const priceDiff = listing.avg_price && current.avg_price ? listing.avg_price - current.avg_price : null;
  const m2Diff    = listing.avg_price_m2 && current.avg_price_m2 ? listing.avg_price_m2 - current.avg_price_m2 : null;

  // current avg_price comes from unit_comparison if not directly on data
  const curAvg = current.avg_price || (current.unit_comparison?.reduce((s,u)=>s+u.avg_price*u.count,0) / Math.max(1,current.unit_comparison?.reduce((s,u)=>s+u.count,0))) || null;
  const curM2  = current.avg_price_m2 || (current.unit_comparison?.reduce((s,u)=>s+u.avg_price_m2*u.count,0) / Math.max(1,current.unit_comparison?.reduce((s,u)=>s+u.count,0))) || null;
  const pd = listing.avg_price && curAvg ? listing.avg_price - curAvg : null;
  const md = listing.avg_price_m2 && curM2 ? listing.avg_price_m2 - curM2 : null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:800 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.25)" }}/>
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        background:"#fff", borderRadius:16, width:420, maxWidth:"90vw",
        boxShadow:"0 20px 60px rgba(0,0,0,0.22)", border:`1px solid ${T.border}`, overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:T.bgStripe, borderBottom:`1px solid ${T.border}`,
          padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:T.text }}>{listing.property_name}</div>
            <div style={{ color:T.textSub, fontSize:12, marginTop:2, display:"flex", gap:8, alignItems:"center" }}>
              {listing.municipality}
              {listing.esg_grade && listing.esg_grade!=="nan" &&
                <span style={{ background:ESG_COLORS[listing.esg_grade]||"#999", color:"#fff",
                  fontSize:10, padding:"1px 6px", borderRadius:4, fontWeight:700 }}>
                  ESG {listing.esg_grade}
                </span>}
            </div>
            {listing.developer && <div style={{ color:T.textMuted, fontSize:11, marginTop:1 }}>by {listing.developer}</div>}
            {listing.delivery_date && <div style={{ color:T.textMuted, fontSize:11 }}>{listing.delivery_date.replace("Delivery : ","")}</div>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
            color:T.textMuted, fontSize:22, lineHeight:1, padding:"0 0 0 12px" }}>×</button>
        </div>

        {/* Stats grid */}
        <div style={{ padding:"16px 18px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
            {[
              ["Avg Price",  fmt(listing.avg_price),   pd],
              ["Min Price",  fmt(listing.min_price),   null],
              ["€/m²",       `€${Math.round(listing.avg_price_m2||0)}`, md],
              ["Apartments", listing.units,            null],
              ["Avg Size",   `${listing.avg_size}m²`,  null],
              ["Unit Types", listing.unit_types||"—",  null],
            ].map(([lbl, val, d]) => (
              <div key={lbl} style={{ background:T.bgStripe, borderRadius:8, padding:"8px 10px" }}>
                <div style={{ color:T.textMuted, fontSize:9, textTransform:"uppercase", fontWeight:600, marginBottom:2 }}>{lbl}</div>
                <div style={{ color:T.gold, fontWeight:700, fontSize:13 }}>{val}</div>
                {d != null && (
                  <div style={{ fontSize:10, color:d>0?T.red:d<0?T.green:T.textMuted, marginTop:1 }}>
                    {d>0?"▲":"▼"} {fmt(Math.abs(d))} vs current
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* vs current note */}
          <div style={{ background:"rgba(201,168,76,0.07)", border:`1px solid ${T.borderAccent}`,
            borderRadius:8, padding:"8px 12px", marginBottom:14, fontSize:11 }}>
            <span style={{ color:T.textMuted }}>Comparing vs </span>
            <span style={{ fontWeight:700, color:T.gold }}>{current.property_name}</span>
          </div>

          <button
            onClick={() => onGoListing(listing.listing_id, listing.property_name, listing.municipality)}
            style={{ width:"100%", background:T.gold, border:"none", color:"#fff",
              padding:"12px", borderRadius:9, cursor:"pointer", fontSize:13, fontWeight:700 }}>
            Go to Listing →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Nearby section (no map, click to compare) ─────────────────────────────
function NearbySection({ listings, comarca, currentListingId, currentListing, onGoListing }) {
  const [selected, setSelected] = useState(null);
  const sorted = useMemo(() => [...listings].sort((a,b)=>a.avg_price-b.avg_price), [listings]);
  const selectedListing = useMemo(() => selected ? listings.find(l=>l.listing_id===selected) : null, [selected, listings]);

  return (
    <div style={{ marginTop:36 }}>
      <div style={{ fontWeight:700, fontSize:16, color:T.text, marginBottom:4 }}>Nearby Developments</div>
      <div style={{ color:T.textSub, fontSize:12, marginBottom:16 }}>
        {comarca} comarca · {listings.length} developments
        <span style={{ color:T.textMuted, marginLeft:6 }}>· click any card to compare</span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10 }}>
        {sorted.map(l => {
          const isCur = l.listing_id === currentListingId;
          const isSel = l.listing_id === selected;
          return (
            <div key={l.listing_id}
              onClick={() => !isCur && setSelected(p => p===l.listing_id ? null : l.listing_id)}
              style={{ background: isCur?T.goldLight:isSel?"rgba(74,128,176,0.10)":"#fff",
                border:`2px solid ${isCur?T.borderAccent:isSel?T.blue:T.border}`,
                borderRadius:12, padding:"12px 16px", boxShadow:T.shadow,
                cursor:isCur?"default":"pointer", transition:"all 0.12s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:12, color:isCur?T.gold:isSel?T.blue:T.text,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {l.property_name}
                    {isCur&&<span style={{ marginLeft:5, fontSize:9, background:T.gold, color:"#fff", padding:"1px 5px", borderRadius:3 }}>Current</span>}
                    {isSel&&!isCur&&<span style={{ marginLeft:5, fontSize:9, background:T.blue, color:"#fff", padding:"1px 5px", borderRadius:3 }}>Comparing</span>}
                  </div>
                  <div style={{ color:T.textSub, fontSize:11, marginTop:1 }}>{l.municipality}</div>
                </div>
                {l.esg_grade&&l.esg_grade!=="nan"&&<Tag label={`ESG ${l.esg_grade}`} color={ESG_COLORS[l.esg_grade]||"#999"}/>}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"3px 4px" }}>
                {[["Apts",l.units,T.text],["Avg",fmt(l.avg_price),T.gold],
                  ["Min",fmt(l.min_price),T.green],["€/m²",`€${Math.round(l.avg_price_m2||0)}`,T.textSub]].map(([lbl,val,color])=>(
                  <div key={lbl}>
                    <div style={{ color:T.textMuted, fontSize:9, textTransform:"uppercase", fontWeight:600 }}>{lbl}</div>
                    <div style={{ color, fontWeight:600, fontSize:11 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedListing && (
        <ComparePanel
          listing={selectedListing}
          current={currentListing}
          onGoListing={onGoListing}
          onClose={()=>setSelected(null)}
        />
      )}
    </div>
  );
}

export default function ListingPage({ listingId, municipality, onBack, onGoListing, highlight }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [meta,        setMeta]        = useState(null);
  const [nearby,      setNearby]      = useState(null);
  const [selectedApt, setSelectedApt] = useState(null);
  const [showAddrMap, setShowAddrMap] = useState(false);
  const [pulse,       setPulse]       = useState(false);

  // Trigger heartbeat when highlight prop is set (navigated from scatter chart)
  useEffect(() => {
    if (highlight) {
      // Wait for data to load then pulse twice
      const t = setTimeout(() => { setPulse(true); setTimeout(() => setPulse(false), 1400); }, 600);
      return () => clearTimeout(t);
    }
  }, [highlight]);

  useEffect(() => {
    setLoading(true); setData(null); setMeta(null); setNearby(null);
    setSelectedApt(null); setShowAddrMap(false);
    Promise.all([
      fetch(`${API}/drilldown/listing/${listingId}`).then(r=>r.json()),
      fetch(`${API}/listing/meta/${listingId}`).then(r=>r.json()),
      fetch(`${API}/nearby/listings/${listingId}`).then(r=>r.json()),
    ]).then(([d,m,nb]) => { setData(d); setMeta(m); setNearby(nb); setLoading(false); })
      .catch(() => setLoading(false));
  }, [listingId]);

  const singleMarker = useMemo(() => meta?.lat ? [{
    id: listingId, lat: meta.lat, lng: meta.lng,
    label: data?.property_name || "", sublabel: municipality || "",
    active: true, color: T.gold,
  }] : [], [meta, listingId, data, municipality]);

  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.textSub }}>Loading…</div>;
  if (!data?.listing_id) return <div style={{ padding:60, textAlign:"center", color:T.textSub }}>Listing not found.</div>;

  const esgColor = ESG_COLORS[data.esg_grade] || "#999";

  return (
    <div style={{ padding:"24px 36px", maxWidth:1500, margin:"0 auto" }}>
      {/* Heartbeat keyframes */}
      <style>{`
        @keyframes heartbeat {
          0%   { box-shadow: 0 0 0 0 rgba(201,168,76,0); background: transparent; }
          20%  { box-shadow: 0 0 0 12px rgba(201,168,76,0.35); background: rgba(201,168,76,0.08); }
          40%  { box-shadow: 0 0 0 0 rgba(201,168,76,0); background: transparent; }
          60%  { box-shadow: 0 0 0 12px rgba(201,168,76,0.35); background: rgba(201,168,76,0.08); }
          100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); background: transparent; }
        }
        .listing-pulse { animation: heartbeat 1.4s ease-out forwards; border-radius: 12px; }
      `}</style>

      {/* Header */}
      <div className={pulse ? "listing-pulse" : ""}
        style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
          marginBottom:20, flexWrap:"wrap", gap:12, padding: pulse ? "12px 14px" : "0",
          transition:"padding 0.2s" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <h2 style={{ margin:0, fontFamily:"'DM Serif Display',serif", fontSize:24,
              color:T.text, fontWeight:400 }}>{data.property_name}</h2>
            {data.esg_grade && <Tag label={`ESG ${data.esg_grade}`} color={esgColor}/>}
          </div>
          <div style={{ color:T.textSub, fontSize:12, marginBottom:4 }}>
            by <strong style={{ color:T.text }}>{data.developer}</strong>
            {" · "}<span style={{ color:T.gold, fontWeight:600 }}>{data.municipality}</span>
            {" · "}<span>{data.delivery_date?.replace("Delivery : ","")}</span>
            {" · "}<span style={{ color:T.green, fontWeight:600 }}>{data.total_units} apartments</span>
          </div>
          {meta?.city_area && (() => {
            const addr = String(meta.city_area).replace(/ NN/g,"").replace(/,\s*Valencia\s*$/i,"").trim();
            return (
              <div style={{ position:"relative", display:"inline-block" }}>
                <div onClick={()=>setShowAddrMap(v=>!v)}
                  style={{ color:T.textMuted, fontSize:11, display:"flex", alignItems:"center",
                    gap:4, cursor:"pointer", userSelect:"none" }}>
                  <span>📍</span>
                  <span style={{ textDecoration:"underline dotted", textUnderlineOffset:2 }}>{addr}</span>
                  <span style={{ fontSize:10, opacity:0.6 }}>{showAddrMap?"▲":"▼"}</span>
                </div>
                {showAddrMap && meta.lat && (
                  <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:999,
                    background:"#fff", border:`1px solid ${T.border}`, borderRadius:10,
                    boxShadow:"0 8px 32px rgba(0,0,0,0.13)", overflow:"hidden", width:340 }}>
                    <div style={{ padding:"8px 12px", borderBottom:`1px solid ${T.border}`,
                      display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:11, color:T.textSub, fontWeight:600 }}>{data.property_name}</span>
                      <button onClick={e=>{e.stopPropagation();setShowAddrMap(false);}}
                        style={{ background:"none", border:"none", cursor:"pointer",
                          color:T.textMuted, fontSize:16, lineHeight:1, padding:0 }}>×</button>
                    </div>
                    <LeafletMap markers={singleMarker} height="220px" zoom={15}/>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        <button onClick={onBack}
          style={{ background:"#fff", border:`1px solid ${T.border}`, color:T.textSub,
            padding:"8px 16px", borderRadius:9, cursor:"pointer", fontSize:12,
            fontWeight:600, boxShadow:T.shadow }}>
          ← Back to {data.municipality}
        </button>
      </div>

      {/* Price Matrix — click any row to open apartment deep-dive */}
      <div style={{ marginBottom:4 }}>
        <div style={{ color:T.textMuted, fontSize:11, marginBottom:8 }}>
          Click any apartment row to open detailed analysis
        </div>
        <PriceMatrixTab
          listingId={listingId}
          onRowClick={apt => setSelectedApt(apt)}
        />
      </div>

      {/* Unit Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:28 }}>
        <ChartCard title="Price Range by Unit Type">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.unit_comparison} barSize={34}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="unit_type" tick={{ fill:T.textSub, fontSize:12 }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`}
                tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v=>[fmtFull(v)]}
                contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }}/>
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
                <tr style={{ borderBottom:`1px solid ${T.border}`, background:T.bgStripe }}>
                  {["Type","Count","Min","Avg","Max","m²","€/m²"].map(h=>(
                    <th key={h} style={{ padding:"7px 10px", textAlign:h==="Type"?"left":"right",
                      color:T.textMuted, fontSize:10, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.unit_comparison.map((u,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgStripe:"#fff" }}>
                    <td style={{ padding:"7px 10px" }}>
                      <span style={{ background:UNIT_COLORS[u.unit_type]||"#aaa", color:"#fff",
                        fontWeight:700, fontSize:11, padding:"2px 8px", borderRadius:4 }}>{u.unit_type}</span>
                    </td>
                    <td style={{ padding:"7px 10px", textAlign:"right" }}>{u.count}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:T.green, fontWeight:600 }}>{fmt(u.min_price)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:T.gold, fontWeight:700 }}>{fmt(u.avg_price)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:T.red }}>{fmt(u.max_price)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:T.textSub }}>{u.avg_size}m²</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:T.blue, fontWeight:600 }}>{fmt(u.avg_price_m2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* Nearby Developments */}
      {nearby?.listings?.length > 0 && (
        <NearbySection
          listings={nearby.listings}
          comarca={nearby.comarca}
          currentListingId={listingId}
          currentListing={data}
          onGoListing={onGoListing}
        />
      )}

      {/* Apartment Deep Dive Modal */}
      {selectedApt && (
        <ApartmentModal
          apt={selectedApt}
          listingId={listingId}
          listingName={data.property_name}
          onClose={()=>setSelectedApt(null)}
        />
      )}
    </div>
  );
}
