import { useState, useEffect } from "react";
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,
         Cell,PieChart,Pie,LineChart,Line,Legend } from "recharts";
import { StatCard,ChartCard,Tag,Pill,fmt,fmtFull,COLORS,UNIT_COLORS,ESG_COLORS } from "../components/shared.jsx";
import { API } from "../App.jsx";

function NoDataNote({ msg }) {
  return (
    <div style={{ height:180, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
      <div style={{ fontSize:26 }}>📅</div>
      <div style={{ color:"#8fa0b0", fontSize:12 }}>{msg}</div>
    </div>
  );
}

export default function DrilldownPage({ municipality, onSelectMunicipality, onSelectListing }) {
  const [muniList, setMuniList] = useState([]);
  const [search, setSearch]     = useState("");
  const [muniData, setMuniData] = useState(null);
  const [sortBy, setSortBy]     = useState("units");
  const [unitFilter, setUnitFilter] = useState([]);
  const [loadingMuni, setLoadingMuni] = useState(false);
  const [tab, setTab]           = useState("snapshot");

  useEffect(() => {
    fetch(`${API}/charts/municipality-overview`)
      .then(r=>r.json()).then(setMuniList).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!municipality) { setMuniData(null); return; }
    setLoadingMuni(true);
    setTab("snapshot");
    fetch(`${API}/drilldown/municipality/${encodeURIComponent(municipality)}`)
      .then(r=>r.json())
      .then(d => { setMuniData(d); setLoadingMuni(false); })
      .catch(() => setLoadingMuni(false));
  }, [municipality]);

  const allUnitTypes = ["Studio","1BR","2BR","3BR","4BR","5BR","Penthouse"];

  // ── Municipality Selector ──────────────────────────────────────────────
  if (!municipality) {
    const filtered = muniList.filter(m => m.municipality.toLowerCase().includes(search.toLowerCase()));
    return (
      <div style={{ padding:"28px 36px", maxWidth:1400, margin:"0 auto" }}>
        <div style={{ marginBottom:20 }}>
          <h2 style={{ margin:0, fontFamily:"'DM Serif Display',serif", fontSize:26, color:"#f0e8d5" }}>
            Select a <em style={{ color:"#E8A838" }}>Municipality</em>
          </h2>
          <p style={{ color:"#8fa0b0", fontSize:13, marginTop:6 }}>Choose a municipality to explore its developments, pricing, and apartments</p>
        </div>

        <div style={{ display:"flex", gap:12, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search municipalities..."
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(232,168,56,0.25)", color:"#f0e8d5", padding:"9px 14px", borderRadius:8, fontSize:13, width:280, outline:"none" }} />
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <span style={{ color:"#3a4555", fontSize:11 }}>SORT BY</span>
            {[["units","Units"],["listings","Developments"],["avg_price","Avg Price"],["avg_price_m2","Avg €/m²"]].map(([s,lbl])=>(
              <button key={s} onClick={()=>setSortBy(s)} style={{
                background: sortBy===s?"rgba(232,168,56,0.18)":"rgba(255,255,255,0.04)",
                border: `1px solid ${sortBy===s?"rgba(232,168,56,0.5)":"rgba(255,255,255,0.1)"}`,
                color: sortBy===s?"#E8A838":"#8fa0b0",
                padding:"6px 12px", borderRadius:6, cursor:"pointer", fontSize:11,
              }}>{lbl}</button>
            ))}
          </div>
          <div style={{ marginLeft:"auto", color:"#8fa0b0", fontSize:12 }}>{filtered.length} municipalities</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
          {[...filtered].sort((a,b)=>(b[sortBy]||0)-(a[sortBy]||0)).map(m=>(
            <MuniCard key={m.municipality} m={m} onClick={()=>onSelectMunicipality(m.municipality)} />
          ))}
        </div>
      </div>
    );
  }

  // ── Municipality Detail ────────────────────────────────────────────────
  if (loadingMuni) return <div style={{ padding:60, textAlign:"center", color:"#8fa0b0" }}>Loading {municipality}…</div>;
  if (!muniData || !muniData.stats) return <div style={{ padding:60, textAlign:"center", color:"#8fa0b0" }}>No data.</div>;

  const { stats, listings, unit_type_mix, price_dist, trend } = muniData;
  const filteredListings = unitFilter.length === 0
    ? listings
    : listings.filter(l => unitFilter.some(ut => l.unit_types?.includes(ut)));
  const sortedListings = [...filteredListings].sort((a,b)=>b.avg_price-a.avg_price);

  const DETAIL_TABS = [["snapshot","Snapshot"],["trend","Trend"]];

  return (
    <div style={{ padding:"24px 36px", maxWidth:1500, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'DM Serif Display',serif", fontSize:26, color:"#f0e8d5" }}>
            <em style={{ color:"#E8A838" }}>{municipality}</em>
          </h2>
          <div style={{ color:"#8fa0b0", fontSize:12, marginTop:4 }}>
            {stats.total_listings} developments &middot; {stats.total_units} apartments
          </div>
        </div>
        <button onClick={()=>onSelectMunicipality(null)} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"#8fa0b0", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:12 }}>
          ← All Municipalities
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap" }}>
        <StatCard label="Developments"    value={stats.total_listings} />
        <StatCard label="Total Apartments" value={stats.total_units?.toLocaleString()} />
        <StatCard label="Avg Price"        value={fmt(stats.avg_price)} />
        <StatCard label="Avg €/m²"         value={`€${stats.avg_price_m2}`} />
        <StatCard label="Price Range"      value={`${fmt(stats.price_range?.[0])} – ${fmt(stats.price_range?.[1])}`} />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid rgba(255,255,255,0.08)", marginBottom:18 }}>
        {DETAIL_TABS.map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            background:"none", border:"none", cursor:"pointer", padding:"9px 20px",
            borderBottom: tab===id?"2px solid #E8A838":"2px solid transparent",
            color: tab===id?"#E8A838":"#8fa0b0", fontSize:13, fontWeight:tab===id?600:400
          }}>{lbl}</button>
        ))}
      </div>

      {/* ══ SNAPSHOT ══ */}
      {tab === "snapshot" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            <ChartCard title="Unit Type Mix">
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={unit_type_mix} dataKey="count" nameKey="unit_type" cx="50%" cy="50%" outerRadius={72} innerRadius={36}>
                      {unit_type_mix.map((e,i)=><Cell key={i} fill={UNIT_COLORS[e.unit_type]||COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1 }}>
                  {unit_type_mix.map((d,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:UNIT_COLORS[d.unit_type]||COLORS[i%COLORS.length] }}/>
                        {d.unit_type}
                      </div>
                      <span style={{ color:"#E8A838", fontWeight:600 }}>{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Price Distribution">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={price_dist} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="bin" tick={{ fill:"#8fa0b0", fontSize:9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#8fa0b0", fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="count" name="Units" radius={[4,4,0,0]}>
                    {price_dist.map((_,i)=><Cell key={i} fill={`hsl(${200+i*15},60%,${42+i*3}%)`}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Listings */}
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:10 }}>
              <div style={{ fontSize:15, fontWeight:600, color:"#f0e8d5" }}>Developments ({sortedListings.length})</div>
              <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ color:"#3a4555", fontSize:11 }}>FILTER BY TYPE</span>
                {allUnitTypes.map(ut=>(
                  <button key={ut} onClick={()=>setUnitFilter(prev=>prev.includes(ut)?prev.filter(x=>x!==ut):[...prev,ut])}
                    style={{ background: unitFilter.includes(ut)?`${UNIT_COLORS[ut]||"#aaa"}22`:"rgba(255,255,255,0.04)",
                      border:`1px solid ${unitFilter.includes(ut)?UNIT_COLORS[ut]||"#aaa":"rgba(255,255,255,0.1)"}`,
                      color: unitFilter.includes(ut)?UNIT_COLORS[ut]||"#aaa":"#8fa0b0",
                      padding:"4px 10px", borderRadius:5, cursor:"pointer", fontSize:11 }}>{ut}</button>
                ))}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))", gap:14 }}>
              {sortedListings.map(l=>(
                <ListingCard key={l.listing_id} l={l}
                  onSelect={()=>onSelectListing(l.listing_id, l.property_name, municipality)} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══ TREND ══ */}
      {tab === "trend" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

          <ChartCard title={`${municipality} — Avg Price Over Time`}>
            {(trend||[]).length < 2
              ? <NoDataNote msg="More monthly snapshots needed" />
              : <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trend||[]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="p" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="m" orientation="right" tickFormatter={v=>`€${v}`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v,n)=>n==="Avg Price"?[fmtFull(v),n]:[`€${v}`,n]} contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                    <Line yAxisId="p" type="monotone" dataKey="avg_price"    name="Avg Price" stroke="#E8A838" strokeWidth={2.5} dot={{ r:5, fill:"#E8A838" }} />
                    <Line yAxisId="m" type="monotone" dataKey="avg_price_m2" name="Avg €/m²"  stroke="#5B9BD5" strokeWidth={2.5} dot={{ r:5, fill:"#5B9BD5" }} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>}
          </ChartCard>

          <ChartCard title={`${municipality} — Inventory Over Time`}>
            {(trend||[]).length < 2
              ? <NoDataNote msg="More monthly snapshots needed" />
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trend||[]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.3)", borderRadius:8, fontSize:12 }} />
                    <Bar dataKey="total_units" name="Units Available" fill="#5B9BD5" radius={[5,5,0,0]} />
                  </BarChart>
                </ResponsiveContainer>}
          </ChartCard>

          {/* Snapshot comparison table for this municipality */}
          <ChartCard title="Snapshot Comparison" span={2}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                  {["Period","Avg Price","Avg €/m²","Units Available"].map(h=>(
                    <th key={h} style={{ padding:"6px 12px", textAlign:"right", color:"#3a4555", fontSize:10, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(trend||[]).map((row,i)=>(
                  <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.05)", background:i===trend.length-1?"rgba(232,168,56,0.05)":"transparent" }}>
                    <td style={{ padding:"7px 12px", textAlign:"right", color:i===trend.length-1?"#E8A838":"#f0e8d5", fontWeight:i===trend.length-1?600:400 }}>{row.period} {i===trend.length-1&&"★"}</td>
                    <td style={{ padding:"7px 12px", textAlign:"right", color:"#f0e8d5" }}>{fmt(row.avg_price)}</td>
                    <td style={{ padding:"7px 12px", textAlign:"right", color:"#f0e8d5" }}>€{row.avg_price_m2}</td>
                    <td style={{ padding:"7px 12px", textAlign:"right", color:"#f0e8d5" }}>{row.total_units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color="#f0e8d5" }) {
  return (
    <div>
      <div style={{ color:"#3a4555", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</div>
      <div style={{ color, fontWeight:600, fontSize:14 }}>{value}</div>
    </div>
  );
}

function MuniCard({ m, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:hov?"rgba(232,168,56,0.08)":"rgba(255,255,255,0.03)", border:`1px solid ${hov?"rgba(232,168,56,0.4)":"rgba(255,255,255,0.07)"}`, borderRadius:12, padding:"16px 18px", cursor:"pointer", transition:"all 0.15s" }}>
      <div style={{ fontWeight:600, fontSize:14, color:hov?"#E8A838":"#f0e8d5", marginBottom:12 }}>{m.municipality}</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 12px" }}>
        <Metric label="Developments" value={m.listings||"—"} />
        <Metric label="Apartments"   value={m.units} />
        <Metric label="Avg Price"    value={fmt(m.avg_price)}    color="#E8A838" />
        <Metric label="Avg €/m²"     value={fmt(m.avg_price_m2)} color="#8fa0b0" />
      </div>
      <div style={{ marginTop:10, color:hov?"#E8A838":"#3a4555", fontSize:11 }}>Explore →</div>
    </div>
  );
}

function ListingCard({ l, onSelect }) {
  const [hov, setHov] = useState(false);
  const esgColor = ESG_COLORS[l.esg_grade]||"#555";
  return (
    <div onClick={onSelect} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:hov?"rgba(232,168,56,0.06)":"rgba(255,255,255,0.03)", border:`1px solid ${hov?"rgba(232,168,56,0.4)":"rgba(255,255,255,0.07)"}`, borderRadius:12, padding:"16px 18px", cursor:"pointer", transition:"all 0.15s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:hov?"#E8A838":"#f0e8d5" }}>{l.property_name}</div>
          <div style={{ color:"#8fa0b0", fontSize:11, marginTop:2 }}>{l.developer}</div>
        </div>
        {l.esg_grade&&l.esg_grade!=="nan"&&<Tag label={`ESG ${l.esg_grade}`} color={esgColor}/>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"7px 10px", marginBottom:10 }}>
        <Metric label="Apartments" value={l.units}           />
        <Metric label="Avg Price"  value={fmt(l.avg_price)}  color="#E8A838" />
        <Metric label="€/m²"       value={fmt(l.avg_price_m2)} color="#8fa0b0" />
        <Metric label="From"       value={fmt(l.min_price)}  color="#3DAA6E" />
        <Metric label="To"         value={fmt(l.max_price)}  color="#C0392B" />
        <Metric label="Avg Size"   value={`${l.avg_size}m²`} />
      </div>
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 }}>
        {(l.unit_types||"").split(", ").filter(Boolean).map(ut=>(
          <span key={ut} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, background:`${UNIT_COLORS[ut]||"#555"}22`, color:UNIT_COLORS[ut]||"#aaa", border:`1px solid ${UNIT_COLORS[ut]||"#555"}44` }}>{ut}</span>
        ))}
      </div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        <Pill on={l.has_pool}    label="Pool"/>
        <Pill on={l.has_parking} label="Parking"/>
        <Pill on={l.has_terrace} label="Terrace"/>
        <Pill on={l.has_lift}    label="Lift"/>
      </div>
      <div style={{ marginTop:10, fontSize:11, color:hov?"#E8A838":"#3a4555" }}>View all apartments →</div>
    </div>
  );
}
