import React, { useState, useEffect, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { T, StatCard, ChartCard, Tag, Pill, fmt, fmtFull, fmtNum, COLORS, UNIT_COLORS, ESG_COLORS, AddressBreadcrumb, MapPinPopup, PRICE_COLOR, M2_COLOR } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";
import LoadingHouse from "../components/LoadingHouse.jsx";
import GoogleStaticMap from "../components/GoogleStaticMap.jsx";

function makeBins(values, numBins = 8, fmt1000 = true) {
  const vals = values.filter(v => v != null && isFinite(v));
  if (!vals.length) return [];
  const mn = Math.min(...vals), mx = Math.max(...vals);
  if (mn === mx) return [{ bin: fmt1000 ? `€${Math.round(mn/1000)}K` : `€${Math.round(mn).toLocaleString()}`, count: vals.length }];
  const step = (mx - mn) / numBins;
  return Array.from({ length: numBins }, (_, i) => {
    const lo = mn + i * step, hi = mn + (i + 1) * step;
    const count = vals.filter(v => v >= lo && (i === numBins - 1 ? v <= hi : v < hi)).length;
    const label = fmt1000 ? `€${Math.round(lo/1000)}K` : `€${Math.round(lo).toLocaleString()}`;
    return { bin: label, count };
  }).filter(b => b.count > 0);
}

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

// ── Type-search multi-select ──────────────────────────────────────────────
function TypeSearchMultiSelect({ label, options, value, onChange, width=200 }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef(null);
  React.useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const filteredOpts = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const hasVal = value.length > 0;

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:4, letterSpacing:"0.05em" }}>{label}</div>
      <div onClick={() => setOpen(o => !o)}
        style={{ background:"#fff", border:`1px solid ${hasVal ? T.borderAccent : T.border}`,
          borderRadius:10, padding:"8px 12px", cursor:"pointer",
          display:"flex", alignItems:"center", gap:6, minWidth:width,
          boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <span style={{ color:T.textMuted, fontSize:10, textTransform:"uppercase", fontWeight:600, whiteSpace:"nowrap" }}></span>
        {hasVal
          ? <span style={{ background:T.navy, color:"#fff", borderRadius:4, fontSize:10, fontWeight:700, padding:"1px 6px" }}>{value.length}</span>
          : <span style={{ color:T.textSub, fontSize:12, flex:1 }}>All</span>}
        <span style={{ color:T.textMuted, fontSize:10, marginLeft:"auto" }}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:300,
          background:"#fff", border:`1px solid ${T.border}`, borderRadius:10,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)", minWidth:Math.max(width, 240), overflow:"hidden" }}>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${T.border}` }}>
            <input autoFocus value={query} onChange={e=>setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              onClick={e=>e.stopPropagation()}
              style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:6,
                padding:"6px 10px", fontSize:12, outline:"none", color:T.text,
                background:T.bgStripe, boxSizing:"border-box" }}/>
          </div>
          {value.length > 0 && (
            <div style={{ padding:"6px 10px", borderBottom:`1px solid ${T.border}`,
              display:"flex", flexWrap:"wrap", gap:4 }}>
              {value.map(v=>(
                <span key={v} onClick={e=>{e.stopPropagation();onChange(value.filter(x=>x!==v));}}
                  style={{ background:T.navyLight||T.navy, border:`1px solid ${T.borderAccent||T.navy}`,
                    color:"#fff", fontSize:10, fontWeight:700, padding:"2px 6px",
                    borderRadius:4, cursor:"pointer" }}>
                  {v} ×
                </span>
              ))}
              <span onClick={e=>{e.stopPropagation();onChange([]);setQuery("");}}
                style={{ color:"#6B2A2A", fontSize:10, cursor:"pointer", alignSelf:"center" }}>Clear all</span>
            </div>
          )}
          <div style={{ maxHeight:240, overflowY:"auto" }}>
            {filteredOpts.length===0
              ? <div style={{ padding:"12px", color:T.textMuted, fontSize:12, textAlign:"center" }}>No matches</div>
              : filteredOpts.map(opt=>{
                  const sel = value.includes(opt);
                  return (
                    <div key={opt} onClick={e=>{e.stopPropagation();onChange(sel?value.filter(v=>v!==opt):[...value,opt]);}}
                      style={{ padding:"8px 12px", cursor:"pointer", fontSize:12,
                        background:sel?(T.navyLight||T.navy):"transparent", color:sel?"#fff":T.text,
                        borderLeft:`3px solid ${sel?T.navy:"transparent"}`,
                        display:"flex", alignItems:"center", gap:8,
                        transition:"background 0.1s" }}
                      onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background=T.bgStripe; }}
                      onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background="transparent"; }}>
                      <span style={{ width:14, height:14, borderRadius:3, flexShrink:0,
                        border:`2px solid ${sel?T.navy:T.border}`, background:sel?T.navy:"transparent",
                        display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                        {sel&&<span style={{ color:"#fff", fontSize:8, fontWeight:900 }}>✓</span>}
                      </span>
                      {opt}
                    </div>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Delisted listing card ─────────────────────────────────────────────────
function DelistedCard({ l, onClick }) {
  const [hov, setHov] = useState(false);
  const esgColor = ESG_COLORS[l.esg_grade] || "#999";
  const isFull = l.delisted_type !== "partial";
  const borderBase  = isFull ? "#FCA5A5" : "#FCA5A5";
  const borderHov   = isFull ? "#6B2A2A" : "#6B2A2A";
  const badgeBg     = isFull ? "#FEF2F2" : "#FEF2F2";
  const badgeColor  = isFull ? "#6B2A2A" : "#92400E";
  const badgeBorder = isFull ? "#FCA5A5" : "#FCD34D";
  const badgeLabel  = isFull ? "Sold Out" : "Partial Sold Out";
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? T.bgHover : T.bgCard,
        border: `2px solid ${hov ? borderHov : borderBase}`,
        borderRadius:12, padding:"16px 18px", cursor:"pointer",
        transition:"all 0.15s", boxShadow: hov ? T.shadowMd : T.shadow }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color: hov ? borderHov : T.text }}>{l.property_name}</div>
          <div style={{ color:T.textSub, fontSize:11, marginTop:2 }}>{l.developer}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          <span style={{ background:badgeBg, color:badgeColor, border:`1px solid ${badgeBorder}`,
            borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700 }}>{badgeLabel}</span>
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
      {l.sold_date && (
        <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4 }}>
          <span style={{ fontSize:10, color:T.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>Sold</span>
          <span style={{ fontSize:11, fontWeight:700, color:badgeColor, background:badgeBg,
            border:`1px solid ${badgeBorder}`, borderRadius:4, padding:"1px 7px" }}>{l.sold_date}</span>
        </div>
      )}
      <div style={{ marginTop:6, color: hov ? borderHov : T.textMuted, fontSize:11, fontWeight:600 }}>
        View units →
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
            {data.sold_date && <> · <span style={{ fontWeight:700, color:"#6B2A2A", background:"#FEF2F2",
              border:"1px solid #FCA5A5", borderRadius:4, padding:"1px 7px", fontSize:11 }}>Sold: {data.sold_date}</span></>}
            {" · "}
            <span style={{ color:T.green, fontWeight:600 }}>{fmtNum(apts.length)} units</span>
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
        <StatCard label="Total Units" value={fmtNum(apts.length)} />
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
                  {(() => {
                    const MAX = 7;
                    if (floorPlans.length <= MAX) {
                      return (
                        <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
                          {floorPlans.map((_,i) => (
                            <div key={i} onClick={() => setFpIdx(i)}
                              style={{ width:i===fpIdx?18:7, height:7, borderRadius:4,
                                background:i===fpIdx?"#0B1239":"rgba(0,0,0,0.25)", cursor:"pointer", transition:"all 0.2s" }} />
                          ))}
                        </div>
                      );
                    }
                    const half = Math.floor(MAX / 2);
                    let start = Math.max(0, fpIdx - half);
                    let end = start + MAX;
                    if (end > floorPlans.length) { end = floorPlans.length; start = Math.max(0, end - MAX); }
                    const visible = Array.from({ length: end - start }, (_, i) => start + i);
                    return (
                      <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5, alignItems:"center" }}>
                        {start > 0 && <div style={{ width:4, height:4, borderRadius:"50%", background:"rgba(0,0,0,0.2)" }}/>}
                        {visible.map(i => (
                          <div key={i} onClick={() => setFpIdx(i)}
                            style={{ width:i===fpIdx?18:7, height:7, borderRadius:4,
                              background:i===fpIdx?"#0B1239":"rgba(0,0,0,0.25)", cursor:"pointer", transition:"all 0.2s",
                              transform:`scale(${i===fpIdx ? 1 : Math.abs(i-fpIdx)===1 ? 0.85 : 0.7})` }} />
                        ))}
                        {end < floorPlans.length && <div style={{ width:4, height:4, borderRadius:"50%", background:"rgba(0,0,0,0.2)" }}/>}
                      </div>
                    );
                  })()}
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
          Apartments — {fmtNum(apts.length)} units (last snapshot: {data.last_period})
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

export default function DelistedPage({ onGoListing, onGoDrilldown, selectedId, fromSearch, onBackToSearch }) {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [activePin,    setActivePin]    = useState(null);
  const [selected,     setSelected]     = useState(null);
  // province/municipality filters
  const [filtersData,  setFiltersData]  = useState({ provinces:[], province_munis:{} });
  const [selProvince,  setSelProvince]  = useState([]);
  const [selMuni,      setSelMuni]      = useState([]);
  // other filters
  const [search,       setSearch]       = useState("");
  const [selUnit,      setSelUnit]      = useState([]);
  const [selHouseType, setSelHouseType] = useState([]);
  const [selMonth,     setSelMonth]     = useState([]);
  const [delistType,   setDelistType]   = useState("all"); // "all" | "full" | "partial"
  const [minPrice,     setMinPrice]     = useState("");
  const [maxPrice,     setMaxPrice]     = useState("");
  const [minM2,        setMinM2]        = useState("");
  const [maxM2,        setMaxM2]        = useState("");
  const [sortBy,       setSortBy]       = useState("avg_price");

  useEffect(() => {
    fetch(`${API}/filters`)
      .then(r => r.json())
      .then(f => setFiltersData({ provinces: f.provinces||[], province_munis: f.province_munis||{} }))
      .catch(() => {});
  }, []);

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

  // Province → Municipality options
  const muniOptions = useMemo(() => {
    if (selProvince.length === 0) return [...new Set(listings.map(l => l.municipality).filter(Boolean))].sort();
    return selProvince.flatMap(p => filtersData.province_munis[p] || []).sort();
  }, [selProvince, filtersData, listings]);

  const filtered = useMemo(() => {
    let r = listings;
    if (selProvince.length) r = r.filter(l => selProvince.some(p => (filtersData.province_munis[p]||[]).includes(l.municipality)));
    if (selMuni.length)     r = r.filter(l => selMuni.includes(l.municipality));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(l => l.property_name?.toLowerCase().includes(q) || l.municipality?.toLowerCase().includes(q));
    }
    if (selUnit.length)      r = r.filter(l => selUnit.some(ut => (l.unit_types||"").includes(ut)));
    if (selHouseType.length) r = r.filter(l => selHouseType.some(ht => (l.house_types||"").includes(ht)));
    if (selMonth.length)     r = r.filter(l => selMonth.includes(l.last_period));
    if (minPrice) r = r.filter(l => l.avg_price >= Number(minPrice));
    if (maxPrice) r = r.filter(l => l.avg_price <= Number(maxPrice));
    if (minM2)    r = r.filter(l => l.avg_price_m2 && l.avg_price_m2 >= Number(minM2));
    if (maxM2)    r = r.filter(l => l.avg_price_m2 && l.avg_price_m2 <= Number(maxM2));
    if (delistType === "full")    r = r.filter(l => l.delisted_type !== "partial");
    if (delistType === "partial") r = r.filter(l => l.delisted_type === "partial");
    return [...r].sort((a,b) => (b[sortBy]||0)-(a[sortBy]||0));
  }, [listings, selProvince, selMuni, filtersData, search, selUnit, selHouseType, selMonth, minPrice, maxPrice, minM2, maxM2, sortBy, delistType]);

  const hasFilters = selProvince.length || selMuni.length || selUnit.length || selHouseType.length || selMonth.length || minPrice || maxPrice || minM2 || maxM2 || delistType !== "all";

  const unitTypeStats = useMemo(() => {
    const ORDER = ["Studio","1BR","2BR","3BR","4BR","5BR","Penthouse"];
    const map = {};
    filtered.forEach(l => {
      const types = (l.unit_types||"").split(", ").filter(Boolean);
      if (!types.length) return;
      const counts = l.unit_type_counts || {};
      const knownTotal = Object.values(counts).reduce((a, b) => a + b, 0);
      const total = l.units || 1;
      const activeTypes = knownTotal > 0 ? types.filter(ut => counts[ut] > 0) : types;
      activeTypes.forEach(ut => {
        const share = knownTotal > 0
          ? Math.round(total * counts[ut] / knownTotal)
          : Math.round(total / activeTypes.length);
        if (!map[ut]) map[ut] = { unit_type: ut, units: 0, prices: [], sizes: [], pm2s: [] };
        map[ut].units += share;
        if (l.avg_price)    map[ut].prices.push(l.avg_price);
        if (l.avg_size)     map[ut].sizes.push(l.avg_size);
        if (l.avg_price_m2) map[ut].pm2s.push(l.avg_price_m2);
      });
    });
    return Object.values(map).map(r => ({
      unit_type: r.unit_type, count: r.units,
      avg_size:  r.sizes.length  ? Math.round(r.sizes.reduce((a,b)=>a+b,0)/r.sizes.length) : null,
      min_price: r.prices.length ? Math.min(...r.prices) : null,
      avg_price: r.prices.length ? Math.round(r.prices.reduce((a,b)=>a+b,0)/r.prices.length) : null,
      max_price: r.prices.length ? Math.max(...r.prices) : null,
      avg_pm2:   r.pm2s.length   ? Math.round(r.pm2s.reduce((a,b)=>a+b,0)/r.pm2s.length) : null,
    })).sort((a,b) => ORDER.indexOf(a.unit_type) - ORDER.indexOf(b.unit_type));
  }, [filtered]);

  const houseTypeStats = useMemo(() => {
    const map = {};
    filtered.forEach(l => {
      (l.house_types||"").split(", ").filter(Boolean).forEach(ht => {
        if (!map[ht]) map[ht] = { house_type: ht, units: 0, prices: [], sizes: [], pm2s: [] };
        map[ht].units += l.units || 1;
        if (l.avg_price)    map[ht].prices.push(l.avg_price);
        if (l.avg_size)     map[ht].sizes.push(l.avg_size);
        if (l.avg_price_m2) map[ht].pm2s.push(l.avg_price_m2);
      });
    });
    return Object.values(map).map(r => ({
      house_type: r.house_type, count: r.units,
      avg_size:  r.sizes.length  ? Math.round(r.sizes.reduce((a,b)=>a+b,0)/r.sizes.length) : null,
      min_price: r.prices.length ? Math.min(...r.prices) : null,
      avg_price: r.prices.length ? Math.round(r.prices.reduce((a,b)=>a+b,0)/r.prices.length) : null,
      max_price: r.prices.length ? Math.max(...r.prices) : null,
      avg_pm2:   r.pm2s.length   ? Math.round(r.pm2s.reduce((a,b)=>a+b,0)/r.pm2s.length) : null,
    })).sort((a,b) => a.house_type.localeCompare(b.house_type));
  }, [filtered]);

  const priceDist = useMemo(() => makeBins(filtered.map(l => l.avg_price)), [filtered]);
  const m2Dist    = useMemo(() => makeBins(filtered.map(l => l.avg_price_m2), 8, false), [filtered]);

  const deliveryTimeline = useMemo(() => {
    const map = {};
    filtered.forEach(l => {
      const raw = (l.delivery_date || "").toString().replace("Delivery : ","").trim();
      if (!raw || raw === "null" || raw === "undefined") return;
      // Extract year+quarter: "Q3 2026", "2026-Q3", "2026", "Delivery : Q2 2025" etc.
      const qm = raw.match(/Q([1-4])\s*(\d{4})|(\d{4})\s*[-\/]?\s*Q([1-4])/i);
      const ym = raw.match(/(\d{4})/);
      let key;
      if (qm) key = qm[2] ? `${qm[2]} Q${qm[1]}` : `${qm[3]} Q${qm[4]}`;
      else if (ym) key = ym[1];
      else return;
      map[key] = (map[key] || 0) + (l.units || 1);
    });
    return Object.entries(map).map(([q, count]) => ({ quarter: q, count }))
      .sort((a,b) => a.quarter.localeCompare(b.quarter));
  }, [filtered]);

  const topMunis = useMemo(() => {
    const map = {};
    filtered.forEach(l => {
      if (!l.municipality) return;
      if (!map[l.municipality]) map[l.municipality] = { municipality: l.municipality, units: 0, listings: 0 };
      map[l.municipality].units    += (l.units || 1);
      map[l.municipality].listings += 1;
    });
    return Object.values(map).sort((a,b) => b.units - a.units).slice(0, 12);
  }, [filtered]);

  const mapMarkers = useMemo(() => filtered.map(l => {
    const isFull = l.delisted_type !== "partial";
    const baseColor   = isFull ? "#DC2626" : "#FCA5A5";
    const activeColor = isFull ? "#7F1D1D" : "#6B2A2A";
    return {
      id:       l.listing_id,
      lat:      l.lat, lng: l.lng,
      label:    l.property_name,
      sublabel: `${fmt(l.avg_price)} · ${fmtNum(l.units)} apts · Last seen ${periods.prev}`,
      active:   l.listing_id === activePin,
      color:    l.listing_id === activePin ? activeColor : baseColor,
    };
  }), [filtered, activePin, periods]);

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
      <div style={{ marginBottom:20, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontFamily:"'Inter',sans-serif", fontSize:28,
            color:T.text, fontWeight:400 }}>
            Sold Out Properties
          </h2>
          <div style={{ color:T.textSub, fontSize:12 }}>
            Developments present in <strong>{periods.prev}</strong> but not in <strong>{periods.latest}</strong>
          </div>
        </div>
        {listings.length > 0 && (
          <button onClick={() => window.open(`${API}/delisted/export`, "_blank")}
            style={{ display:"flex", alignItems:"center", gap:6, background:"#7F1D1D",
              border:"none", borderRadius:9, padding:"9px 18px",
              fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer",
              boxShadow:"0 2px 8px rgba(127,29,29,0.25)", whiteSpace:"nowrap" }}>
            ↓ Export Excel
          </button>
        )}
      </div>

      {/* KPI row */}
      {summary.count > 0 && (
        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          <StatCard label="Sold Out Developments" value={fmtNum(summary.count)} accent="#6B2A2A" />
          <StatCard label="Total Units"       value={(summary.units||0).toLocaleString()} />
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
        <>
          {/* ── Filter bar ── */}
          <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:12,
            padding:"14px 20px", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>

              <TypeSearchMultiSelect label="Province" options={filtersData.provinces} value={selProvince}
                onChange={v => { setSelProvince(v); setSelMuni([]); }} width={160} />

              <TypeSearchMultiSelect label="Municipality" options={muniOptions} value={selMuni}
                onChange={setSelMuni} width={180} />

              <div style={{ width:1, alignSelf:"stretch", background:T.border, margin:"2px 0" }} />

              <MultiSelect label="House Type" options={["Detached house","Semi-detached house","Terraced house","Apartments"]}
                value={selHouseType} onChange={setSelHouseType} placeholder="All types" maxDisplay={1} />

              <MultiSelect label="Unit Type" options={ALL_UTS}
                value={selUnit} onChange={setSelUnit} placeholder="All types" maxDisplay={2} />

              <MultiSelect label="Last Seen Month" options={allMonths}
                value={selMonth} onChange={setSelMonth} placeholder="All months" maxDisplay={2} />

              {/* Delist type toggle */}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <div style={{ fontSize:9, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Sold Out Type</div>
                <div style={{ display:"flex", gap:4 }}>
                  {[["all","All"],["full","Full"],["partial","Partial"]].map(([val,lbl]) => {
                    const isActive = delistType === val;
                    const activeColor = val === "full" ? "#fff" : val === "partial" ? "#6B2A2A" : "#fff";
                    const activeBg    = val === "full" ? "#DC2626" : val === "partial" ? "#FEF2F2" : T.navy;
                    const activeBorder= val === "full" ? "#DC2626" : val === "partial" ? "#FCA5A5" : T.navy;
                    return (
                      <button key={val} onClick={() => setDelistType(val)}
                        style={{ padding:"6px 10px", borderRadius:7, fontSize:11, fontWeight: isActive?700:500,
                          cursor:"pointer", whiteSpace:"nowrap",
                          background: isActive ? activeBg : "#fff",
                          border: `1px solid ${isActive ? activeBorder : T.border}`,
                          color: isActive ? activeColor : T.textSub,
                          transition:"all 0.15s" }}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price range */}
              <div style={{ display:"flex", flexDirection:"column", gap:4, minWidth:160 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:9, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Price Range</span>
                  <span style={{ fontSize:10, fontWeight:700, color:PRICE_COLOR }}>
                    {minPrice ? `€${Number(minPrice).toLocaleString()}` : "Any"} – {maxPrice ? `€${Number(maxPrice).toLocaleString()}` : "Any"}
                  </span>
                </div>
                <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                  {[["<200k",0,200000],["200-400k",200000,400000],["400-700k",400000,700000],[">700k",700000,""]].map(([lbl,mn,mx]) => {
                    const active = String(minPrice)===String(mn) && String(maxPrice)===String(mx);
                    return (
                      <button key={lbl} onClick={() => { setMinPrice(active?"":mn); setMaxPrice(active?"":mx); }}
                        style={{ padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:700, cursor:"pointer",
                          background:active?PRICE_COLOR:"#fff", border:`1.5px solid ${active?PRICE_COLOR:"transparent"}`,
                          color:active?"#fff":T.textSub }}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <input type="number" placeholder="Min €" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                    style={{ width:80, padding:"4px 7px", borderRadius:7, fontSize:11,
                      border:`1.5px solid ${minPrice?PRICE_COLOR:T.border}`, outline:"none", color:T.text, background:"#F2F4F6" }} />
                  <span style={{ color:T.textMuted, fontSize:11 }}>–</span>
                  <input type="number" placeholder="Max €" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                    style={{ width:80, padding:"4px 7px", borderRadius:7, fontSize:11,
                      border:`1.5px solid ${maxPrice?PRICE_COLOR:T.border}`, outline:"none", color:T.text, background:"#F2F4F6" }} />
                </div>
              </div>

              <div style={{ width:1, alignSelf:"stretch", background:T.border, margin:"2px 0" }} />

              {/* €/m² range */}
              <div style={{ display:"flex", flexDirection:"column", gap:4, minWidth:150 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:9, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>€/m²</span>
                  <span style={{ fontSize:10, fontWeight:700, color:M2_COLOR }}>
                    {minM2 ? `€${Number(minM2).toLocaleString()}` : "Any"} – {maxM2 ? `€${Number(maxM2).toLocaleString()}` : "Any"}
                  </span>
                </div>
                <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                  {[["<2k",0,2000],["2-3k",2000,3000],["3-5k",3000,5000],[">5k",5000,""]].map(([lbl,mn,mx]) => {
                    const active = String(minM2)===String(mn) && String(maxM2)===String(mx);
                    return (
                      <button key={lbl} onClick={() => { setMinM2(active?"":mn); setMaxM2(active?"":mx); }}
                        style={{ padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:700, cursor:"pointer",
                          background:active?M2_COLOR:"#fff", border:`1.5px solid ${active?M2_COLOR:"transparent"}`,
                          color:active?"#fff":T.textSub }}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <input type="number" placeholder="Min" value={minM2} onChange={e => setMinM2(e.target.value)}
                    style={{ width:75, padding:"4px 7px", borderRadius:7, fontSize:11,
                      border:`1.5px solid ${minM2?M2_COLOR:T.border}`, outline:"none", color:T.text, background:"#F2F4F6" }} />
                  <span style={{ color:T.textMuted, fontSize:11 }}>–</span>
                  <input type="number" placeholder="Max" value={maxM2} onChange={e => setMaxM2(e.target.value)}
                    style={{ width:75, padding:"4px 7px", borderRadius:7, fontSize:11,
                      border:`1.5px solid ${maxM2?M2_COLOR:T.border}`, outline:"none", color:T.text, background:"#F2F4F6" }} />
                </div>
              </div>

              {hasFilters ? (
                <button onClick={() => { setSelProvince([]); setSelMuni([]); setSelUnit([]); setSelHouseType([]); setSelMonth([]);
                  setMinPrice(""); setMaxPrice(""); setMinM2(""); setMaxM2(""); setDelistType("all"); }}
                  style={{ alignSelf:"flex-end", background:"#FEF2F2", border:"1px solid rgba(192,57,43,0.4)",
                    color:"#6B2A2A", padding:"7px 12px", borderRadius:8, cursor:"pointer", fontSize:11 }}>
                  ✕ Clear all
                </button>
              ) : null}
            </div>
          </div>

          {/* ── Search + sort bar ── */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, flexWrap:"wrap" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search by name or municipality…"
              style={{ flex:1, minWidth:200, padding:"8px 12px", borderRadius:8,
                border:`1px solid ${T.border}`, fontSize:12, outline:"none", background:"#fff" }}/>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontSize:11, color:T.textMuted }}>Sort:</span>
              {[["avg_price","Price"],["units","Apts"],["avg_price_m2","€/m²"]].map(([k,lbl])=>(
                <button key={k} onClick={()=>setSortBy(k)}
                  style={{ background:sortBy===k?PRICE_COLOR:"#fff", border:`1px solid ${sortBy===k?PRICE_COLOR:T.border}`,
                    color:sortBy===k?"#fff":T.textSub, padding:"4px 12px", borderRadius:6,
                    cursor:"pointer", fontSize:11, fontWeight:sortBy===k?700:500 }}>{lbl}</button>
              ))}
            </div>
            <span style={{ color:T.textMuted, fontSize:11, marginLeft:"auto" }}>
              {fmtNum(filtered.length)} of {fmtNum(listings.length)} developments
            </span>
          </div>

          {/* ── Content: cards + right panel ── */}
          <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:20, alignItems:"start" }}>

            {/* Cards */}
            <div style={{ height:"calc(100vh - 280px)", overflowY:"auto", overflowX:"hidden",
              display:"flex", flexDirection:"column", gap:10,
              paddingRight:4, scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>
              {filtered.map(l => (
                <div key={l.listing_id} id={`scard-d-${l.listing_id}`}>
                  <DelistedCard l={l} onClick={() => {
                    if (l.delisted_type === "partial" && onGoListing) {
                      onGoListing(l.listing_id, l.property_name, l.municipality);
                    } else {
                      setSelected(l);
                    }
                  }} />
                </div>
              ))}
            </div>

            {/* Right panel — 3 rows */}
            <div style={{ display:"flex", flexDirection:"column", gap:14, minWidth:0,
              height:"calc(100vh - 200px)", overflowY:"auto",
              scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>

              {/* Row 1: Leaflet | Google Maps */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <LeafletMap markers={mapMarkers} height="280px"
                  onMarkerClick={id => {
                    const listing = filtered.find(l => l.listing_id === id);
                    if (listing?.delisted_type === "partial" && onGoListing) {
                      onGoListing(listing.listing_id, listing.property_name, listing.municipality);
                      return;
                    }
                    const newId = id === activePin ? null : id;
                    setActivePin(newId);
                    if (newId) {
                      setTimeout(() => {
                        document.getElementById(`scard-d-${newId}`)?.scrollIntoView({ behavior:"smooth", block:"nearest" });
                      }, 50);
                    }
                  }} />
                <div style={{ minWidth:0 }}>
                  {(() => {
                    const pinTarget = mapMarkers.find(m => m.active) || mapMarkers.find(m => m.id === filtered[0]?.listing_id) || mapMarkers[0];
                    if (!pinTarget) return <div style={{ height:280, borderRadius:12, background:T.bgStripe, border:`1px solid ${T.border}` }}/>;
                    return (
                      <div style={{ position:"relative", width:"100%", height:280, borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}` }}>
                        <iframe key={`${pinTarget.lat},${pinTarget.lng}`} title="gmap"
                          src={`https://maps.google.com/maps?q=${pinTarget.lat},${pinTarget.lng}&hl=en&z=15&output=embed`}
                          width="100%" height="100%" style={{ border:0, display:"block" }}
                          allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                        <a href={`https://www.google.com/maps?q=${pinTarget.lat},${pinTarget.lng}`}
                          target="_blank" rel="noreferrer"
                          style={{ position:"absolute", bottom:6, right:6, background:"rgba(255,255,255,0.92)",
                            borderRadius:4, fontSize:10, fontWeight:600, color:"#2D3F8F",
                            padding:"2px 7px", textDecoration:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", zIndex:10 }}>
                          Open in Maps ↗
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Row 2: Unit Type Summary | House Type Summary */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <ChartCard title="Unit Type Summary">
                  <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:240 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead style={{ position:"sticky", top:0, zIndex:1 }}>
                        <tr style={{ borderBottom:`2px solid ${T.border}`, background:T.bgStripe }}>
                          {["Type","Units","Avg m²","Min","Avg","Max","€/m²"].map(h => (
                            <th key={h} style={{ padding:"7px 8px", textAlign:h==="Type"?"left":"right",
                              color:T.textMuted, fontSize:10, textTransform:"uppercase",
                              letterSpacing:"0.07em", fontWeight:600, background:T.bgStripe }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {unitTypeStats.map((row,i) => {
                          const uc = UNIT_COLORS[row.unit_type] || COLORS[i%COLORS.length];
                          return (
                            <tr key={row.unit_type} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgStripe:"#fff" }}>
                              <td style={{ padding:"7px 8px" }}>
                                <span style={{ background:uc, color:"#fff", fontWeight:700, fontSize:11,
                                  padding:"2px 8px", borderRadius:4, display:"block", whiteSpace:"nowrap" }}>{row.unit_type}</span>
                              </td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.text, fontWeight:600 }}>{fmtNum(row.count)}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.textSub, fontSize:11 }}>{row.avg_size ?? "—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.green, fontSize:11 }}>{row.min_price!=null?`€${Math.round(row.min_price).toLocaleString()}`:"—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.navy, fontWeight:700 }}>{row.avg_price!=null?`€${Math.round(row.avg_price).toLocaleString()}`:"—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.red, fontSize:11 }}>{row.max_price!=null?`€${Math.round(row.max_price).toLocaleString()}`:"—"}</td>
                              <td style={{ padding:"7px 8px", textAlign:"right", color:T.navyMid, fontWeight:600 }}>{row.avg_pm2!=null?`€${Math.round(row.avg_pm2).toLocaleString("en")}`:"—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>

                <ChartCard title="House Type Summary">
                  <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:240 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead style={{ position:"sticky", top:0, zIndex:1 }}>
                        <tr style={{ borderBottom:`2px solid ${T.border}`, background:T.bgStripe }}>
                          {["Type","Units","Avg m²","Min","Avg","Max","€/m²"].map(h => (
                            <th key={h} style={{ padding:"7px 8px", textAlign:h==="Type"?"left":"right",
                              color:T.textMuted, fontSize:10, textTransform:"uppercase",
                              letterSpacing:"0.07em", fontWeight:600, background:T.bgStripe }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {houseTypeStats.map((row,i) => (
                          <tr key={row.house_type} style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?T.bgStripe:"#fff" }}>
                            <td style={{ padding:"7px 8px", whiteSpace:"nowrap" }}>
                              <span style={{ background:"rgba(100,100,140,0.10)", color:"#6B7A9F",
                                border:"1px solid rgba(100,100,140,0.25)", fontWeight:700,
                                fontSize:11, padding:"2px 8px", borderRadius:4,
                                display:"block", whiteSpace:"nowrap" }}>{row.house_type}</span>
                            </td>
                            <td style={{ padding:"7px 8px", textAlign:"right", color:T.text, fontWeight:600 }}>{fmtNum(row.count)}</td>
                            <td style={{ padding:"7px 8px", textAlign:"right", color:T.textSub, fontSize:11 }}>{row.avg_size ?? "—"}</td>
                            <td style={{ padding:"7px 8px", textAlign:"right", color:T.green, fontSize:11 }}>{row.min_price!=null?`€${Math.round(row.min_price).toLocaleString()}`:"—"}</td>
                            <td style={{ padding:"7px 8px", textAlign:"right", color:T.navy, fontWeight:700 }}>{row.avg_price!=null?`€${Math.round(row.avg_price).toLocaleString()}`:"—"}</td>
                            <td style={{ padding:"7px 8px", textAlign:"right", color:T.red, fontSize:11 }}>{row.max_price!=null?`€${Math.round(row.max_price).toLocaleString()}`:"—"}</td>
                            <td style={{ padding:"7px 8px", textAlign:"right", color:T.navyMid, fontWeight:600 }}>{row.avg_pm2!=null?`€${Math.round(row.avg_pm2).toLocaleString("en")}`:"—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
              </div>

              {/* Row 3: Price Distribution | €/m² Distribution */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <ChartCard title="Price Distribution">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={priceDist} barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                      <XAxis dataKey="bin" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v=>[`${v} developments`,"Count"]}
                        contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }} />
                      <Bar dataKey="count" radius={[4,4,0,0]} isAnimationActive={false}>
                        {priceDist.map((_,i)=><Cell key={i} fill="#0B1239" fillOpacity={0.35+(i/Math.max(priceDist.length-1,1))*0.65}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="€/m² Distribution">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={m2Dist} barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                      <XAxis dataKey="bin" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v=>[`${v} developments`,"Count"]}
                        contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }} />
                      <Bar dataKey="count" radius={[4,4,0,0]} isAnimationActive={false}>
                        {m2Dist.map((_,i)=><Cell key={i} fill="#4A5A8A" fillOpacity={0.35+(i/Math.max(m2Dist.length-1,1))*0.65}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Row 4: Delivery Timeline | Top Municipalities */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <ChartCard title="Delivery Timeline">
                  {deliveryTimeline.length === 0 ? (
                    <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center", color:T.textMuted, fontSize:12 }}>No delivery data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={deliveryTimeline} barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                        <XAxis dataKey="quarter" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>v.toLocaleString()} />
                        <Tooltip formatter={v=>[`${v.toLocaleString()} units`, "Units"]}
                          contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }} />
                        <Bar dataKey="count" radius={[4,4,0,0]} isAnimationActive={false}>
                          {deliveryTimeline.map((_,i) => <Cell key={i} fill={T.navy} fillOpacity={0.4+(i/Math.max(deliveryTimeline.length-1,1))*0.6} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Top Municipalities — click to explore">
                  {topMunis.length === 0 ? (
                    <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center", color:T.textMuted, fontSize:12 }}>No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={topMunis} layout="vertical" barSize={12}
                        onClick={d => d?.activePayload?.[0] && onGoDrilldown && onGoDrilldown(d.activePayload[0].payload.municipality)}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
                        <XAxis type="number" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>v.toLocaleString()} />
                        <YAxis type="category" dataKey="municipality" tick={{ fill:T.textSub, fontSize:9 }} axisLine={false} tickLine={false} width={100} />
                        <Tooltip formatter={(v,name) => [v.toLocaleString(), name === "units" ? "Units" : name]}
                          contentStyle={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }} />
                        <Bar dataKey="units" name="Units" radius={[0,4,4,0]} cursor="pointer" isAnimationActive={false}>
                          {topMunis.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

            </div>{/* end right panel */}
          </div>
        </>
      )}
    </div>
  );
}
