import React, { useState, useEffect, useMemo } from "react";
import { T, fmt, fmtFull, UNIT_COLORS, Pill } from "../components/shared.jsx";
import { API } from "../App.jsx";
import LoadingHouse from "../components/LoadingHouse.jsx";


function DeltaBadge({ change, pct }) {
  if (change === 0 || change == null) return <span style={{ color:"#8A96B4", fontSize:10 }}>—</span>;
  const up = change > 0;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3,
      background: up?"rgba(192,57,43,0.12)":"rgba(61,170,110,0.12)",
      color: up?"#E74C3C":"#3DAA6E",
      border:`1px solid ${up?"rgba(192,57,43,0.3)":"rgba(61,170,110,0.3)"}`,
      borderRadius:5, padding:"2px 7px", fontSize:10, fontWeight:600, whiteSpace:"nowrap" }}>
      {up?"▲":"▼"} {fmtFull(Math.abs(change))} ({Math.abs(pct)}%)
    </span>
  );
}

function PriceCell({ value, prevValue, isLatest }) {
  if (value == null) return <td style={{ padding:"10px 14px", textAlign:"right", color:"#8A96B4", borderLeft:"1px solid rgba(255,255,255,0.04)" }}>—</td>;
  const changed = prevValue != null && value !== prevValue;
  const up = prevValue != null && value > prevValue;
  return (
    <td style={{ padding:"10px 14px", textAlign:"right", borderLeft:`1px solid ${T.border}`, background: isLatest?"rgba(235,101,44,0.06)":"transparent" }}>
      <div style={{ color: isLatest?"#0B1239":"#5a4e35", fontWeight: isLatest?700:600, fontSize:13 }}>
        {fmtFull(value)}
      </div>
      {changed && (
        <div style={{ fontSize:10, color: up?"#E74C3C":"#3DAA6E", marginTop:1 }}>
          {up?"▲":"▼"} {fmtFull(Math.abs(value - prevValue))}
        </div>
      )}
    </td>
  );
}

function Pm2Cell({ value, prevValue, isLatest }) {
  if (value == null) return <td style={{ padding:"10px 14px", textAlign:"right", color:"#8A96B4" }}>—</td>;
  const changed = prevValue != null && value !== prevValue;
  const up = prevValue != null && value > prevValue;
  return (
    <td style={{ padding:"10px 14px", textAlign:"right", background: isLatest?"rgba(235,101,44,0.06)":"transparent" }}>
      <div style={{ color: isLatest?"#4a80b0":"#4a6070", fontWeight: isLatest?600:500, fontSize:12 }}>
        €{Math.round(value).toLocaleString("en")}
      </div>
      {changed && <div style={{ fontSize:10, color: up?"#E74C3C":"#3DAA6E", marginTop:1 }}>{up?"▲":"▼"} €{Math.abs(value - prevValue).toFixed(1)}</div>}
    </td>
  );
}

export default function PriceMatrixTab({ listingId, statedTotalUnits, onRowClick }) {
  const [matrix, setMatrix]   = useState(null);
  const [loading, setLoading] = useState(true);

  const [unitTypeFilter,    setUnitTypeFilter]    = useState([]);
  const [showMetric,        setShowMetric]        = useState("both");
  const [sortCol,           setSortCol]           = useState("latest_price");
  const [sortDir,           setSortDir]           = useState("asc");
  const [search,            setSearch]            = useState("");
  const [changedOnly,       setChangedOnly]       = useState(false);
  const [minPrice,          setMinPrice]          = useState("");
  const [maxPrice,          setMaxPrice]          = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/drilldown/listing/${listingId}/price-matrix`)
      .then(r => r.json())
      .then(d => {
        setMatrix(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [listingId]);

  const periods   = useMemo(() => matrix?.periods || [], [matrix]);
  const allRows   = useMemo(() => matrix?.rows    || [], [matrix]);
  const unitTypes = useMemo(() => [...new Set(allRows.map(r => r.unit_type))], [allRows]);

  // Detect if any price changes exist in the data at all
  const anyChanges = useMemo(() => allRows.some(r => r.price_change !== 0), [allRows]);

  const rows = useMemo(() => {
    let r = allRows;

    if (unitTypeFilter.length) r = r.filter(x => unitTypeFilter.includes(x.unit_type));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(x => x.unit_type.toLowerCase().includes(q) || (x.floor||"").toLowerCase().includes(q));
    }

    // Price range filter on latest price
    if (minPrice !== "") r = r.filter(x => (x.latest_price||0) >= Number(minPrice) * 1000);
    if (maxPrice !== "") r = r.filter(x => (x.latest_price||0) <= Number(maxPrice) * 1000);

    // "Changed only" — only works as a real filter when actual changes exist
    if (changedOnly && anyChanges) r = r.filter(x => x.price_change !== 0);

    return [...r].sort((a, b) => {
      const av = a[sortCol] ?? -Infinity, bv = b[sortCol] ?? -Infinity;
      if (av === bv) return 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [allRows, unitTypeFilter, search, minPrice, maxPrice, changedOnly, anyChanges, sortCol, sortDir]);

  const stats = useMemo(() => {
    if (!rows.length || !periods.length) return null;
    const latest  = periods[periods.length - 1];
    const latestPrices = rows.map(r => r[`price_${latest}`]).filter(Boolean);
    const avgPrice = latestPrices.length ? Math.round(latestPrices.reduce((a,b) => a+b,0) / latestPrices.length) : 0;
    const changed   = allRows.filter(r => r.price_change !== 0).length;
    const increased = allRows.filter(r => r.price_change > 0).length;
    const decreased = allRows.filter(r => r.price_change < 0).length;
    return { changed, increased, decreased, avgPrice, total: rows.length, totalAll: allRows.length };
  }, [rows, allRows, periods]);

  const SortTh = ({ col, children, right=true, style={} }) => (
    <th onClick={() => col && (col===sortCol ? setSortDir(d=>d==="asc"?"desc":"asc") : (setSortCol(col),setSortDir("asc")))}
      style={{ padding:"10px 14px", textAlign:right?"right":"left",
        color: sortCol===col?T.navy:T.textMuted,
        fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em",
        cursor:col?"pointer":"default", whiteSpace:"nowrap", userSelect:"none",
        background:T.bgStripe, borderBottom:`1px solid ${T.border}`,
        ...style }}>
      {children}{sortCol===col?(sortDir==="asc"?" ↑":" ↓"):""}
    </th>
  );

  if (loading) return <div style={{ padding:60, textAlign:"center" }}><LoadingHouse message="Loading price matrix…" /></div>;
  if (!matrix || !periods.length) return <div style={{ padding:60, textAlign:"center", color:"#6B7A9F" }}>No data.</div>;

  const latestPeriod    = periods[periods.length - 1];
  const displayPeriods  = [...periods].reverse(); // latest first
  const hasFilters = unitTypeFilter.length || search || minPrice || maxPrice || (changedOnly && anyChanges);

  return (
    <div>
      <style>{`
      `}</style>

      {/* ── Summary strip ─────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { label:"Showing",       value:`${stats.total} of ${stats.totalAll} apts`, color:"#0b1239" },
          { label:"Avg Price",     value:fmtFull(stats.avgPrice),                    color:"#0B1239" },
          { label:"Price Changed", value:stats.changed,                              color: stats.changed>0?"#eb652c":"#3a4555" },
          { label:"Increased ▲",  value:stats.increased,                            color:"#E74C3C" },
          { label:"Decreased ▼",  value:stats.decreased,                            color:"#1A4A2A" },
          ...(statedTotalUnits ? [{ label:"Per Description", value:`${statedTotalUnits} units`, color:"#6B7A9F" }] : []),
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", border:"1px solid #E4E0D8", borderRadius:12, padding:"12px 18px", minWidth:110 }}>
            <div style={{ color:"#8A96B4", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{s.label}</div>
            <div style={{ color:s.color, fontWeight:700, fontSize:16 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Controls ──────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>

        {/* Search */}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Type or floor…"
          style={{ background:"#EEF1F5", border:"1px solid #0B1239", color:"#0b1239", padding:"8px 12px", borderRadius:8, fontSize:12, width:150, outline:"none" }} />

        {/* Price range */}
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          <span style={{ color:"#8A96B4", fontSize:11 }}>€</span>
          <input value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="Min K"
            style={{ background:"#EEF1F5", border:"1px solid #E4E0D8", color:"#0b1239", padding:"8px 10px", borderRadius:8, fontSize:12, width:80, outline:"none", textAlign:"right" }} />
          <span style={{ color:"#8A96B4", fontSize:11 }}>–</span>
          <input value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Max K"
            style={{ background:"#EEF1F5", border:"1px solid #E4E0D8", color:"#0b1239", padding:"8px 10px", borderRadius:8, fontSize:12, width:80, outline:"none", textAlign:"right" }} />
          <span style={{ color:"#8A96B4", fontSize:10 }}>× 1,000</span>
        </div>

        {/* Unit type */}
        <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ color:"#8A96B4", fontSize:10, textTransform:"uppercase" }}>Type</span>
          {unitTypes.map(ut => (
            <button key={ut} onClick={() => setUnitTypeFilter(prev => prev.includes(ut)?prev.filter(x=>x!==ut):[...prev,ut])}
              style={{ background:unitTypeFilter.includes(ut)?UNIT_COLORS[ut]||"#aaa":"#fff",
                border:`1px solid ${unitTypeFilter.includes(ut)?UNIT_COLORS[ut]||"#aaa":T.border}`,
                color:unitTypeFilter.includes(ut)?"#fff":T.textSub,
                padding:"5px 10px", borderRadius:5, cursor:"pointer", fontSize:11 }}>{ut}</button>
          ))}
        </div>

        {/* Metric toggle */}
        <div style={{ display:"flex", gap:3, background:"#f5f2ed", border:"1px solid #E4E0D8", borderRadius:8, padding:3 }}>
          {[["price","Price"],["ppm2","€/m²"],["both","Both"]].map(([k,lbl]) => (
            <button key={k} onClick={() => setShowMetric(k)}
              style={{ background:showMetric===k?"rgba(235,101,44,0.12)":"transparent",
                border:`1px solid ${showMetric===k?"rgba(235,101,44,0.4)":"transparent"}`,
                color:showMetric===k?"#eb652c":"#8fa0b0",
                padding:"5px 11px", borderRadius:6, cursor:"pointer", fontSize:11 }}>{lbl}</button>
          ))}
        </div>

        {/* Changed only — shows tooltip explaining why it's disabled when no changes exist */}
        <div style={{ position:"relative" }} title={!anyChanges?"No price changes detected yet — will activate when prices move between snapshots":""}>
          <button onClick={() => anyChanges && setChangedOnly(v => !v)}
            style={{ background:changedOnly&&anyChanges?"rgba(235,101,44,0.10)":"#F8F9FA",
              border:`1px solid ${changedOnly&&anyChanges?"rgba(235,101,44,0.4)":"rgba(255,255,255,0.1)"}`,
              color:changedOnly&&anyChanges?T.navy:anyChanges?T.textSub:T.textMuted,
              padding:"6px 12px", borderRadius:7,
              cursor:anyChanges?"pointer":"not-allowed",
              fontSize:11, opacity:anyChanges?1:0.5 }}>
            {changedOnly&&anyChanges?"✓ ":""}Changed only {!anyChanges&&"(no changes yet)"}
          </button>
        </div>

        {/* Clear */}
        {hasFilters && (
          <button onClick={() => { setUnitTypeFilter([]); setSearch(""); setMinPrice(""); setMaxPrice(""); setChangedOnly(false); }}
            style={{ background:"#FEF2F2", border:"1px solid #DC2626", color:"#6B2A2A", padding:"6px 12px", borderRadius:7, cursor:"pointer", fontSize:11 }}>
            ✕ Clear
          </button>
        )}

        <div style={{ marginLeft:"auto", color:"#6B7A9F", fontSize:12 }}>
          {rows.length} of {allRows.length} apartments
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div style={{ overflowX:"auto", borderRadius:14, border:"1px solid #E4E0D8" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:500 }}>
          <thead>
            <tr>
              <SortTh col="unit_type"  right={false}>Type</SortTh>
              <SortTh col="house_type" right={false}>House Type</SortTh>
              <SortTh col={null}       right={false}>Floor</SortTh>
              <SortTh col="size"      right={true}>Size</SortTh>
              <SortTh col="bedrooms"  right={true}>Beds</SortTh>
              <SortTh col="bathrooms" right={true}>Baths</SortTh>
              <SortTh col={null}      right={false} style={{ minWidth:160 }}>Amenities</SortTh>
              <SortTh col={null}      right={false} style={{ whiteSpace:"nowrap", color:"#8A96B4" }}>Updated</SortTh>

              {displayPeriods.map((p, pi) => {
                const isLatest = p === latestPeriod;
                const colSpan = showMetric==="both" ? 2 : 1;
                return (
                  <th key={p} colSpan={colSpan}
                    style={{ padding:"10px 14px", textAlign:"center",
                      color: isLatest?"#eb652c":"#8fa0b0",
                      fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em",
                      background: isLatest?"rgba(235,101,44,0.09)":"#F8F9FA",
                      borderBottom:"1px solid rgba(255,255,255,0.1)",
                      borderLeft:"1px solid rgba(255,255,255,0.07)",
                      whiteSpace:"nowrap" }}>
                    {p}
                  </th>
                );
              })}

              <SortTh col="price_change" right={true}>Δ Price</SortTh>
              <th style={{ padding:"10px 14px", width:36, background:T.bgStripe, borderBottom:`1px solid ${T.border}` }}></th>
            </tr>

            {showMetric === "both" && (
              <tr style={{ background:T.bgStripe }}>
                <th colSpan={8} style={{ padding:"3px 14px", borderBottom:`1px solid ${T.border}` }} />
                {displayPeriods.map((p, pi) => (
                  <React.Fragment key={p}>
                    <th style={{ padding:"4px 14px", textAlign:"right", color:T.textMuted, fontSize:9, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${T.border}`, borderLeft:`1px solid ${T.border}` }}>Price</th>
                    <th style={{ padding:"4px 14px", textAlign:"right", color:T.textMuted, fontSize:9, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`1px solid ${T.border}` }}>€/m²</th>
                  </React.Fragment>
                ))}
                <th colSpan={2} style={{ padding:"3px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }} />
              </tr>
            )}
          </thead>

          <tbody>
            {rows.map((row, ri) => {
              const hasChange = row.price_change !== 0;
              const rowBg = hasChange
                ? (row.price_change > 0 ? "rgba(192,57,43,0.06)" : "rgba(61,170,110,0.06)")
                : ri%2===0 ? T.bgStripe : "#fff";

              return (
                <tr key={row.sub_listing_id}
                  onClick={() => onRowClick?.({
                    ...row,
                    price:         row[`price_${latestPeriod}`] ?? null,
                    price_per_m2:  row[`ppm2_${latestPeriod}`]  ?? null,
                  })}
                  style={{ borderBottom:`1px solid ${T.border}`, background:rowBg,
                    cursor: onRowClick ? "pointer" : "default",
                    transition:"background 0.1s" }}
                  onMouseEnter={e => { if(onRowClick) e.currentTarget.style.background="rgba(235,101,44,0.09)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background=rowBg; }}>

                  <td style={{ padding:"10px 14px", whiteSpace:"nowrap" }}>
                    <span style={{ background:UNIT_COLORS[row.unit_type]||"#aaa", color:"#fff",
                      fontWeight:700, fontSize:11, padding:"2px 8px", borderRadius:4 }}>{row.unit_type}</span>
                  </td>
                  <td style={{ padding:"10px 14px", whiteSpace:"nowrap" }}>
                    {row.house_type && row.house_type !== "Not Mentioned"
                      ? <span style={{ background:"rgba(100,100,140,0.10)", color:"#6B7A9F",
                          border:"1px solid rgba(100,100,140,0.25)",
                          fontWeight:700, fontSize:11, padding:"2px 8px", borderRadius:4 }}>{row.house_type}</span>
                      : <span style={{ color:"#8A96B4" }}>—</span>}
                  </td>
                  <td style={{ padding:"10px 14px", color:T.textSub, whiteSpace:"nowrap", fontSize:11 }}>{row.floor||"—"}</td>
                  <td style={{ padding:"10px 14px", textAlign:"right", color:T.textSub, whiteSpace:"nowrap" }}>{row.size ? `${row.size} m²` : "—"}</td>
                  <td style={{ padding:"10px 14px", textAlign:"right", color:T.textSub }}>{row.bedrooms ?? "—"}</td>
                  <td style={{ padding:"10px 14px", textAlign:"right", color:T.textSub }}>{row.bathrooms ?? "—"}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <div style={{ display:"flex", gap:3 }}>
                      <Pill on={row.has_terrace} label="T"/>
                      <Pill on={row.has_parking} label="P"/>
                      <Pill on={row.has_pool}    label="Pool"/>
                      <Pill on={row.has_ac}      label="AC"/>
                      <Pill on={row.has_lift}    label="Lift"/>
                      <Pill on={row.has_storage} label="Str"/>
                    </div>
                  </td>
                  <td style={{ padding:"10px 14px", whiteSpace:"nowrap", fontSize:10, color:"#6B7A9F" }}>
                    {row.last_updated
                      ? row.last_updated.replace("Listing updated on ","").replace("listing updated on ","")
                      : "—"}
                  </td>

                  {displayPeriods.map((period, pi) => {
                    const price    = row[`price_${period}`];
                    const ppm2     = row[`ppm2_${period}`];
                    // In reversed display, the older (previous) period is one index to the right
                    const prev     = pi < displayPeriods.length - 1 ? displayPeriods[pi+1] : null;
                    const prevP    = prev ? row[`price_${prev}`] : null;
                    const prevM    = prev ? row[`ppm2_${prev}`]  : null;
                    const isLatest = period === latestPeriod;
                    if (showMetric === "price") return <PriceCell key={period} value={price} prevValue={prevP} isLatest={isLatest} />;
                    if (showMetric === "ppm2")  return <Pm2Cell   key={period} value={ppm2}  prevValue={prevM} isLatest={isLatest} />;
                    return (
                      <React.Fragment key={period}>
                        <PriceCell value={price} prevValue={prevP} isLatest={isLatest} />
                        <Pm2Cell   value={ppm2}  prevValue={prevM} isLatest={isLatest} />
                      </React.Fragment>
                    );
                  })}

                  <td style={{ padding:"10px 14px", textAlign:"right", whiteSpace:"nowrap" }}>
                    <DeltaBadge change={row.price_change} pct={row.price_change_pct} />
                  </td>
                  <td style={{ padding:"10px 14px", textAlign:"center" }} onClick={e=>e.stopPropagation()}>
                    {row.unit_url && (
                      <a href={row.unit_url} target="_blank" rel="noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:3,
                          color:"#fff", background:T.blue, fontSize:10, fontWeight:700,
                          textDecoration:"none", padding:"3px 9px", borderRadius:5,
                          whiteSpace:"nowrap" }}>
                        Idealista ↗
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {rows.length > 1 && (
            <tfoot>
              <tr style={{ borderTop:`2px solid ${T.border}`, background:T.bgStripe }}>
                <td colSpan={8} style={{ padding:"9px 14px", color:T.textMuted, fontSize:11, fontWeight:600 }}>
                  AVG — {rows.length} apartments
                </td>
                {displayPeriods.map((period) => {
                  const prices = rows.map(r => r[`price_${period}`]).filter(Boolean);
                  const ppm2s  = rows.map(r => r[`ppm2_${period}`]).filter(Boolean);
                  const avgP   = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0)/prices.length) : null;
                  const avgM   = ppm2s.length  ? Math.round(ppm2s.reduce((a,b)=>a+b,0)/ppm2s.length)  : null;
                  const isL    = period === latestPeriod;
                  if (showMetric==="price") return <td key={period} style={{ padding:"9px 14px", textAlign:"right", color:isL?T.navy:T.textSub, fontWeight:600, borderLeft:`1px solid ${T.border}` }}>{fmtFull(avgP)}</td>;
                  if (showMetric==="ppm2")  return <td key={period} style={{ padding:"9px 14px", textAlign:"right", color:isL?T.blue:T.textSub, fontWeight:600, borderLeft:`1px solid ${T.border}` }}>{avgM != null ? `€${avgM.toLocaleString("en")}` : "—"}</td>;
                  return (
                    <React.Fragment key={period}>
                      <td style={{ padding:"9px 14px", textAlign:"right", color:isL?T.navy:T.textSub, fontWeight:600, borderLeft:`1px solid ${T.border}` }}>{fmtFull(avgP)}</td>
                      <td style={{ padding:"9px 14px", textAlign:"right", color:isL?T.blue:T.textSub, fontWeight:600 }}>{avgM != null ? `€${avgM.toLocaleString("en")}` : "—"}</td>
                    </React.Fragment>
                  );
                })}
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div style={{ marginTop:10, color:"#8A96B4", fontSize:11 }}>
        ▲/▼ in cell = change vs prior period &nbsp;·&nbsp;
        Rows tinted <span style={{ color:"#E74C3C" }}>red</span> / <span style={{ color:"#1A4A2A" }}>green</span> if price moved &nbsp;·&nbsp;
        Price range filter uses thousands (e.g. 200 = €200,000)
      </div>
    </div>
  );
}
