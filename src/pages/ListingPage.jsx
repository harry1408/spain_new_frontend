import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, Cell } from "recharts";
import { T, ChartCard, Tag, Pill, fmt, fmtFull, COLORS, UNIT_COLORS, ESG_COLORS ,PRICE_COLOR,M2_COLOR} from "../components/shared.jsx";
import { API } from "../App.jsx";
import PriceMatrixTab from "./PriceMatrixTab.jsx";
import LeafletMap from "../components/LeafletMap.jsx";
import GoogleStaticMap from "../components/GoogleStaticMap.jsx";
import LoadingHouse from "../components/LoadingHouse.jsx";
import React from "react";

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
function PriceByUnitChart({ data }) {
  const [showM2, setShowM2] = usePriceToggle();
  const dataKey = showM2 ? "avg_price_m2" : "avg_price";
  const yFmt = showM2 ? v=>`€${Number(v/1000).toFixed(1)}K` : v=>`€${Number(v/1000).toFixed(0)}K`;
  const ttFmt = showM2 ? v=>`€${Math.round(Number(v)).toLocaleString()}/m²` : v=>fmtFull(v);
  const safe = (data||[]).map(d=>({ ...d, avg_price_m2: Number(d.avg_price_m2)||0 }));
  const maxVal = safe.length ? Math.max(...safe.map(d=>d[dataKey]||0)) : 1;
  return (
    <ChartCard title="Price Range by Unit Type">
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:-28, marginBottom:8 }}>
        <ToggleBtn showM2={showM2} onToggle={()=>setShowM2(v=>!v)}/>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={safe} barSize={34}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
          <XAxis dataKey="unit_type" tick={{ fill:T.textSub, fontSize:12 }} axisLine={false} tickLine={false}/>
          <YAxis tickFormatter={yFmt} tick={{ fill:T.textSub, fontSize:11 }} axisLine={false} tickLine={false}
            domain={[0, Math.ceil(maxVal * 1.15)]}/>
          <Tooltip formatter={v=>[ttFmt(v), showM2?"Avg €/m²":"Avg Price"]}
            contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 }}/>
          <Bar dataKey={dataKey} name={showM2?"Avg €/m²":"Avg Price"} radius={[6,6,0,0]} isAnimationActive={false}>
            {safe.map((e,i)=><Cell key={i} fill={showM2?M2_COLOR:(UNIT_COLORS[e.unit_type]||COLORS[i])}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

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
              ["€/m²",       listing.avg_price_m2 ? `€${Math.round(listing.avg_price_m2).toLocaleString("en")}` : "—", md],
              ["Apartments", listing.units,            null],
              ["Avg Size",   `${listing.avg_size}m²`,  null],
              ["Unit Types", listing.unit_types||"—",  null],
            ].map(([lbl, val, d]) => (
              <div key={lbl} style={{ background:T.bgStripe, borderRadius:8, padding:"8px 10px" }}>
                <div style={{ color:T.textMuted, fontSize:9, textTransform:"uppercase", fontWeight:600, marginBottom:2 }}>{lbl}</div>
                <div style={{ color:T.navy, fontWeight:700, fontSize:13 }}>{val}</div>
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
            <span style={{ fontWeight:700, color:T.navy }}>{current.property_name}</span>
          </div>

          <button
            onClick={() => onGoListing(listing.listing_id, listing.property_name, listing.municipality)}
            style={{ width:"100%", background:T.navy, border:"none", color:"#fff",
              padding:"12px", borderRadius:9, cursor:"pointer", fontSize:13, fontWeight:700 }}>
            Go to Listing →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Nearby section ────────────────────────────────────────────────────────
function NearbySection({ listings, comarca, currentListingId, currentListing, onGoListing }) {
  const [selected, setSelected] = useState(null);
  const sorted = useMemo(() => [...listings].sort((a,b)=>a.avg_price-b.avg_price), [listings]);
  const selectedListing = useMemo(() => selected ? listings.find(l=>l.listing_id===selected) : null, [selected, listings]);

  return (
    <div style={{ marginTop:36 }}>
      <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:4 }}>
        <div style={{ fontWeight:700, fontSize:16, color:T.text }}>Nearby Developments</div>
        <span style={{ fontSize:11, color:T.textMuted, fontWeight:500 }}>within 20 km</span>
      </div>
      <div style={{ color:T.textSub, fontSize:12, marginBottom:16 }}>
        {comarca} comarca · {listings.length} development{listings.length !== 1 ? "s" : ""} found
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
        {sorted.map(l => {
          const isCur = l.listing_id === currentListingId;
          const isSel = l.listing_id === selected;
          const unitTypes  = (l.unit_types  || "").split(", ").filter(Boolean);
          const houseTypes = (l.house_types || "").split(", ").filter(Boolean);
          return (
            <div key={l.listing_id}
              onClick={() => !isCur && onGoListing(l.listing_id, l.property_name, l.municipality)}
              style={{ background: isCur ? "rgba(201,168,76,0.08)" : "#fff",
                border:`1px solid ${isCur ? T.borderAccent : T.border}`,
                borderRadius:12, padding:"14px 16px", cursor:isCur?"default":"pointer",
                boxShadow:"0 1px 4px rgba(0,0,0,0.06)", transition:"all 0.15s",
                display:"flex", flexDirection:"column", gap:8 }}>

              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:2,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {l.property_name}
                  </div>
                  <div style={{ fontSize:11, color:T.textSub }}>
                    {l.municipality}{l.province ? ` · ${l.province}` : ""}
                  </div>
                  {l.city_area && (
                    <div style={{ fontSize:10, color:T.textMuted, marginTop:2,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      📍 {l.city_area}
                    </div>
                  )}
                </div>
                {l.esg_grade && l.esg_grade !== "Unknown" && l.esg_grade !== "nan" && (
                  <span style={{ background:ESG_COLORS[l.esg_grade]||"#8A96B4",
                    color:"#fff", borderRadius:5, padding:"2px 8px", fontSize:10,
                    fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>
                    ESG {l.esg_grade}
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:"uppercase" }}>Units</div>
                  <div style={{ fontSize:15, fontWeight:700, color:T.text }}>{l.units}</div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:"uppercase" }}>Avg Price</div>
                  <div style={{ fontSize:15, fontWeight:700, color:PRICE_COLOR }}>{fmt(l.avg_price)}</div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:"uppercase" }}>€/m²</div>
                  <div style={{ fontSize:15, fontWeight:700, color:M2_COLOR }}>€{Math.round(l.avg_price_m2||0).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:"uppercase" }}>Range</div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.textSub }}>{fmt(l.min_price)} – {fmt(l.max_price)}</div>
                </div>
              </div>

              {/* Tags */}
              {(unitTypes.length > 0 || houseTypes.length > 0) && (
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {unitTypes.map(ut => (
                    <span key={ut} style={{ background:UNIT_COLORS[ut]||"#8A96B4",
                      color:"#fff", borderRadius:4, padding:"2px 7px", fontSize:10, fontWeight:700 }}>{ut}</span>
                  ))}
                  {houseTypes.map(ht => (
                    <span key={ht} style={{ background:"rgba(100,100,140,0.10)", color:T.textSub,
                      border:`1px solid ${T.border}`, borderRadius:4, padding:"2px 7px",
                      fontSize:10, fontWeight:700 }}>{ht}</span>
                  ))}
                </div>
              )}

              {/* Beach / stated units */}
              {(l.stated_total_units || l.nearest_beach_km) && (
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:-2 }}>
                  {l.stated_total_units && (
                    <span style={{ fontSize:10, color:T.textMuted }}>
                      📋 <span style={{ fontWeight:600 }}>{l.stated_total_units}</span> apts per description
                    </span>
                  )}
                  {l.nearest_beach_km && (
                    <span style={{ fontSize:10, color:"#0077B6", fontWeight:600 }}>
                      🏖 {l.nearest_beach_km} km
                      {l.nearest_beach_name ? <span style={{ fontWeight:400, color:T.textMuted }}> · {l.nearest_beach_name}</span> : null}
                    </span>
                  )}
                </div>
              )}

              {!isCur && (
                <div style={{ fontSize:11, color:T.navy, fontWeight:600, marginTop:-4 }}>
                  View development →
                </div>
              )}
              {isCur && (
                <div style={{ fontSize:10, color:T.textMuted, fontStyle:"italic", marginTop:-4 }}>Current listing</div>
              )}
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

// ── Description block with expand/collapse ───────────────────────────────
function DescriptionBlock({ text, forceExpand = false }) {
  const [expanded, setExpanded] = React.useState(false);
  const LIMIT = 280;
  const short = text.length > LIMIT;
  const display = expanded || !short || forceExpand ? text : text.slice(0, LIMIT) + "…";
  return (
    <div style={{ background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:10,
      padding:"14px 18px", fontSize:12, lineHeight:1.7, color:T.textSub,
      width:"100%" }}>
      <div style={{ whiteSpace:"pre-wrap" }}>{display}</div>
      {short && !forceExpand && (
        <button onClick={() => setExpanded(v=>!v)}
          style={{ background:"none", border:"none", color:PRICE_COLOR, fontSize:11,
            fontWeight:700, cursor:"pointer", padding:"4px 0 0", marginTop:4 }}>
          {expanded ? "Show less ▲" : "Read more ▼"}
        </button>
      )}
    </div>
  );
}

export default function ListingPage({ listingId, municipality, onBack, onGoListing, onGoApartment, highlight, backLabel }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [meta,        setMeta]        = useState(null);
  const [nearby,      setNearby]      = useState(null);
  const [showAddrMap, setShowAddrMap] = useState(false);
  const [pulse,       setPulse]       = useState(false);
  const [photos,      setPhotos]      = useState([]);
  const [floorPlans,  setFloorPlans]  = useState([]);
  const [photoIdx,    setPhotoIdx]    = useState(0);
  const [fpIdx,       setFpIdx]       = useState(0);
  const [photoLoading,setPhotoLoading]= useState(false);
  const [lightbox,    setLightbox]    = useState(false);
  const [fpLightbox,  setFpLightbox]  = useState(false);

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
    setShowAddrMap(false);
    setPhotos([]); setFloorPlans([]); setPhotoIdx(0); setFpIdx(0); setPhotoLoading(true);
    Promise.all([
      fetch(`${API}/drilldown/listing/${listingId}`).then(r=>r.json()),
      fetch(`${API}/listing/meta/${listingId}`).then(r=>r.json()),
      fetch(`${API}/nearby/listings/${listingId}?radius_km=20`).then(r=>r.json()),
      fetch(`${API}/listing/photos/${listingId}`).then(r=>r.json()).catch(()=>({photos:[]})),
    ]).then(([d,m,nb,ph]) => {
      setData(d); setMeta(m); setNearby(nb);
      setPhotos(ph.photos || []);
      setFloorPlans(ph.floor_plans || []);
      setPhotoLoading(false);
      setLoading(false);
    }).catch(() => { setLoading(false); setPhotoLoading(false); });
  }, [listingId]);

  const singleMarker = useMemo(() => meta?.lat ? [{
    id: listingId, lat: meta.lat, lng: meta.lng,
    label: data?.property_name || "", sublabel: municipality || "",
    active: true, color: T.navy,
  }] : [], [meta, listingId, data, municipality]);

  if (loading) return <div style={{ padding:60, textAlign:"center" }}><LoadingHouse message="Loading listing…" /></div>;
  if (!data?.listing_id) return <div style={{ padding:60, textAlign:"center", color:T.textSub }}>Listing not found.</div>;

  const esgColor = ESG_COLORS[data.esg_grade] || "#999";

  return (
    <div style={{ padding:"20px 20px", maxWidth:1700, margin:"0 auto" }}>
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
            <h2 style={{ margin:0, fontFamily:"'Inter',sans-serif", fontSize:26,
              color:T.text, fontWeight:400 }}>{data.property_name}</h2>
            {data.esg_grade && <Tag label={`ESG ${data.esg_grade}`} color={esgColor}/>}
            {data.is_tourist && (
              <span style={{ fontSize:11, padding:"3px 9px", borderRadius:5, fontWeight:700,
                background:"#FFF3E0", color:"#E07800", border:"1px solid #F5A623" }}>
                Tourist Apt
              </span>
            )}
          </div>
          <div style={{ color:T.textSub, fontSize:12, marginBottom:4 }}>
            by <strong style={{ color:T.text }}>{data.developer}</strong>
            {" · "}<span style={{ color:T.navy, fontWeight:600 }}>{data.municipality}</span>
            {" · "}<span>{data.delivery_date?.replace("Delivery : ","")}</span>
            {" · "}<span style={{ color:T.green, fontWeight:600 }}>{data.total_units} apartments</span>
            {data.stated_total_units && (
              <span style={{ marginLeft:4, color:T.textMuted, fontSize:11 }}>
                ({data.stated_total_units} per description)
              </span>
            )}
            {data.nearest_beach_km && (
              <span style={{ marginLeft:8, fontSize:12, fontWeight:600, color:"#0077B6" }}>
                🏖 {data.nearest_beach_km} km to {data.nearest_beach_name || "beach"}
              </span>
            )}
          </div>
          {(meta?.city_area || meta?.street) && (() => {
            const parts = [];
            if (meta.street && meta.street !== "nan") parts.push(String(meta.street).trim());
            if (meta.city_area) {
              const ca = String(meta.city_area).replace(/ NN/g,"").replace(/,\s*Valencia\s*$/i,"").trim();
              if (ca && ca !== "nan" && ca !== parts[0]) parts.push(ca);
            }
            if (meta.comarca && meta.comarca !== "nan") parts.push(String(meta.comarca).trim());
            const addr = parts.join(", ");
            return (
              <div style={{ position:"relative", display:"inline-block" }}>
                <div onClick={()=>setShowAddrMap(v=>!v)}
                  style={{ color:T.textMuted, fontSize:11, display:"flex", alignItems:"center",
                    gap:4, cursor:"pointer", userSelect:"none" }}>
                  <span>📍</span>
                  <span style={{ textDecoration:"underline dotted", textUnderlineOffset:2 }}>{addr || data.municipality}</span>
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
                    <GoogleStaticMap mapUrl={meta?.map_url} lat={meta?.lat} lng={meta?.lng} label={data?.property_name} height="220px" zoom={15}/>
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
          ← Back to {backLabel || data.municipality}
        </button>
      </div>

      {/* Description + Photos row */}
      {(data.description || photos.length > 0 || photoLoading) && (() => {
        const cleaned = data.description
          ? data.description
              .replace(/This comment was automatically translated[^\n]*/gi, "")
              .replace(/See description in the original language/gi, "")
              .replace(/\n{3,}/g, "\n\n")
              .trim()
          : "";
        const hasPhotos = photos.length > 0 || photoLoading;
        const hasFP = floorPlans.length > 0;
        const IMG_SIZE = 320;
        return (
          <div style={{ marginBottom:11 }}>

            {/* Row 1: Images side-by-side, left-aligned */}
            {hasPhotos && (
              <div style={{ display:"flex", gap:16, marginBottom:16, alignItems:"stretch" }}>

                {/* Photo Slideshow — leftmost */}
                <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`,
                  boxShadow:T.shadow, background:"#0B1239", position:"relative",
                  flex:1, height:400 }}>

                {photoLoading && photos.length === 0 ? (
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
                    justifyContent:"center", color:"#6B7A9F", fontSize:12 }}>
                    Loading photos…
                  </div>
                ) : (
                  <>
                    {/* Main image — click to open lightbox */}
                    <img
                      src={photos[photoIdx]}
                      alt={`Photo ${photoIdx+1}`}
                      onClick={() => setLightbox(true)}
                      style={{ width:"100%", height:"100%", objectFit:"cover", display:"block",
                        position:"absolute", inset:0, cursor:"zoom-in" }}
                      onError={e => { e.target.style.display="none"; }}
                    />

                    {/* Prev / Next arrows */}
                    {photos.length > 1 && (<>
                      <button onClick={() => setPhotoIdx(i => (i-1+photos.length)%photos.length)}
                        style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)",
                          background:"rgba(0,0,0,0.55)", border:"none", color:"#fff",
                          width:32, height:32, borderRadius:"50%", cursor:"pointer",
                          fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                      <button onClick={() => setPhotoIdx(i => (i+1)%photos.length)}
                        style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                          background:"rgba(0,0,0,0.55)", border:"none", color:"#fff",
                          width:32, height:32, borderRadius:"50%", cursor:"pointer",
                          fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                    </>)}

                    {/* Dot indicators — sliding window when > 7 photos */}
                    {photos.length > 1 && (() => {
                      const MAX = 7;
                      if (photos.length <= MAX) {
                        return (
                          <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)",
                            display:"flex", gap:5 }}>
                            {photos.map((_,i) => (
                              <div key={i} onClick={() => setPhotoIdx(i)}
                                style={{ width: i===photoIdx?18:7, height:7, borderRadius:4,
                                  background: i===photoIdx?"#0B1239":"rgba(255,255,255,0.5)",
                                  cursor:"pointer", transition:"all 0.2s" }} />
                            ))}
                          </div>
                        );
                      }
                      // Sliding window: show MAX dots centered around current index
                      const half = Math.floor(MAX / 2);
                      let start = Math.max(0, photoIdx - half);
                      let end = start + MAX;
                      if (end > photos.length) { end = photos.length; start = Math.max(0, end - MAX); }
                      const visible = Array.from({ length: end - start }, (_, i) => start + i);
                      return (
                        <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)",
                          display:"flex", gap:5, alignItems:"center" }}>
                          {start > 0 && <div style={{ width:4, height:4, borderRadius:"50%", background:"rgba(255,255,255,0.3)" }}/>}
                          {visible.map(i => (
                            <div key={i} onClick={() => setPhotoIdx(i)}
                              style={{ width: i===photoIdx?18:7, height:7, borderRadius:4,
                                background: i===photoIdx?"#0B1239":"rgba(255,255,255,0.5)",
                                cursor:"pointer", transition:"all 0.2s",
                                transform: `scale(${i===photoIdx ? 1 : Math.abs(i-photoIdx)===1 ? 0.85 : 0.7})` }} />
                          ))}
                          {end < photos.length && <div style={{ width:4, height:4, borderRadius:"50%", background:"rgba(255,255,255,0.3)" }}/>}
                        </div>
                      );
                    })()}

                    {/* Counter */}
                    <div style={{ position:"absolute", top:8, right:8,
                      background:"rgba(0,0,0,0.55)", color:"#fff", fontSize:10,
                      fontWeight:600, padding:"3px 8px", borderRadius:10 }}>
                      {photoIdx+1} / {photos.length}
                    </div>
                  </>
                )}
                </div>

                {/* Floor Plans — slideshow matching house photos */}
                {hasFP && (
                  <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`,
                    boxShadow:T.shadow, background:"#f8f9fb", position:"relative",
                    flex:1, height:400 }}>
                    <img src={floorPlans[fpIdx]} alt={`Floor plan ${fpIdx+1}`}
                      onClick={() => setFpLightbox(true)}
                      style={{ width:"100%", height:"100%", objectFit:"contain", display:"block",
                        position:"absolute", inset:0, cursor:"zoom-in" }}
                      onError={e => { e.target.style.display="none"; }} />
                    {floorPlans.length > 1 && (<>
                      <button onClick={() => setFpIdx(i => (i-1+floorPlans.length)%floorPlans.length)}
                        style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)",
                          background:"rgba(0,0,0,0.45)", border:"none", color:"#fff",
                          width:32, height:32, borderRadius:"50%", cursor:"pointer",
                          fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                      <button onClick={() => setFpIdx(i => (i+1)%floorPlans.length)}
                        style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                          background:"rgba(0,0,0,0.45)", border:"none", color:"#fff",
                          width:32, height:32, borderRadius:"50%", cursor:"pointer",
                          fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                      <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)",
                        display:"flex", gap:5 }}>
                        {floorPlans.map((_,i) => (
                          <div key={i} onClick={() => setFpIdx(i)}
                            style={{ width:i===fpIdx?18:7, height:7, borderRadius:4,
                              background:i===fpIdx?"#0B1239":"rgba(0,0,0,0.25)",
                              cursor:"pointer", transition:"all 0.2s" }} />
                        ))}
                      </div>
                    </>)}
                    <div style={{ position:"absolute", top:8, right:8,
                      background:"rgba(0,0,0,0.45)", color:"#fff", fontSize:10,
                      fontWeight:600, padding:"3px 8px", borderRadius:10 }}>
                      {fpIdx+1} / {floorPlans.length}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Row 2: Description below images */}
            {cleaned && <DescriptionBlock text={cleaned} forceExpand={false} />}
          </div>
        );
      })()}


      {/* Floor Plan Lightbox */}
      {fpLightbox && floorPlans.length > 0 && (
        <div onClick={() => setFpLightbox(false)}
          style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.92)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
          <img src={floorPlans[fpIdx]} alt={`Floor plan ${fpIdx+1}`}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth:"90vw", maxHeight:"88vh", objectFit:"contain",
              borderRadius:8, boxShadow:"0 8px 40px rgba(0,0,0,0.6)" }}
            onError={e => { e.target.style.display="none"; }} />
          {floorPlans.length > 1 && (<>
            <button onClick={e => { e.stopPropagation(); setFpIdx(i => (i-1+floorPlans.length)%floorPlans.length); }}
              style={{ position:"fixed", left:24, top:"50%", transform:"translateY(-50%)",
                background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
                width:48, height:48, borderRadius:"50%", cursor:"pointer", fontSize:28,
                display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setFpIdx(i => (i+1)%floorPlans.length); }}
              style={{ position:"fixed", right:24, top:"50%", transform:"translateY(-50%)",
                background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
                width:48, height:48, borderRadius:"50%", cursor:"pointer", fontSize:28,
                display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>›</button>
          </>)}
          <button onClick={() => setFpLightbox(false)}
            style={{ position:"fixed", top:16, right:20, background:"rgba(255,255,255,0.15)",
              border:"none", color:"#fff", width:40, height:40, borderRadius:"50%",
              cursor:"pointer", fontSize:20, display:"flex", alignItems:"center",
              justifyContent:"center", backdropFilter:"blur(4px)" }}>✕</button>
          <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)",
            background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:13, fontWeight:600,
            padding:"6px 16px", borderRadius:20, backdropFilter:"blur(4px)" }}>
            Floor Plan {fpIdx+1} / {floorPlans.length}
          </div>
        </div>
      )}

      {/* Price Matrix */}
      <div style={{ marginBottom:4 }}>
        <PriceMatrixTab
          listingId={listingId}
          statedTotalUnits={data.stated_total_units}
          onRowClick={apt => onGoApartment && onGoApartment(apt, listingId, data.property_name, municipality)}
        />
      </div>

      {/* Unit Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:28 }}>
        <PriceByUnitChart data={data.unit_comparison} />
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
                    <td style={{ padding:"7px 10px", textAlign:"right", color:T.navy, fontWeight:700 }}>{fmt(u.avg_price)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:T.red }}>{fmt(u.max_price)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:T.textSub }}>{u.avg_size}m²</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:T.navyMid, fontWeight:600 }}>{fmt(u.avg_price_m2)}</td>
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

      {/* ── Lightbox ───────────────────────────────────────────────────── */}
      {lightbox && photos.length > 0 && (
        <div onClick={() => setLightbox(false)}
          style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.92)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
          {/* Image */}
          <img
            src={photos[photoIdx]}
            alt={`Photo ${photoIdx+1}`}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth:"90vw", maxHeight:"88vh", objectFit:"contain",
              borderRadius:8, boxShadow:"0 8px 40px rgba(0,0,0,0.6)", userSelect:"none" }}
            onError={e => { e.target.style.display="none"; }}
          />
          {/* Prev */}
          {photos.length > 1 && (
            <button onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i-1+photos.length)%photos.length); }}
              style={{ position:"fixed", left:24, top:"50%", transform:"translateY(-50%)",
                background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
                width:48, height:48, borderRadius:"50%", cursor:"pointer",
                fontSize:28, display:"flex", alignItems:"center", justifyContent:"center",
                backdropFilter:"blur(4px)" }}>‹</button>
          )}
          {/* Next */}
          {photos.length > 1 && (
            <button onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i+1)%photos.length); }}
              style={{ position:"fixed", right:24, top:"50%", transform:"translateY(-50%)",
                background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
                width:48, height:48, borderRadius:"50%", cursor:"pointer",
                fontSize:28, display:"flex", alignItems:"center", justifyContent:"center",
                backdropFilter:"blur(4px)" }}>›</button>
          )}
          {/* Counter */}
          <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)",
            background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:13, fontWeight:600,
            padding:"6px 16px", borderRadius:20, backdropFilter:"blur(4px)" }}>
            {photoIdx+1} / {photos.length}
          </div>
          {/* Close */}
          <button onClick={() => setLightbox(false)}
            style={{ position:"fixed", top:16, right:20, background:"rgba(255,255,255,0.15)",
              border:"none", color:"#fff", width:40, height:40, borderRadius:"50%",
              cursor:"pointer", fontSize:20, display:"flex", alignItems:"center",
              justifyContent:"center", backdropFilter:"blur(4px)" }}>✕</button>
          {/* Dot strip */}
          {photos.length > 1 && (
            <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
              display:"flex", gap:6, alignItems:"center" }}>
              {(() => {
                const MAX=9, half=Math.floor(MAX/2);
                let s=Math.max(0,photoIdx-half), e=s+MAX;
                if(e>photos.length){e=photos.length;s=Math.max(0,e-MAX);}
                return Array.from({length:e-s},(_,i)=>s+i).map(i=>(
                  <div key={i} onClick={e=>{e.stopPropagation();setPhotoIdx(i);}}
                    style={{ width:i===photoIdx?20:7, height:7, borderRadius:4,
                      background:i===photoIdx?"#0B1239":"rgba(255,255,255,0.4)",
                      cursor:"pointer", transition:"all 0.2s" }} />
                ));
              })()}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
