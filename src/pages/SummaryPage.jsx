import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell, Legend } from "recharts";
import { StatCard, ChartCard, CustomTooltip, MultiSelect, fmt, COLORS, UNIT_COLORS, ESG_COLORS } from "../components/shared.jsx";
import { API } from "../App.jsx";

export default function SummaryPage({ onDrilldown }) {
  const [filters, setFilters] = useState({ municipalities:[], unit_types:[], delivery_years:[], esg_grades:[] });
  const [sel, setSel] = useState({ municipality:[], unit_type:[], year:[], esg:[] });
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState({});
  const [loading, setLoading] = useState(false);

  const buildQ = useCallback(() => {
    const p = new URLSearchParams();
    sel.municipality.forEach(v => p.append("municipality", v));
    sel.unit_type.forEach(v => p.append("unit_type", v));
    sel.year.forEach(v => p.append("year", v));
    sel.esg.forEach(v => p.append("esg", v));
    return p.toString();
  }, [sel]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const q = buildQ();
    try {
      const [statsR, byType, timeline, priceDist, muniR, esgR, scatter] = await Promise.all([
        fetch(`${API}/stats?${q}`).then(r => r.json()),
        fetch(`${API}/charts/price-by-unit-type?${q}`).then(r => r.json()),
        fetch(`${API}/charts/delivery-timeline?${q}`).then(r => r.json()),
        fetch(`${API}/charts/price-distribution?${q}`).then(r => r.json()),
        fetch(`${API}/charts/municipality-overview?${q}`).then(r => r.json()),
        fetch(`${API}/charts/esg-breakdown?${q}`).then(r => r.json()),
        fetch(`${API}/charts/size-vs-price?${q}`).then(r => r.json()),
      ]);
      setStats(statsR);
      setCharts({ byType, timeline, priceDist, muniR, esgR, scatter });
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [buildQ]);

  useEffect(() => { fetch(`${API}/filters`).then(r => r.json()).then(setFilters); }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div>
      {/* Header */}
      <div style={{ background:"linear-gradient(180deg,#131822 0%,transparent 100%)", borderBottom:"1px solid rgba(232,168,56,0.15)", padding:"22px 36px 18px", display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontFamily:"'DM Serif Display',serif", fontSize:28, color:"#f0e8d5" }}>
            Market <em style={{ color:"#E8A838" }}>Summary</em>
          </h1>
          <div style={{ color:"#8fa0b0", fontSize:12, marginTop:4 }}>Region-wide overview — click any municipality bar to drill down</div>
        </div>
        {loading && <div style={{ color:"#E8A838", fontSize:12 }}>Updating...</div>}
      </div>

      {/* Filters */}
      <div style={{ background:"rgba(0,0,0,0.2)", borderBottom:"1px solid rgba(255,255,255,0.05)", padding:"12px 36px", display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ color:"#3a4555", fontSize:11, letterSpacing:"0.1em" }}>FILTER</span>
        <MultiSelect label="Municipality" options={filters.municipalities||[]} value={sel.municipality} onChange={v => setSel(s=>({...s,municipality:v}))} />
        <MultiSelect label="Unit Type" options={filters.unit_types||[]} value={sel.unit_type} onChange={v => setSel(s=>({...s,unit_type:v}))} />
        <MultiSelect label="Year" options={(filters.delivery_years||[]).map(String)} value={sel.year} onChange={v => setSel(s=>({...s,year:v}))} />
        <MultiSelect label="ESG" options={filters.esg_grades||[]} value={sel.esg} onChange={v => setSel(s=>({...s,esg:v}))} />
        {(sel.municipality.length+sel.unit_type.length+sel.year.length+sel.esg.length > 0) && (
          <button onClick={() => setSel({municipality:[],unit_type:[],year:[],esg:[]})} style={{ background:"rgba(192,57,43,0.15)", border:"1px solid rgba(192,57,43,0.35)", color:"#e87070", padding:"7px 12px", borderRadius:7, cursor:"pointer", fontSize:11 }}>Clear All</button>
        )}
      </div>

      <div style={{ padding:"24px 36px", maxWidth:1600, margin:"0 auto" }}>
        {/* KPIs */}
        {stats && (
          <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
            <StatCard label="Total Units" value={stats.total_units?.toLocaleString()} sub="matching filters" />
            <StatCard label="Avg Price" value={fmt(stats.avg_price)} sub="per unit" />
            <StatCard label="Avg Price/m²" value={`€${stats.avg_price_m2?.toLocaleString()}`} sub="per sqm" />
            <StatCard label="Avg Size" value={`${stats.avg_size} m²`} />
            <StatCard label="Developments" value={stats.total_developments?.toLocaleString()} sub="unique projects" />
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>

          {/* Price by unit type */}
          <ChartCard title="Average Price by Unit Type">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.byType||[]} barSize={38}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="unit_type" tick={{ fill:"#8fa0b0", fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_price" name="Avg Price" radius={[5,5,0,0]}>
                  {(charts.byType||[]).map((e,i) => <Cell key={i} fill={UNIT_COLORS[e.unit_type]||COLORS[i%COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Price distribution */}
          <ChartCard title="Price Range Distribution">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.priceDist||[]} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="bin" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Units" radius={[5,5,0,0]}>
                  {(charts.priceDist||[]).map((_,i) => <Cell key={i} fill={`hsl(${200+i*16},60%,${42+i*3}%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Timeline */}
          <ChartCard title="Delivery Timeline" span={2}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.timeline||[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="delivery_quarter" tick={{ fill:"#8fa0b0", fontSize:9 }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={50} />
                <YAxis yAxisId="l" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color:"#8fa0b0", fontSize:12 }} />
                <Bar yAxisId="l" dataKey="count" name="Units" fill="#E8A838" radius={[3,3,0,0]} opacity={0.85} />
                <Line yAxisId="r" type="monotone" dataKey="avg_price" name="Avg Price" stroke="#3DAA6E" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Municipality - clickable */}
          <ChartCard title="Top Municipalities — click to drill down">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.muniR||[]} layout="vertical" barSize={14}
                onClick={(data) => { if (data?.activePayload?.[0]?.payload?.municipality) onDrilldown(data.activePayload[0].payload.municipality); }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="municipality" tick={{ fill:"#8fa0b0", fontSize:10 }} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="units" name="Units" radius={[0,5,5,0]} cursor="pointer">
                  {(charts.muniR||[]).map((_,i) => <Cell key={i} fill={`hsl(${38+i*4},75%,${55-i*1.5}%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ color:"#3a4555", fontSize:11, marginTop:8 }}>Click a bar to explore that municipality</div>
          </ChartCard>

          {/* ESG */}
          <ChartCard title="ESG Energy Certificates">
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              <ResponsiveContainer width="45%" height={200}>
                <PieChart>
                  <Pie data={charts.esgR||[]} dataKey="count" nameKey="esg_grade" cx="50%" cy="50%" outerRadius={80} innerRadius={44}>
                    {(charts.esgR||[]).map((e,i) => <Cell key={i} fill={ESG_COLORS[e.esg_grade]||COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {(charts.esgR||[]).sort((a,b)=>b.count-a.count).map((d,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ width:9, height:9, borderRadius:2, background:ESG_COLORS[d.esg_grade]||"#555" }} />
                      <span style={{ fontSize:12 }}>Grade {d.esg_grade}</span>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:12, fontWeight:600 }}>{d.count}</div>
                      <div style={{ fontSize:10, color:"#8fa0b0" }}>{fmt(d.avg_price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Scatter */}
          <ChartCard title="Size vs Price (sampled)" span={2}>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="size" name="Size (m²)" tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} label={{ value:"Size (m²)", position:"insideBottom", fill:"#8fa0b0", fontSize:11, dy:10 }} />
                <YAxis dataKey="price" name="Price" tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ strokeDasharray:"3 3" }} content={({ active, payload }) => {
                  if (!active||!payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.35)", borderRadius:8, padding:"10px 14px", fontSize:12 }}>
                      <div style={{ color:"#E8A838", fontWeight:600, marginBottom:3 }}>{d?.property_name}</div>
                      <div>Size: <strong>{d?.size} m²</strong></div>
                      <div>Price: <strong>{fmt(d?.price)}</strong></div>
                      <div style={{ color:"#8fa0b0" }}>{d?.municipality}</div>
                    </div>
                  );
                }} />
                <Scatter data={charts.scatter||[]} shape={(props) => (
                  <circle cx={props.cx} cy={props.cy} r={4} fill={UNIT_COLORS[props.payload?.unit_type]||"#E8A838"} opacity={0.65} />
                )} />
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", gap:14, marginTop:8, flexWrap:"wrap" }}>
              {Object.entries(UNIT_COLORS).map(([k,v]) => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#8fa0b0" }}>
                  <div style={{ width:9,height:9,borderRadius:"50%",background:v }} />{k}
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Price/m2 by municipality */}
          <ChartCard title="Price per m² by Municipality (Top 15)" span={2}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={(charts.muniR||[]).sort((a,b)=>b.avg_price_m2-a.avg_price_m2).slice(0,15)} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="municipality" tick={{ fill:"#8fa0b0", fontSize:9 }} axisLine={false} tickLine={false} angle={-28} textAnchor="end" height={48} interval={0} />
                <YAxis tickFormatter={v=>`€${v}`} tick={{ fill:"#8fa0b0", fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_price_m2" name="Avg EUR/m2" radius={[5,5,0,0]}>
                  {(charts.muniR||[]).map((_,i) => <Cell key={i} fill={`hsl(${35+i*7},74%,${50-i*1.2}%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      </div>
    </div>
  );
}
