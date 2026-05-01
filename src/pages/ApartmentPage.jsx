import { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, Legend } from "recharts";
import { T, Pill, fmt, fmtFull, fmtNum, UNIT_COLORS, ESG_COLORS, Tag } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";
import LoadingHouse from "../components/LoadingHouse.jsx";

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
  const diffColor = diff > 0 ? T.green : diff < 0 ? T.red : T.textSub;

  const allSelected = selected.size === allIds.size;
  const noneSelected = selected.size === 0;

  return (
    <div style={{ marginBottom:32 }}>
      {/* Section header */}
      <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:16,
        display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ background:utColor, color:"#fff", width:24, height:24, borderRadius:"50%",
          display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800 }}>4</span>
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
                {comparables.map((a) => {
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
                        {a.price_per_m2 ? `€${Math.round(a.price_per_m2).toLocaleString("en-US")}` : "—"}
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
                  median €{Math.round(median).toLocaleString("en-US")}/m² × {apt.size}m²
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
                    ["Median €/m²", `€${Math.round(median).toLocaleString("en-US")}`, T.navyMid],
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
                      <div key={i} title={`€${Math.round(v).toLocaleString("en-US")}/m²`}
                        style={{ flex:1, height:h, borderRadius:"2px 2px 0 0",
                          background: isMedian ? T.navyMid : "#C5CBE9",
                          transition:"height 0.3s" }} />
                    );
                  });
                })()}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between",
                color:T.textMuted, fontSize:9, marginTop:3 }}>
                <span>€{Math.round(Math.min(...selComps.map(a=>a.price_per_m2))).toLocaleString("en-US")}</span>
                <span style={{ color:T.navyMid, fontWeight:700 }}>med €{Math.round(median).toLocaleString("en-US")}</span>
                <span>€{Math.round(Math.max(...selComps.map(a=>a.price_per_m2))).toLocaleString("en-US")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function ApartmentPage({ apt, listingId, listingName, onBack, municipality, onGoListing }) {
  const [aptTrend,      setAptTrend]      = useState([]);
  const [nearbyTrend,   setNearbyTrend]   = useState([]);
  const [nearbyApts,    setNearbyApts]    = useState(null);
  const [nearbyListings,setNearbyListings]= useState(null);
  const [listingDetail, setListingDetail] = useState(null);
  const [activePin,     setActivePin]     = useState(null);
  const tableRef = useRef(null);
  const [sortCol,       setSortCol]       = useState("price");
  const [radiusKm,      setRadiusKm]      = useState(7);
  const [loading,       setLoading]       = useState(true);
  const [floorPlans,    setFloorPlans]    = useState([]);
  const [devFloorPlans, setDevFloorPlans] = useState([]);
  const [devPhotos,     setDevPhotos]     = useState([]);
  const [fpAptSpecific, setFpAptSpecific] = useState(false);
  const [fpIdx,         setFpIdx]         = useState(0);
  const [photoIdx,      setPhotoIdx]      = useState(0);
  const [fpLightbox,    setFpLightbox]    = useState(false);
  const [lightboxSrc,   setLightboxSrc]   = useState("fp"); // "fp" | "photo"


  const utColor = UNIT_COLORS[apt.unit_type] || T.navy;

  const periodSort = p => {
    const MO = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
    const [m, y] = (p||"").split(" ");
    return (parseInt(y||"0")-2000)*100 + (MO[m]||0);
  };

  // Fetch apt floor plans + development photos
  useEffect(() => {
    setFloorPlans([]); setDevFloorPlans([]); setDevPhotos([]); setFpIdx(0); setPhotoIdx(0);
    // Apt-specific floor plans
    fetch(`${API}/listing/photos/${listingId}/${apt.sub_listing_id}`)
      .then(r => r.json())
      .then(d => {
        setFloorPlans(d.floor_plans || []);
        setFpAptSpecific(d.apt_specific || false);
      })
      .catch(() => {});
    // Development-level photos + floor plans
    fetch(`${API}/listing/photos/${listingId}`)
      .then(r => r.json())
      .then(d => {
        setDevPhotos(d.photos || []);
        setDevFloorPlans(d.floor_plans || []);
      })
      .catch(() => {});
  }, [listingId, apt.sub_listing_id]);

  useEffect(() => {
    setLoading(true);
    const radiusQ = radiusKm ? `radius_km=${radiusKm}` : "";
    Promise.all([
      fetch(`${API}/drilldown/listing/${listingId}`).then(r=>r.json()),
      fetch(`${API}/nearby/apartments/${listingId}?${radiusQ}`).then(r=>r.json()),
      fetch(`${API}/nearby/listings/${listingId}?${radiusQ}`).then(r=>r.json()),
      fetch(`${API}/nearby/apartments/${listingId}/trend?unit_type=${encodeURIComponent(apt.unit_type)}${radiusQ ? "&"+radiusQ : ""}`).then(r=>r.json()),
    ]).then(([detail, nbApts, nbListings, nbTrend]) => {
      const history = (detail.apt_trend || [])
        .filter(r => r.sub_listing_id === apt.sub_listing_id)
        .sort((a,b) => periodSort(a.period) - periodSort(b.period));
      setAptTrend(history);
      setListingDetail(detail);
      setNearbyApts(nbApts);
      setNearbyListings(nbListings);
      setNearbyTrend(nbTrend?.trend || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [apt.sub_listing_id, listingId, apt.unit_type, radiusKm]);

  // Scroll to first table row matching the active pin when map pin is clicked
  useEffect(() => {
    if (!activePin || !tableRef.current) return;
    const row = tableRef.current.querySelector(`[data-lid="${activePin}"]`);
    if (row) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activePin]);

  const sortedApts = useMemo(() => {
    if (!nearbyApts?.apartments) return [];
    return [...nearbyApts.apartments]
      .filter(a => a.unit_type === apt.unit_type)
      .sort((a,b) => {
        // Self always first
        const aThis = a.sub_listing_id === apt.sub_listing_id ? 0 : 1;
        const bThis = b.sub_listing_id === apt.sub_listing_id ? 0 : 1;
        if (aThis !== bThis) return aThis - bThis;
        return (a[sortCol]||0) - (b[sortCol]||0);
      });
  }, [nearbyApts, sortCol, apt]);

  const mapMarkers = useMemo(() => {
    if (!nearbyListings?.listings) return [];
    // Only pin developments that have at least one similar apartment in the table
    const visibleLids = new Set(sortedApts.map(a => a.listing_id));
    visibleLids.add(listingId);
    return nearbyListings.listings
      .filter(l => visibleLids.has(l.listing_id))
      .filter(l => l.lat && l.lng && !(Math.abs(l.lat - 39.47) < 0.001 && Math.abs(l.lng + 0.38) < 0.001))
      .map(l => ({
        id:       l.listing_id,
        lat:      l.lat, lng: l.lng,
        label:    l.property_name,
        sublabel: `${fmt(l.avg_price)} avg · ${fmtNum(l.units)} apts`,
        active:   l.listing_id === listingId || l.listing_id === activePin,
        color:    l.listing_id === listingId ? T.navy
                : l.listing_id === activePin ? T.navyMid : "#8A96B4",
      }));
  }, [nearbyListings, sortedApts, listingId, activePin]);

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
        color: sortCol===col ? "#fff" : T.textSub,
        padding:"4px 10px", borderRadius:6, cursor:"pointer", fontSize:11,
        fontWeight: sortCol===col?700:500 }}>
      {label}
    </button>
  );


  return (
    <div style={{ minHeight:"100vh", background:"#F2F4F6" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>

        {/* ── Breadcrumb nav ─────────────────────────────────────────── */}
        <div style={{ background:"#fff", borderBottom:`1px solid ${T.border}`, padding:"10px 28px",
          display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={onBack}
            style={{ background:"none", border:"none", color:T.textSub, cursor:"pointer",
              fontSize:13, fontWeight:600, padding:0, display:"flex", alignItems:"center", gap:6 }}>
            ← {listingName || "Back"}
          </button>
          <span style={{ color:T.border }}>›</span>
          <span style={{ color:T.textMuted, fontSize:12 }}>{apt.unit_type}</span>
          {apt.floor && <><span style={{ color:T.border }}>›</span><span style={{ color:T.textMuted, fontSize:12 }}>Floor {apt.floor}</span></>}
        </div>

        {/* ── Hero: two-column listing card ─────────────────────────── */}
        {(() => {
          // Floor plans: apt-specific takes priority; suppress dev floor plans if apt ones exist
          const fpMedia   = fpAptSpecific ? floorPlans : (floorPlans.length ? floorPlans : devFloorPlans);
          const fpScope   = fpAptSpecific ? "This unit" : "Development";
          const fpTotal   = fpMedia.length;
          const prevFp    = () => setFpIdx(i => (i - 1 + fpTotal) % fpTotal);
          const nextFp    = () => setFpIdx(i => (i + 1) % fpTotal);

          const photoMedia  = devPhotos;
          const photoTotal  = photoMedia.length;
          const prevPhoto   = () => setPhotoIdx(i => (i - 1 + photoTotal) % photoTotal);
          const nextPhoto   = () => setPhotoIdx(i => (i + 1) % photoTotal);

          const Carousel = ({ media, idx, onPrev, onNext, onThumb, label, emptyIcon, height = 260 }) => {
            const cur = media[idx] || null;
            const total = media.length;
            const isFloorplan = label.includes("Floor");
            return (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
                  letterSpacing:"0.07em", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                  {label}
                  {total > 0 && <span style={{ background:T.bgStripe, border:`1px solid ${T.border}`,
                    borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:600, color:T.textSub }}>{total}</span>}
                </div>
                <div style={{ position:"relative", borderRadius:10, overflow:"hidden",
                  background: isFloorplan ? "#F8F9FF" : "#F2F4F6",
                  border:`1px solid ${T.border}`, height }}>
                  {cur ? (
                    <img src={cur} alt={label}
                      style={{ width:"100%", height:"100%",
                        objectFit: isFloorplan ? "contain" : "cover",
                        display:"block", cursor:"zoom-in" }}
                      onClick={() => { setLightboxSrc(isFloorplan ? "fp" : "photo"); setFpLightbox(true); }}
                      onError={e => { e.target.style.display="none"; }} />
                  ) : (
                    <div style={{ height:"100%", display:"flex", flexDirection:"column",
                      alignItems:"center", justifyContent:"center", color:T.textMuted }}>
                      <div style={{ fontSize:32, marginBottom:6 }}>{emptyIcon}</div>
                      <div style={{ fontSize:11 }}>No {label.toLowerCase()} available</div>
                    </div>
                  )}
                  {total > 1 && (<>
                    <button onClick={e => { e.stopPropagation(); onPrev(); }}
                      style={{ position:"absolute", left:6, top:"50%", transform:"translateY(-50%)",
                        background:"rgba(255,255,255,0.88)", border:`1px solid ${T.border}`, color:T.text,
                        width:28, height:28, borderRadius:"50%", cursor:"pointer", fontSize:16,
                        display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.1)" }}>‹</button>
                    <button onClick={e => { e.stopPropagation(); onNext(); }}
                      style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)",
                        background:"rgba(255,255,255,0.88)", border:`1px solid ${T.border}`, color:T.text,
                        width:28, height:28, borderRadius:"50%", cursor:"pointer", fontSize:16,
                        display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.1)" }}>›</button>
                  </>)}
                  {total > 0 && (
                    <div style={{ position:"absolute", bottom:0, left:0, right:0,
                      background:"linear-gradient(transparent, rgba(0,0,0,0.4))",
                      padding:"14px 10px 8px", display:"flex", alignItems:"center", gap:6 }}>
                      {total > 1 && (
                        <span style={{ background:"rgba(0,0,0,0.55)", borderRadius:4,
                          padding:"1px 7px", fontSize:10, fontWeight:600, color:"#fff" }}>
                          {idx + 1} / {total}
                        </span>
                      )}
                      {isFloorplan && (
                        <span style={{ background:"rgba(255,255,255,0.9)", borderRadius:4,
                          padding:"1px 7px", fontSize:10, fontWeight:700, color:T.navy }}>
                          {fpScope}
                        </span>
                      )}
                      {!isFloorplan && apt.unit_url && (
                        <a href={apt.unit_url} target="_blank" rel="noreferrer"
                          style={{ marginLeft:"auto", background:"rgba(255,255,255,0.92)",
                            borderRadius:5, padding:"3px 9px", fontSize:11, fontWeight:600,
                            color:T.navy, textDecoration:"none" }}>↗ Idealista</a>
                      )}
                    </div>
                  )}
                </div>
                {/* Thumbnail strip */}
                {total > 1 && (
                  <div style={{ display:"flex", gap:5, overflowX:"auto", marginTop:6, paddingBottom:2 }}>
                    {media.map((url, i) => (
                      <div key={i} onClick={() => onThumb(i)}
                        style={{ flexShrink:0, width:52, height:40, borderRadius:6, overflow:"hidden",
                          border:`2px solid ${idx===i ? T.navy : T.border}`, cursor:"pointer",
                          opacity: idx===i ? 1 : 0.6, transition:"all 0.15s",
                          background: isFloorplan ? "#F8F9FF" : "#fff" }}>
                        <img src={url} alt=""
                          style={{ width:"100%", height:"100%", objectFit: isFloorplan ? "contain" : "cover" }}
                          onError={e => { e.target.parentElement.style.display="none"; }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          };

          return (
        <div style={{ background:"#fff", borderBottom:`1px solid ${T.border}`, padding:"24px 28px 20px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 300px", gap:24, alignItems:"start", maxWidth:1000, margin:"0 auto" }}>

            {/* ── LEFT: media + listing details ── */}
            <div style={{ minWidth:0 }}>
              {/* Both carousels side by side */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:4, alignItems:"start", minWidth:0 }}>
                <div style={{ minWidth:0 }}>
                  <Carousel media={fpMedia} idx={fpIdx} onPrev={prevFp} onNext={nextFp}
                    onThumb={setFpIdx} label="Floor Plans" emptyIcon="🗺" height={280} />
                </div>
                <div style={{ minWidth:0 }}>
                  <Carousel media={photoMedia} idx={photoIdx} onPrev={prevPhoto} onNext={nextPhoto}
                    onThumb={setPhotoIdx} label="Development Photos" emptyIcon="📸" height={280} />
                </div>
              </div>



              {/* Title + location */}
              <h1 style={{ margin:"0 0 6px", fontSize:22, fontWeight:700, color:T.text, lineHeight:1.3 }}>
                {apt.unit_type} for sale — {listingName}
              </h1>
              <div style={{ color:T.textSub, fontSize:13, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                📍 {municipality}
                {apt.floor && <span style={{ color:T.textMuted }}>· Floor {apt.floor}</span>}
              </div>

              {/* Unit type + House type badges */}
              {(apt.unit_type || apt.house_type) && (
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                  {apt.unit_type && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
                      background:utColor, borderRadius:6,
                      padding:"4px 10px", fontSize:12, color:"#fff", fontWeight:700 }}>
                      🏠 {apt.unit_type}
                    </span>
                  )}
                  {apt.house_type && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
                      background:"#F3F4F6", border:"1px solid #D1D5DB", borderRadius:6,
                      padding:"4px 10px", fontSize:12, color:"#374151", fontWeight:600 }}>
                      🏡 {apt.house_type}
                    </span>
                  )}
                </div>
              )}

              {/* Price */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:30, fontWeight:800, color:T.navy, lineHeight:1 }}>
                  {fmtFull(apt.price)}
                </div>
                <div style={{ color:T.textSub, fontSize:13, marginTop:4, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  {apt.price_per_m2 ? `€${Math.round(apt.price_per_m2).toLocaleString("en-US")}/m²` : ""}
                  {priceStats && priceStats.diff !== 0 && (
                    <span style={{ fontWeight:600,
                      color: priceStats.diff > 0 ? T.red : T.green }}>
                      {priceStats.diff > 0 ? "▲" : "▼"} {fmtFull(Math.abs(priceStats.diff))} ({Math.abs(priceStats.pct)}%) since {aptTrend[0]?.period}
                    </span>
                  )}
                </div>
              </div>

              {/* Key features row */}
              <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:0, marginBottom:16,
                borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, padding:"12px 0" }}>
                {[
                  ["🏠", "New home"],
                  apt.size && ["📐", `${apt.size} m²`],
                  apt.bedrooms != null && ["🛏", `${apt.bedrooms} bed.`],
                  apt.bathrooms != null && ["🚿", `${apt.bathrooms} bath.`],
                  apt.has_parking && ["🚗", "Parking included"],
                  apt.has_terrace && ["🌅", "Terrace"],
                  apt.has_pool && ["🏊", "Pool"],
                  apt.has_ac && ["❄️", "A/C"],
                  apt.has_lift && ["🛗", "Lift"],
                ].filter(Boolean).map(([icon, label], i, arr) => (
                  <span key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, color:T.text,
                    paddingRight: i < arr.length-1 ? 16 : 0,
                    marginRight: i < arr.length-1 ? 16 : 0,
                    borderRight: i < arr.length-1 ? `1px solid ${T.border}` : "none" }}>
                    <span>{icon}</span>{label}
                  </span>
                ))}
              </div>

              {apt.last_updated && (
                <div style={{ color:T.textMuted, fontSize:11, marginBottom:12 }}>
                  🕒 {apt.last_updated.replace("Listing updated on ","").replace("listing updated on ","")}
                </div>
              )}

              {/* ── Other Information ── */}
              {(() => {
                const beach = listingDetail?.nearest_beach_km;
                const beachName = listingDetail?.nearest_beach_name;
                const delivery = listingDetail?.delivery_date || apt.delivery_date;
                const _dc = delivery ? String(delivery).replace("Delivery : ","").replace("delivery : ","").trim() : null;
                const deliveryClean = _dc && _dc !== "nan" && _dc !== "" ? _dc : null;
                const extras = [
                  apt.has_garden    && ["🌿", "Garden"],
                  apt.has_storage   && ["📦", "Storage room"],
                  apt.has_wardrobes && ["🚪", "Fitted wardrobes"],
                  apt.has_pool      && ["🏊", "Swimming pool"],
                  apt.has_ac        && ["❄️", "Air conditioning"],
                  apt.has_lift      && ["🛗", "Lift"],
                  apt.has_parking   && ["🚗", "Parking"],
                  apt.has_terrace   && ["🌅", "Terrace"],
                ].filter(Boolean);
                const hasAnything = beach || deliveryClean || extras.length > 0;
                if (!hasAnything) return null;
                return (
                  <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:14, marginTop:4 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
                      letterSpacing:"0.07em", marginBottom:10 }}>Other Information</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {beach && (
                        <span style={{ display:"inline-flex", alignItems:"center", gap:5,
                          background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:6,
                          padding:"5px 10px", fontSize:12, color:"#1D4ED8", fontWeight:600 }}>
                          🏖 {beach} km to {beachName || "beach"}
                        </span>
                      )}
                      {deliveryClean && (
                        <span style={{ display:"inline-flex", alignItems:"center", gap:5,
                          background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:6,
                          padding:"5px 10px", fontSize:12, color:T.text, fontWeight:500 }}>
                          📅 Delivery: {deliveryClean}
                        </span>
                      )}
                      {extras.map(([icon, label]) => (
                        <span key={label} style={{ display:"inline-flex", alignItems:"center", gap:5,
                          background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:6,
                          padding:"5px 10px", fontSize:12, color:T.text }}>
                          {icon} {label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── RIGHT: sidebar ── */}
            <div style={{ position:"sticky", top:16 }}>
              {/* Idealista CTA */}
              <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:12,
                padding:"20px", boxShadow:T.shadowMd, marginBottom:14 }}>
                <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:14, textAlign:"center" }}>
                  View on Idealista
                </div>
                {apt.unit_url ? (
                  <>
                    <a href={apt.unit_url} target="_blank" rel="noreferrer"
                      style={{ display:"block", width:"100%", background:T.navy, color:"#fff",
                        textAlign:"center", padding:"12px", borderRadius:8, textDecoration:"none",
                        fontWeight:700, fontSize:14, marginBottom:10, boxSizing:"border-box" }}>
                      Contact via Idealista →
                    </a>
                    <a href={apt.unit_url} target="_blank" rel="noreferrer"
                      style={{ display:"block", width:"100%", background:"none", border:`1px solid ${T.border}`,
                        color:T.textSub, textAlign:"center", padding:"10px", borderRadius:8, textDecoration:"none",
                        fontWeight:600, fontSize:13, boxSizing:"border-box" }}>
                      View phone / full listing ↗
                    </a>
                  </>
                ) : (
                  <div style={{ background:T.bgStripe, borderRadius:8, padding:"12px",
                    textAlign:"center", color:T.textMuted, fontSize:12 }}>
                    No Idealista listing link available
                  </div>
                )}

                {/* Listing reference */}
                <div style={{ borderTop:`1px solid ${T.border}`, marginTop:14, paddingTop:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ color:T.textMuted, fontSize:11 }}>Listing reference</span>
                    <span style={{ color:T.text, fontSize:11, fontWeight:600 }}>Unit {apt.sub_listing_id}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ color:T.textMuted, fontSize:11 }}>Developer</span>
                    <span style={{ color:T.text, fontSize:11, fontWeight:600 }}>{apt.developer || listingName}</span>
                  </div>
                  {apt.unit_type && (
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ color:T.textMuted, fontSize:11 }}>Type</span>
                      <span style={{ background:utColor, color:"#fff", fontSize:10, fontWeight:700,
                        padding:"2px 8px", borderRadius:4 }}>{apt.unit_type}</span>
                    </div>
                  )}
                  {apt.size && (
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ color:T.textMuted, fontSize:11 }}>Size</span>
                      <span style={{ color:T.text, fontSize:11, fontWeight:600 }}>{apt.size} m²</span>
                    </div>
                  )}
                  {apt.floor && (
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ color:T.textMuted, fontSize:11 }}>Floor</span>
                      <span style={{ color:T.text, fontSize:11, fontWeight:600 }}>{apt.floor}</span>
                    </div>
                  )}
                  {(() => {
                    const delivery = listingDetail?.delivery_date || apt.delivery_date;
                    const dc = delivery ? String(delivery).replace("Delivery : ","").replace("delivery : ","").trim() : null;
                    const dcClean = dc && dc !== "nan" && dc !== "" ? dc : null;
                    return dcClean ? (
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ color:T.textMuted, fontSize:11 }}>Delivery</span>
                        <span style={{ color:T.text, fontSize:11, fontWeight:600 }}>{dcClean}</span>
                      </div>
                    ) : null;
                  })()}
                  {listingDetail?.nearest_beach_km && (
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ color:T.textMuted, fontSize:11 }}>Nearest beach</span>
                      <span style={{ color:"#1D4ED8", fontSize:11, fontWeight:600 }}>
                        🏖 {listingDetail.nearest_beach_km} km
                      </span>
                    </div>
                  )}
                  {apt.esg_grade && apt.esg_grade !== "nan" && (
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ color:T.textMuted, fontSize:11 }}>ESG Certificate</span>
                      <Tag label={`ESG ${apt.esg_grade}`} color={ESG_COLORS[apt.esg_grade]||"#999"}/>
                    </div>
                  )}
                </div>
              </div>

              {/* Price history card */}
              {priceStats && (
                <div style={{ background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
                    letterSpacing:"0.06em", marginBottom:12 }}>Price History</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {[
                      ["First seen", fmtFull(priceStats.first), T.textSub],
                      ["Current",    fmtFull(priceStats.last),  T.navy],
                      ["Change",     `${priceStats.diff > 0 ? "+" : ""}${fmtFull(priceStats.diff)}`, priceStats.diff > 0 ? T.red : T.green],
                      ["% Change",   `${priceStats.diff > 0 ? "+" : ""}${priceStats.pct}%`,           priceStats.diff > 0 ? T.red : T.green],
                    ].map(([lbl, val, color]) => (
                      <div key={lbl}>
                        <div style={{ color:T.textMuted, fontSize:9, textTransform:"uppercase", fontWeight:600 }}>{lbl}</div>
                        <div style={{ color, fontWeight:700, fontSize:13 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
          );
        })()}

        {/* Lightbox */}
        {fpLightbox && (
          <div onClick={() => setFpLightbox(false)}
            style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.92)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
            {(() => {
              const isFp    = lightboxSrc === "fp";
              const lbMedia = isFp
                ? (fpAptSpecific ? floorPlans : (floorPlans.length ? floorPlans : devFloorPlans))
                : devPhotos;
              const lbIdx   = isFp ? fpIdx : photoIdx;
              const setLbIdx = isFp ? setFpIdx : setPhotoIdx;
              const total   = lbMedia.length;
              const cur     = lbMedia[lbIdx];
              if (!cur) return null;
              return <>
                <img src={cur} alt={`${isFp ? "Floor plan" : "Photo"} ${lbIdx+1}`}
                  onClick={e => e.stopPropagation()}
                  style={{ maxWidth:"90vw", maxHeight:"88vh",
                    objectFit: isFp ? "contain" : "cover",
                    borderRadius:8, boxShadow:"0 8px 40px rgba(0,0,0,0.6)" }}
                  onError={e => { e.target.style.display="none"; }} />
                {total > 1 && (<>
                  <button onClick={e => { e.stopPropagation(); setLbIdx(i => (i-1+total)%total); }}
                    style={{ position:"fixed", left:24, top:"50%", transform:"translateY(-50%)",
                      background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
                      width:48, height:48, borderRadius:"50%", cursor:"pointer", fontSize:28,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                  <button onClick={e => { e.stopPropagation(); setLbIdx(i => (i+1)%total); }}
                    style={{ position:"fixed", right:24, top:"50%", transform:"translateY(-50%)",
                      background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
                      width:48, height:48, borderRadius:"50%", cursor:"pointer", fontSize:28,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
                </>)}
                <button onClick={() => setFpLightbox(false)}
                  style={{ position:"fixed", top:16, right:20, background:"rgba(255,255,255,0.15)",
                    border:"none", color:"#fff", width:40, height:40, borderRadius:"50%",
                    cursor:"pointer", fontSize:20, display:"flex", alignItems:"center",
                    justifyContent:"center" }}>✕</button>
                <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)",
                  background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:13, fontWeight:600,
                  padding:"6px 16px", borderRadius:20 }}>
                  {isFp ? "Floor Plan" : "Photo"} {lbIdx+1} / {total}
                </div>
              </>;
            })()}
          </div>
        )}

        {/* ── Analytics sections ─────────────────────────────────────── */}
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
                    <div style={{ display:"flex", gap:24, marginBottom:16, flexWrap:"wrap" }}>
                      {aptTrend.map((pt,i) => (
                        <div key={pt.period} style={{ textAlign:"center" }}>
                          <div style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase" }}>{pt.period}</div>
                          <div style={{ color: i===aptTrend.length-1 ? T.navy : T.text,
                            fontWeight: i===aptTrend.length-1 ? 700 : 600, fontSize:14 }}>{fmtFull(pt.price)}</div>
                          <div style={{ color:T.textSub, fontSize:10 }}>€{pt.price_per_m2 ? Math.round(pt.price_per_m2).toLocaleString("en-US") : "—"}/m²</div>
                        </div>
                      ))}
                    </div>
                    {(() => {
                      const MO = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
                      const sortP = p => { const [m,y]=p.split(" "); return (parseInt(y)-2000)*100+(MO[m]||0); };
                      const allPeriods = [...new Set([...aptTrend.map(p=>p.period), ...nearbyTrend.map(p=>p.period)])].sort((a,b)=>sortP(a)-sortP(b));
                      const ntMap = Object.fromEntries(nearbyTrend.map(p=>[p.period, p]));
                      const atMap = Object.fromEntries(aptTrend.map(p=>[p.period, p]));
                      const merged = allPeriods.map(period => ({
                        period,
                        price:        atMap[period]?.price ?? null,
                        nearby_price: ntMap[period]?.avg_price ?? null,
                        pm2:          atMap[period]?.price_per_m2 ?? null,
                        nearby_pm2:   ntMap[period]?.avg_price_m2 ?? null,
                      }));
                      const tooltipStyle = { background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12 };
                      const xProps = { dataKey:"period", tick:{ fill:T.textSub, fontSize:11 }, axisLine:false, tickLine:false };
                      const yProps = { tick:{ fill:T.textSub, fontSize:11 }, axisLine:false, tickLine:false };
                      return (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                          {/* Chart 1 — Price */}
                          <div>
                            <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Price</div>
                            <ResponsiveContainer width="100%" height={180}>
                              <LineChart data={merged}>
                                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                                <XAxis {...xProps}/>
                                <YAxis {...yProps} tickFormatter={v=>`€${(v/1000).toFixed(0)}K`}/>
                                <Tooltip formatter={(v,name)=>[v!=null?fmtFull(v):"—",name]} contentStyle={tooltipStyle}/>
                                <Legend wrapperStyle={{ fontSize:11 }}/>
                                <Line type="monotone" dataKey="price" name="This unit"
                                  stroke={utColor} strokeWidth={3} dot={{ r:5, fill:utColor, stroke:"#fff", strokeWidth:2 }} connectNulls/>
                                <Line type="monotone" dataKey="nearby_price" name="Avg nearby"
                                  stroke={utColor} strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={0.5}
                                  dot={{ r:3, fill:utColor, fillOpacity:0.5 }} connectNulls/>
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          {/* Chart 2 — €/m² */}
                          <div>
                            <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>€/m²</div>
                            <ResponsiveContainer width="100%" height={180}>
                              <LineChart data={merged}>
                                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                                <XAxis {...xProps}/>
                                <YAxis {...yProps} tickFormatter={v=>`€${Math.round(v).toLocaleString("en-US")}`}/>
                                <Tooltip formatter={(v,name)=>[v!=null?`€${Math.round(v).toLocaleString("en-US")}/m²`:"—",name]} contentStyle={tooltipStyle}/>
                                <Legend wrapperStyle={{ fontSize:11 }}/>
                                <Line type="monotone" dataKey="pm2" name="This unit"
                                  stroke={T.navyMid} strokeWidth={3} dot={{ r:5, fill:T.navyMid, stroke:"#fff", strokeWidth:2 }} connectNulls/>
                                <Line type="monotone" dataKey="nearby_pm2" name="Avg nearby"
                                  stroke={T.navyMid} strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={0.5}
                                  dot={{ r:3, fill:T.navyMid, fillOpacity:0.5 }} connectNulls/>
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* ── Section 2: Similar Apts Nearby + Map ────────────── */}
              <div style={{ marginBottom:32 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
                  <div style={{ fontWeight:700, fontSize:15, color:T.text,
                    display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ background:utColor, color:"#fff", width:24, height:24, borderRadius:"50%",
                      display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800 }}>3</span>
                    Nearby Similar Properties
                    <span style={{ color:T.textMuted, fontWeight:400, fontSize:12 }}>· {radiusKm} km radius</span>
                  </div>
                  {/* Radius slider */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto",
                    background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px" }}>
                    <span style={{ fontSize:11, color:T.textMuted, whiteSpace:"nowrap" }}>📍 Search radius:</span>
                    <input type="range" min="1" max="7" step="1"
                      value={radiusKm ?? 7}
                      onChange={e => setRadiusKm(+e.target.value)}
                      style={{ width:100, accentColor:utColor, cursor:"pointer" }}
                    />
                    <span style={{ fontSize:12, fontWeight:700, color:utColor, minWidth:90 }}>
                      {radiusKm} km radius
                    </span>
                    {radiusKm !== 7 && (
                      <button onClick={() => setRadiusKm(7)}
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
                        {sortedApts.length} units
                      </span>
                    </div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                        <thead>
                          <tr style={{ background:T.bgStripe, borderBottom:`1px solid ${T.border}` }}>
                            {["Development","House Type","Floor","Price","€/m²","Beds","Amenities","Updated","Link",""].map((h,hi)=>(
                              <th key={hi} style={{ padding:"8px 10px", position:"sticky", top:0, zIndex:1,
                                background:T.bgStripe, color:T.textMuted,
                                fontSize:9, textTransform:"uppercase", whiteSpace:"nowrap",
                                textAlign: h==="Development"?"left":"right",
                                borderBottom:`1px solid ${T.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                      </table>
                      <div ref={tableRef} style={{ maxHeight: 460, overflowY:"auto" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                          <tbody>
                            {sortedApts.map((a,i)=>{
                              const isCur    = a.is_current_listing;
                              const isThis   = a.sub_listing_id === apt.sub_listing_id;
                              const isPinned = a.listing_id === activePin;
                              const pDiff = isThis || !apt.price ? null : a.price - apt.price;
                              const mDiff = isThis || !apt.price_per_m2 ? null : (a.price_per_m2||0) - apt.price_per_m2;
                              const rowBg = isThis   ? T.navyLight
                                          : isPinned ? "rgba(234,88,12,0.10)"
                                          : isCur    ? T.navyLight
                                          : i%2===0  ? T.bgStripe : "#fff";
                              const borderColor = isThis ? "#EA580C" : isPinned ? "#EA580C" : isCur ? "rgba(201,168,76,0.4)" : "transparent";
                              const cellColor  = isThis || isCur ? "#fff" : T.text;
                              const mutedColor = isThis || isCur ? "rgba(255,255,255,0.65)" : T.textSub;
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
                                <tr key={a.sub_listing_id} data-lid={a.listing_id}
                                  onClick={() => setActivePin(p => p===a.listing_id ? null : a.listing_id)}
                                  style={{ background:rowBg, borderBottom:`1px solid ${T.border}`,
                                    borderLeft:`3px solid ${borderColor}`,
                                    cursor:"pointer", transition:"background 0.1s" }}>
                                  <td style={{ padding:"8px 10px", maxWidth:140 }}>
                                    <div style={{ fontWeight:isCur||isPinned?700:500,
                                      color:isThis||isCur?"#fff":isPinned?T.navyMid:T.text, fontSize:11,
                                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:130 }}>{a.property_name}</div>
                                    <div style={{ color:isCur?"rgba(255,255,255,0.7)":T.textMuted, fontSize:10 }}>{a.municipality}</div>
                                    {isThis&&<div style={{ fontSize:9,color:"rgba(255,255,255,0.85)",fontWeight:700 }}>◀ This apt</div>}
                                    {isPinned&&!isThis&&<div style={{ fontSize:9,color:T.navyMid,fontWeight:700 }}>📍 Pinned</div>}
                                  </td>
                                  <td style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>
                                    {a.house_type
                                      ? <span style={{ background: isThis||isCur ? "rgba(255,255,255,0.15)" : T.navyTint,
                                          color: isThis||isCur ? "#fff" : T.navy,
                                          borderRadius:5, padding:"2px 7px", fontSize:10, fontWeight:600 }}>
                                          {a.house_type}
                                        </span>
                                      : <span style={{ color:mutedColor }}>—</span>}
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"right", whiteSpace:"nowrap", color:cellColor }}>{a.floor||"—"}</td>
                                  <td style={{ padding:"8px 10px", textAlign:"right", whiteSpace:"nowrap" }}>
                                    <div style={{ color:cellColor, fontWeight:isThis?700:600 }}>{fmtFull(a.price)}</div>
                                    <DiffTag d={pDiff} isEur={false}/>
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"right", whiteSpace:"nowrap" }}>
                                    <div style={{ color:mutedColor }}>{a.price_per_m2?`€${Math.round(a.price_per_m2).toLocaleString("en-US")}`:"—"}</div>
                                    <DiffTag d={mDiff} isEur={true}/>
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"right", color:cellColor }}>{a.bedrooms??"—"}</td>
                                  <td style={{ padding:"8px 10px", textAlign:"right" }}>
                                    <div style={{ display:"flex", gap:3, justifyContent:"flex-end" }}>
                                      <Pill on={a.has_terrace} label="T"/><Pill on={a.has_parking} label="P"/>
                                      <Pill on={a.has_pool} label="Pool"/><Pill on={a.has_lift} label="Lift"/>
                                    </div>
                                  </td>
                                  <td style={{ padding:"8px 10px", whiteSpace:"nowrap", fontSize:10, color:mutedColor }}>
                                    {a.last_updated ? a.last_updated.replace("Listing updated on ","").replace("listing updated on ","") : "—"}
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"center" }}>
                                    {a.unit_url&&<a href={a.unit_url} target="_blank" rel="noreferrer"
                                      style={{ display:"inline-flex", alignItems:"center", gap:3,
                                        color:"#fff", background:T.navyMid, fontSize:10, fontWeight:700,
                                        textDecoration:"none", padding:"3px 9px", borderRadius:5,
                                        whiteSpace:"nowrap" }}>Idealista ↗</a>}
                                  </td>
                                  <td style={{ padding:"8px 10px", textAlign:"center" }}>
                                    {!isThis && onGoListing && (
                                      <button onClick={() => onGoListing(a.listing_id, a.property_name, a.municipality)}
                                        style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:5,
                                          color: isCur||isPinned ? cellColor : T.navy,
                                          fontSize:10, fontWeight:700, cursor:"pointer",
                                          padding:"3px 9px", whiteSpace:"nowrap" }}>
                                        View →
                                      </button>
                                    )}
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
