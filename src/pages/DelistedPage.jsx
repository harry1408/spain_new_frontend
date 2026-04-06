import React, { useState, useEffect, useMemo, useRef } from "react";
import { T, StatCard, ChartCard, Tag, Pill, fmt, fmtFull, COLORS, UNIT_COLORS, ESG_COLORS, AddressBreadcrumb, MapPinPopup, PRICE_COLOR, M2_COLOR } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";
import LoadingHouse from "../components/LoadingHouse.jsx";
import GoogleStaticMap from "../components/GoogleStaticMap.jsx";

function MultiSelect({ label, options, value, onChange, placeholder = "All", maxDisplay = 2 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = opt => onChange(value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt]);
  const displayLabel = value.length === 0 ? placeholder
    : value.length <= maxDisplay ? value.join(", ")
    : `${value.slice(0, maxDisplay).join(", ")} +${value.length - maxDisplay}`;
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:4, letterSpacing:"0.05em" }}>{label}</div>
      <div onClick={() => setOpen(o => !o)} style={{ background:"#fff", border:`1px solid ${value.length ? T.borderAccent : T.border}`,
        borderRadius:10, padding:"8px 12px", cursor:"pointer", minWidth:120,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        fontSize:12, color:value.length ? T.text : T.textMuted, fontWeight:value.length ? 600 : 400,
        boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"85%" }}>{displayLabel}</span>
        <span style={{ color:T.textMuted, fontSize:10, flexShrink:0 }}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:999, background:"#fff",
          border:`1px solid ${T.border}`, borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,0.12)",
          minWidth:"100%", maxHeight:240, overflowY:"auto" }}>
          {options.map(opt => (
            <div key={opt} onClick={() => toggle(opt)}
              style={{ padding:"8px 14px", cursor:"pointer", fontSize:12,
                background:value.includes(opt) ? T.navyTint : "transparent",
                color:value.includes(opt) ? T.navy : T.text,
                fontWeight:value.includes(opt) ? 700 : 400,
                display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ width:14, height:14, borderRadius:3, border:`2px solid ${value.includes(opt) ? T.navy : T.border}`,
                background:value.includes(opt) ? T.navy : "#fff", display:"inline-flex",
                alignItems:"center", justifyContent:"center", fontSize:9, color:"#fff", flexShrink:0 }}>
                {value.includes(opt) ? "✓" : ""}
              </span>
              {opt}
            </div>
          ))}
          {value.length > 0 && (
            <div onClick={() => onChange([])}
              style={{ padding:"6px 14px", borderTop:`1px solid ${T.border}`, color:T.textMuted,
                fontSize:11, cursor:"pointer", fontWeight:600 }}>✕ Clear</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Delisted listing card ─────────────────────────────────────────────────
function DelistedCard({ l, onClick }) {
  const [hov, setHov] = useState(false);
  const esgColor = ESG_COLORS[l.esg_grade] || "#999";
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? T.bgHover : T.bgCard,
        border: `2px solid ${hov ? "#6B2A2A" : "#FCA5A5"}`,
        borderRadius:12, padding:"16px 18px", cursor:"pointer",
        transition:"all 0.15s", boxShadow: hov ? T.shadowMd : T.shadow }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color: hov ? "#6B2A2A" : T.text }}>{l.property_name}</div>
          <div style={{ color:T.textSub, fontSize:11, marginTop:2 }}>{l.developer}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          <span style={{ background:"#FEF2F2", color:"#6B2A2A", border:"1px solid #FCA5A5",
            borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700 }}>Sold Out</span>
          {l.esg_grade && l.esg_grade !== "nan" && <Tag label={`ESG ${l.esg_grade}`} color={esgColor}/>}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:10 }}>
        <AddressBreadcrumb cityArea={l.city_area} municipality={l.municipality} style={{ marginBottom:0 }} />
        <MapPinPopup lat={l.lat} lng={l.lng} name={l.property_name} popupSide="bottom" />
      </div>
      {(l.unit_types || l.house_types) && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
          {(l.unit_types || "").split(", ").filter(Boolean).map(ut => (
            <span key={ut} style={{ fontSize:10, padding:"2px 7px", borderRadius:4,
              background:`${UNIT_COLORS[ut]||"#aaa"}20`, color:UNIT_COLORS[ut]||"#aaa",
              border:`1px solid ${UNIT_COLORS[ut]||"#aaa"}55`, fontWeight:700 }}>{ut}</span>
          ))}
          {(l.house_types || "").split(", ").filter(Boolean).map(ht => (
            <span key={ht} style={{ fontSize:10, padding:"2px 7px", borderRadius:4,
              background:"rgba(100,100,140,0.10)", color:T.textSub,
              border:`1px solid ${T.border}`, fontWeight:700 }}>{ht}</span>
          ))}
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"7px 10px" }}>
        {[["Apts", l.units, T.text],
          ["Last Avg", fmt(l.avg_price), PRICE_COLOR],
          ["€/m²", l.avg_price_m2 ? `€${Math.round(l.avg_price_m2).toLocaleString("en")}` : "—", M2_COLOR],
          ["From", fmt(l.min_price), T.green],
          ["To", fmt(l.max_price), T.red],
          ["Avg Size", `${l.avg_size}m²`, T.textSub],
        ].map(([lbl,val,color]) => (
          <div key={lbl}>
            <div style={{ color:T.textMuted, fontSize:9, textTransform:"uppercase", fontWeight:600 }}>{lbl}</div>
            <div style={{ color, fontWeight:600, fontSize:12 }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:10, color: hov ? "#6B2A2A" : T.textMuted, fontSize:11, fontWeight:600 }}>
        View apartments →
      </div>
    </div>
  );
}

// ── Description block ────────────────────────────────────────────────────
function DescriptionBlock({ text, forceExpand = false }) {
  const [expanded, setExpanded] = React.useState(false);
  const LIMIT = 280;
  const short = text.length > LIMIT;
  const display = expanded || !short || forceExpand ? text : text.slice(0, LIMIT) + "…";
  return (
    <div style={{ background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:10,
      padding:"14px 18px", fontSize:12, lineHeight:1.7, color:T.textSub,
      maxWidth:820, maxHeight:280, overflowY:"auto" }}>
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

// ── Apartment detail view (ListingPage-style) ─────────────────────────────
function DelistedApartments({ listingId, listingName, onBack, backLabel = "All Sold Out" }) {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [photos,       setPhotos]       = useState([]);
  const [floorPlans,   setFloorPlans]   = useState([]);
  const [photoIdx,     setPhotoIdx]     = useState(0);
  const [fpIdx,        setFpIdx]        = useState(0);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [lightbox,     setLightbox]     = useState(false);
  const [fpLightbox,   setFpLightbox]   = useState(false);
  const [showAddrMap,  setShowAddrMap]  = useState(false);

  useEffect(() => {
    setPhotoLoading(true);
    Promise.all([
      fetch(`${API}/delisted/apartments/${listingId}`).then(r => r.json()),
      fetch(`${API}/listing/photos/${listingId}`).then(r => r.json()).catch(() => ({ photos:[], floor_plans:[] })),
    ]).then(([d, ph]) => {
      setData(d);
      setPhotos(ph.photos || []);
      setFloorPlans(ph.floor_plans || []);
      setPhotoLoading(false);
      setLoading(false);
    }).catch(() => { setLoading(false); setPhotoLoading(false); });
  }, [listingId]);

  if (loading) return <div style={{ padding:60, textAlign:"center" }}><LoadingHouse message="Loading…" /></div>;
  if (!data) return null;

  const apts = data.apartments || [];
  const esgColor = ESG_COLORS[data.esg_grade] || "#999";

  return (
    <div style={{ padding:"20px 20px", maxWidth:1700, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <h2 style={{ margin:0, fontFamily:"'Inter',sans-serif", fontSize:26, color:T.text, fontWeight:400 }}>
              {data.property_name}
            </h2>
            <span style={{ background:T.redBg, color:T.red, border:`1px solid ${T.red}40`,
              borderRadius:5, padding:"3px 10px", fontSize:11, fontWeight:700 }}>Sold Out</span>
            {data.esg_grade && data.esg_grade !== "nan" && <Tag label={`ESG ${data.esg_grade}`} color={esgColor}/>}
          </div>
          <div style={{ color:T.textSub, fontSize:12, marginBottom:4 }}>
            {data.developer && <>by <strong style={{ color:T.text }}>{data.developer}</strong> · </>}
            <span style={{ color:T.navy, fontWeight:600 }}>{data.municipality}</span>
            {" · "}
            <span style={{ color:T.red, fontWeight:600 }}>Last seen: {data.last_period}</span>
            {" · "}
            <span style={{ color:T.green, fontWeight:600 }}>{apts.length} apartments</span>
          </div>
          {data.city_area && (
            <div style={{ position:"relative", display:"inline-block" }}>
              <div onClick={() => setShowAddrMap(v=>!v)}
                style={{ color:T.textMuted, fontSize:11, display:"flex", alignItems:"center",
                  gap:4, cursor:"pointer", userSelect:"none" }}>
                <span>📍</span>
                <span style={{ textDecoration:"underline dotted", textUnderlineOffset:2 }}>{data.city_area}</span>
                <span style={{ fontSize:10, opacity:0.6 }}>{showAddrMap?"▲":"▼"}</span>
              </div>
              {showAddrMap && data.lat && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:999,
                  background:"#fff", border:`1px solid ${T.border}`, borderRadius:10,
                  boxShadow:"0 8px 32px rgba(0,0,0,0.13)", overflow:"hidden", width:340 }}>
                  <div style={{ padding:"8px 12px", borderBottom:`1px solid ${T.border}`,
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:11, color:T.textSub, fontWeight:600 }}>{data.property_name}</span>
                    <button onClick={e=>{e.stopPropagation();setShowAddrMap(false);}}
                      style={{ background:"none", border:"none", cursor:"pointer", color:T.textMuted, fontSize:16, lineHeight:1, padding:0 }}>×</button>
                  </div>
                  <GoogleStaticMap lat={data.lat} lng={data.lng} label={data.property_name} height="220px" zoom={15}/>
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={onBack}
          style={{ background:"#fff", border:`1px solid ${T.border}`, color:T.textSub,
            padding:"8px 16px", borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:600,
            boxShadow:T.shadow }}>
          ← {backLabel}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <StatCard label="Total Apartments" value={apts.length} />
        <StatCard label="Avg Price (last)" value={fmt(apts.length ? apts.reduce((s,a)=>s+a.price,0)/apts.length : 0)} />
        <StatCard label="Avg €/m² (last)"  value={`€${Math.round(apts.length ? apts.reduce((s,a)=>s+(a.price_per_m2||0),0)/apts.length : 0).toLocaleString("en")}`} accent={M2_COLOR} />
        <StatCard label="Avg Size"          value={`${Math.round(apts.length ? apts.reduce((s,a)=>s+(a.size||0),0)/apts.length : 0)}m²`} accent={T.textSub} />
      </div>

      {/* Description + Photos row */}
      {(photos.length > 0 || photoLoading || data.description) && (() => {
        const cleaned = data.description
          ? data.description
              .replace(/This comment was automatically translated[^\n]*/gi, "")
              .replace(/See description in the original language/gi, "")
              .replace(/\n{3,}/g, "\n\n").trim()
          : "";
        const hasPhotos = photos.length > 0 || photoLoading;
        const hasFP = floorPlans.length > 0;
        const cols = hasPhotos ? (hasFP ? "1fr 320px 320px" : "1fr 320px") : "1fr";
        return (
          <div style={{ display:"grid", gridTemplateColumns:cols, gap:16, marginBottom:20, alignItems:"stretch" }}>
            {cleaned
              ? <DescriptionBlock text={cleaned} forceExpand={hasPhotos} />
              : hasPhotos && <div style={{ background:T.bgStripe, border:`1px solid ${T.border}`, borderRadius:10,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:T.textMuted, fontSize:12, fontStyle:"italic" }}>No description available</div>
            }

            {/* Floor Plans slideshow */}
            {hasPhotos && hasFP && (
              <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`,
                boxShadow:T.shadow, background:"#f8f9fb", position:"relative", height:280 }}>
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
                  <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
                    {floorPlans.map((_,i) => (
                      <div key={i} onClick={() => setFpIdx(i)}
                        style={{ width:i===fpIdx?18:7, height:7, borderRadius:4,
                          background:i===fpIdx?"#0B1239":"rgba(0,0,0,0.2)", cursor:"pointer", transition:"all 0.2s" }} />
                    ))}
                  </div>
                </>)}
                <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.45)",
                  color:"#fff", fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:10 }}>
                  {fpIdx+1} / {floorPlans.length}
                </div>
              </div>
            )}

            {/* Photo slideshow */}
            {hasPhotos && (
              <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`,
                boxShadow:T.shadow, background:"#0B1239", position:"relative", height:280 }}>
                {photoLoading && photos.length === 0 ? (
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
                    justifyContent:"center", color:"#6B7A9F", fontSize:12 }}>Loading photos…</div>
                ) : (<>
                  <img src={photos[photoIdx]} alt={`Photo ${photoIdx+1}`}
                    onClick={() => setLightbox(true)}
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block",
                      position:"absolute", inset:0, cursor:"zoom-in" }}
                    onError={e => { e.target.style.display="none"; }} />
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
                    <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
                      {photos.slice(0,7).map((_,i) => (
                        <div key={i} onClick={() => setPhotoIdx(i)}
                          style={{ width:i===photoIdx?18:7, height:7, borderRadius:4,
                            background:i===photoIdx?"#0B1239":"rgba(255,255,255,0.5)",
                            cursor:"pointer", transition:"all 0.2s" }} />
                      ))}
                    </div>
                  </>)}
                  <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.55)",
                    color:"#fff", fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:10 }}>
                    {photoIdx+1} / {photos.length}
                  </div>
                </>)}
              </div>
            )}
          </div>
        );
      })()}

      {/* Photo Lightbox */}
      {lightbox && photos.length > 0 && (
        <div onClick={() => setLightbox(false)}
          style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.92)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
          <img src={photos[photoIdx]} alt={`Photo ${photoIdx+1}`} onClick={e => e.stopPropagation()}
            style={{ maxWidth:"90vw", maxHeight:"88vh", objectFit:"contain", borderRadius:8 }}
            onError={e => { e.target.style.display="none"; }} />
          {photos.length > 1 && (<>
            <button onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i-1+photos.length)%photos.length); }}
              style={{ position:"fixed", left:24, top:"50%", transform:"translateY(-50%)",
                background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
                width:48, height:48, borderRadius:"50%", cursor:"pointer", fontSize:28,
                display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i+1)%photos.length); }}
              style={{ position:"fixed", right:24, top:"50%", transform:"translateY(-50%)",
                background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
                width:48, height:48, borderRadius:"50%", cursor:"pointer", fontSize:28,
                display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
          </>)}
          <button onClick={() => setLightbox(false)}
            style={{ position:"fixed", top:16, right:20, background:"rgba(255,255,255,0.15)",
              border:"none", color:"#fff", width:40, height:40, borderRadius:"50%",
              cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
      )}

      {/* Floor Plan Lightbox */}
      {fpLightbox && floorPlans.length > 0 && (
        <div onClick={() => setFpLightbox(false)}
          style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.92)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
          <img src={floorPlans[fpIdx]} alt={`Floor plan ${fpIdx+1}`} onClick={e => e.stopPropagation()}
            style={{ maxWidth:"90vw", maxHeight:"88vh", objectFit:"contain", borderRadius:8 }}
            onError={e => { e.target.style.display="none"; }} />
          {floorPlans.length > 1 && (<>
            <button onClick={e => { e.stopPropagation(); setFpIdx(i => (i-1+floorPlans.length)%floorPlans.length); }}
              style={{ position:"fixed", left:24, top:"50%", transform:"translateY(-50%)",
                background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
                width:48, height:48, borderRadius:"50%", cursor:"pointer", fontSize:28,
                display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setFpIdx(i => (i+1)%floorPlans.length); }}
              style={{ position:"fixed", right:24, top:"50%", transform:"translateY(-50%)",
                background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
                width:48, height:48, borderRadius:"50%", cursor:"pointer", fontSize:28,
                display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
          </>)}
          <button onClick={() => setFpLightbox(false)}
            style={{ position:"fixed", top:16, right:20, background:"rgba(255,255,255,0.15)",
              border:"none", color:"#fff", width:40, height:40, borderRadius:"50%",
              cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
      )}

      {/* Apartments table */}
      <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:14,
        padding:"20px 22px", boxShadow:T.shadow }}>
        <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:16 }}>
          Apartments — {apts.length} units (last snapshot: {data.last_period})
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${T.border}`, background:T.bgStripe }}>
                {["Type","Floor","Size","Beds","Baths","Last Price","€/m²","Amenities","Updated","Link"].map(h => (
                  <th key={h} style={{ padding:"8px 12px", textAlign:h==="Type"||h==="Amenities"||h==="Link"?"left":"right",
                    color:T.textMuted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em",
                    fontWeight:600, background:T.bgStripe }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apts.map((a, i) => {
                const uc = UNIT_COLORS[a.unit_type] || "#aaa";
                return (
                  <tr key={i} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgStripe:"#fff" }}>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ background:uc, color:"#fff", fontWeight:700, fontSize:11,
                        padding:"2px 8px", borderRadius:4 }}>{a.unit_type}</span>
                    </td>
                    <td style={{ padding:"9px 12px", textAlign:"right", color:T.textSub }}>{a.floor || "—"}</td>
                    <td style={{ padding:"9px 12px", textAlign:"right" }}>{a.size}m²</td>
                    <td style={{ padding:"9px 12px", textAlign:"right" }}>{a.bedrooms ?? "—"}</td>
                    <td style={{ padding:"9px 12px", textAlign:"right" }}>{a.bathrooms ?? "—"}</td>
                    <td style={{ padding:"9px 12px", textAlign:"right", color:PRICE_COLOR, fontWeight:700 }}>{fmtFull(a.price)}</td>
                    <td style={{ padding:"9px 12px", textAlign:"right", color:M2_COLOR, fontWeight:600 }}>
                      {a.price_per_m2 ? `€${Math.round(a.price_per_m2).toLocaleString("en")}` : "—"}
                    </td>
                    <td style={{ padding:"9px 12px" }}>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        <Pill on={a.has_terrace} label="T"/>
                        <Pill on={a.has_parking} label="P"/>
                        <Pill on={a.has_pool}    label="Pool"/>
                        <Pill on={a.has_lift}    label="Lift"/>
                        <Pill on={a.has_ac}      label="AC"/>
                      </div>
                    </td>
                    <td style={{ padding:"9px 12px", whiteSpace:"nowrap", fontSize:10, color:"#6B7A9F" }}>
                      {a.last_updated
                        ? a.last_updated.replace("Listing updated on ","").replace("listing updated on ","")
                        : "—"}
                    </td>
                    <td style={{ padding:"9px 12px" }}>
                      {a.unit_url && (
                        <a href={a.unit_url} target="_blank" rel="noreferrer"
                          style={{ display:"inline-flex", alignItems:"center", gap:3,
                            color:"#fff", background:T.navyMid, fontSize:10, fontWeight:700,
                            textDecoration:"none", padding:"3px 9px", borderRadius:5 }}>
                          Idealista ↗
                        </a>
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
  );
}

// ── Main Delisted Page ────────────────────────────────────────────────────
const ALL_UTS  = ["Studio","1BR","2BR","3BR","4BR","5BR","Penthouse"];
const ALL_ESG  = ["A","B","C","D","E","F","G"];

export default function DelistedPage({ onGoListing, selectedId, fromSearch, onBackToSearch }) {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [activePin,    setActivePin]    = useState(null);
  const [selected,     setSelected]     = useState(null);
  // filters
  const [search,       setSearch]       = useState("");
  const [selUnit,      setSelUnit]      = useState([]);
  const [selHouseType, setSelHouseType] = useState([]);
  const [selEsg,       setSelEsg]       = useState([]);
  const [selMonth,     setSelMonth]     = useState([]);
  const [minPrice,     setMinPrice]     = useState("");
  const [maxPrice,     setMaxPrice]     = useState("");
  const [minM2,        setMinM2]        = useState("");
  const [maxM2,        setMaxM2]        = useState("");
  const [sortBy,       setSortBy]       = useState("avg_price");

  useEffect(() => {
    fetch(`${API}/delisted/listings`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
        if (selectedId && d.listings) {
          const match = d.listings.find(l => l.listing_id === selectedId);
          if (match) setSelected(match);
        }
      })
      .catch(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const listings = data?.listings || [];
  const summary  = data?.summary  || {};
  const periods  = data?.periods  || {};

  const allMonths = useMemo(() => [...new Set(listings.map(l => l.last_period).filter(Boolean))].sort(), [listings]);

  const filtered = useMemo(() => {
    let r = listings;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(l => l.property_name?.toLowerCase().includes(q) || l.municipality?.toLowerCase().includes(q));
    }
    if (selUnit.length)      r = r.filter(l => selUnit.some(ut => (l.unit_types||"").includes(ut)));
    if (selHouseType.length) r = r.filter(l => selHouseType.some(ht => (l.house_types||"").includes(ht)));
    if (selEsg.length)       r = r.filter(l => selEsg.includes(l.esg_grade));
    if (selMonth.length)     r = r.filter(l => selMonth.includes(l.last_period));
    if (minPrice) r = r.filter(l => l.avg_price >= Number(minPrice));
    if (maxPrice) r = r.filter(l => l.avg_price <= Number(maxPrice));
    if (minM2)    r = r.filter(l => l.avg_price_m2 && l.avg_price_m2 >= Number(minM2));
    if (maxM2)    r = r.filter(l => l.avg_price_m2 && l.avg_price_m2 <= Number(maxM2));
    return [...r].sort((a,b) => (b[sortBy]||0)-(a[sortBy]||0));
  }, [listings, search, selUnit, selHouseType, selEsg, selMonth, minPrice, maxPrice, minM2, maxM2, sortBy]);

  const hasFilters = selUnit.length || selHouseType.length || selEsg.length || selMonth.length || minPrice || maxPrice || minM2 || maxM2;

  const mapMarkers = useMemo(() => filtered.map(l => ({
    id:       l.listing_id,
    lat:      l.lat, lng: l.lng,
    label:    l.property_name,
    sublabel: `${fmt(l.avg_price)} · ${l.units} apts · Last seen ${periods.prev}`,
    active:   l.listing_id === activePin,
    color:    l.listing_id === activePin ? "#6B2A2A" : "#FCA5A5",
  })), [filtered, activePin, periods]);

  // Early returns after all hooks
  if (selected) {
    return <DelistedApartments
      listingId={selected.listing_id}
      listingName={selected.property_name}
      fromSearch={fromSearch}
      onBack={fromSearch && onBackToSearch ? onBackToSearch : () => setSelected(null)}
      backLabel={fromSearch ? "Search" : "All Sold Out"}
    />;
  }

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:400 }}>
      <div style={{ color:T.textSub, fontSize:14 }}>Loading delisted properties…</div>
    </div>
  );

  return (
    <div style={{ padding:"20px 20px", maxWidth:1700, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ margin:"0 0 4px", fontFamily:"'Inter',sans-serif", fontSize:28,
          color:T.text, fontWeight:400 }}>
          Sold Out Properties
        </h2>
        <div style={{ color:T.textSub, fontSize:12 }}>
          Developments present in <strong>{periods.prev}</strong> but not in <strong>{periods.latest}</strong>
        </div>
      </div>

      {/* KPI row */}
      {summary.count > 0 && (
        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          <StatCard label="Sold Out Developments" value={summary.count} accent="#6B2A2A" />
          <StatCard label="Total Apartments"       value={(summary.units||0).toLocaleString()} />
          <StatCard label="Avg Last Price"         value={fmt(summary.avg_price)} />
          <StatCard label="Avg Last €/m²"          value={summary.avg_price_m2 != null ? `€${Math.round(summary.avg_price_m2).toLocaleString("en")}` : "—"} accent={M2_COLOR} />
        </div>
      )}

      {listings.length === 0 ? (
        <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:14,
          padding:"60px 40px", textAlign:"center", boxShadow:T.shadow }}>
          <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
          <div style={{ fontWeight:700, fontSize:16, color:T.text, marginBottom:8 }}>No delisted properties</div>
          <div style={{ color:T.textSub, fontSize:13 }}>
            All developments from {periods.prev} are still active in {periods.latest}.
          </div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:20, alignItems:"start" }}>

          {/* Left: filter + cards */}
          <div>
            {/* Search + sort */}
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search by name or municipality…"
                style={{ width:"100%", padding:"8px 12px", borderRadius:8,
                  border:`1px solid ${T.border}`, fontSize:12, boxSizing:"border-box",
                  outline:"none", background:"#fff" }}/>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, color:T.textMuted, alignSelf:"center" }}>Sort:</span>
                {[["avg_price","Price"],["units","Apts"],["avg_price_m2","€/m²"]].map(([k,lbl])=>(
                  <button key={k} onClick={()=>setSortBy(k)}
                    style={{ background:sortBy===k?PRICE_COLOR:"#fff",
                      border:`1px solid ${sortBy===k?PRICE_COLOR:T.border}`,
                      color:sortBy===k?"#fff":T.textSub,
                      padding:"3px 10px", borderRadius:6, cursor:"pointer",
                      fontSize:11, fontWeight:sortBy===k?700:500 }}>{lbl}</button>
                ))}
              </div>
              <div style={{ color:T.textMuted, fontSize:11 }}>
                {filtered.length} of {listings.length} delisted developments
              </div>
            </div>

            {/* Cards */}
            <div style={{ height:"calc(100vh - 340px)", overflowY:"auto", overflowX:"hidden",
              display:"flex", flexDirection:"column", gap:10,
              paddingRight:4, scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>
              {filtered.map(l => (
                <DelistedCard key={l.listing_id} l={l}
                  onClick={() => setSelected(l)}
                />
              ))}
            </div>
          </div>

          {/* Right: map */}
          <div style={{ position:"sticky", top:80 }}>
            <div style={{ background:T.bgCard, border:`1px solid ${T.border}`,
              borderRadius:14, padding:"16px 18px", boxShadow:T.shadow }}>
              <div style={{ fontWeight:700, fontSize:13, color:T.text, marginBottom:10 }}>
                📍 {filtered.length} delisted developments · click a pin to highlight
              </div>
              <LeafletMap
                markers={mapMarkers}
                height="calc(100vh - 260px)"
                onMarkerClick={id => setActivePin(id === activePin ? null : id)}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
