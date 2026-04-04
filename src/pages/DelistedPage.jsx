import React, { useState, useEffect, useMemo } from "react";
import { T, StatCard, ChartCard, Tag, Pill, fmt, fmtFull, COLORS, UNIT_COLORS, ESG_COLORS, AddressBreadcrumb, MapPinPopup, PRICE_COLOR, M2_COLOR } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LeafletMap from "../components/LeafletMap.jsx";
import LoadingHouse from "../components/LoadingHouse.jsx";

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

// ── Apartment table for a delisted listing ────────────────────────────────
function DelistedApartments({ listingId, listingName, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/delisted/apartments/${listingId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [listingId]);

  if (loading) return <div style={{ padding:40, textAlign:"center" }}><LoadingHouse message="Loading…" /></div>;
  if (!data) return null;

  const apts = data.apartments || [];

  return (
    <div style={{ padding:"20px 20px", maxWidth:1700, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <h2 style={{ margin:0, fontFamily:"'Inter',sans-serif", fontSize:26, color:T.text, fontWeight:400 }}>
              {data.property_name}
            </h2>
            <span style={{ background:"#FEF2F2", color:"#6B2A2A", border:"1px solid #FCA5A5",
              borderRadius:5, padding:"3px 10px", fontSize:11, fontWeight:700 }}>Sold Out</span>
          </div>
          <div style={{ color:T.textSub, fontSize:12, marginBottom:4 }}>
            {data.developer && <><strong style={{ color:T.text }}>{data.developer}</strong> · </>}
            <span style={{ color:PRICE_COLOR, fontWeight:600 }}>{data.municipality}</span>
            {" · "}
            <span style={{ color:"#6B2A2A", fontWeight:600 }}>Last seen: {data.last_period}</span>
          </div>
        </div>
        <button onClick={onBack}
          style={{ background:"#fff", border:`1px solid ${T.border}`, color:T.textSub,
            padding:"8px 16px", borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:600,
            boxShadow:T.shadow }}>
          ← All Sold Out
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <StatCard label="Total Apartments" value={apts.length} />
        <StatCard label="Avg Price (last)" value={fmt(apts.length ? apts.reduce((s,a)=>s+a.price,0)/apts.length : 0)} />
        <StatCard label="Avg €/m² (last)"  value={`€${Math.round(apts.length ? apts.reduce((s,a)=>s+(a.price_per_m2||0),0)/apts.length : 0).toLocaleString("en")}`} accent={M2_COLOR} />
        <StatCard label="Avg Size"          value={`${Math.round(apts.length ? apts.reduce((s,a)=>s+(a.size||0),0)/apts.length : 0)}m²`} accent={T.textSub} />
      </div>

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
                  <tr key={i} style={{ borderBottom:`1px solid ${T.border}`,
                    background: i%2===0 ? T.bgStripe : "#fff" }}>
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
export default function DelistedPage({ onGoListing }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [selProv,   setSelProv]   = useState([]);
  const [selMuni,   setSelMuni]   = useState([]);
  const [search,    setSearch]    = useState("");
  const [sortBy,    setSortBy]    = useState("avg_price");
  const [activePin, setActivePin] = useState(null);
  const [selected,  setSelected]  = useState(null); // listing_id for apartment view

  useEffect(() => {
    const params = new URLSearchParams();
    selProv.forEach(p => params.append("province", p));
    selMuni.forEach(m => params.append("municipality", m));
    fetch(`${API}/delisted/listings?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selProv, selMuni]);

  // All hooks before early returns
  const listings = data?.listings || [];
  const summary  = data?.summary  || {};
  const periods  = data?.periods  || {};

  const filtered = useMemo(() => {
    let r = listings;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(l => l.property_name?.toLowerCase().includes(q) || l.municipality?.toLowerCase().includes(q));
    }
    return [...r].sort((a,b) => (b[sortBy]||0)-(a[sortBy]||0));
  }, [listings, search, sortBy]);

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
      onBack={() => setSelected(null)}
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
