import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell, Legend
} from "recharts";

const API = "https://spaindevelopment-t8hgexdb.b4a.run/filters";

const COLORS = ["#E8A838", "#2A6496", "#3DAA6E", "#C0392B", "#8E44AD", "#16A085", "#E67E22"];

const fmt = (n) => n >= 1000000 ? `€${(n/1000000).toFixed(2)}M` : n >= 1000 ? `€${(n/1000).toFixed(0)}K` : `€${n}`;

function MultiSelect({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const allSelected = value.length === 0;

  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt));
    else onChange([...value, opt]);
  };

  return (
    <div style={{ position: "relative", minWidth: 160 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(232,168,56,0.35)",
          color: "#f0e8d5",
          padding: "8px 14px",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 13,
          width: "100%",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}: {allSelected ? "All" : value.length === 1 ? value[0] : `${value.length} selected`}
        </span>
        <span style={{ color: "#E8A838" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "#1a1f2e",
            border: "1px solid rgba(232,168,56,0.4)",
            borderRadius: 8,
            zIndex: 100,
            maxHeight: 280,
            overflowY: "auto",
            minWidth: "100%",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div
            onClick={() => { onChange([]); setOpen(false); }}
            style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, color: allSelected ? "#E8A838" : "#f0e8d5", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            ✓ All
          </div>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => toggle(opt)}
              style={{
                padding: "7px 14px",
                cursor: "pointer",
                fontSize: 13,
                color: value.includes(opt) ? "#E8A838" : "#f0e8d5",
                background: value.includes(opt) ? "rgba(232,168,56,0.1)" : "transparent",
              }}
            >
              {value.includes(opt) ? "✓ " : "  "}{opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(232,168,56,0.12), rgba(42,100,150,0.12))",
      border: "1px solid rgba(232,168,56,0.25)",
      borderRadius: 12,
      padding: "20px 24px",
      flex: 1,
      minWidth: 160,
    }}>
      <div style={{ color: "#E8A838", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#f0e8d5", fontSize: 26, fontWeight: 700, fontFamily: "'DM Serif Display', serif" }}>{value}</div>
      {sub && <div style={{ color: "#8fa0b0", fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children, span = 1 }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      padding: "22px 20px",
      gridColumn: `span ${span}`,
    }}>
      <div style={{ color: "#f0e8d5", fontSize: 14, fontWeight: 600, marginBottom: 18, letterSpacing: "0.02em" }}>{title}</div>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1f2e", border: "1px solid rgba(232,168,56,0.4)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
      <div style={{ color: "#E8A838", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: "#f0e8d5" }}>{p.name}: <strong>{typeof p.value === 'number' && p.name?.toLowerCase().includes('price') ? fmt(p.value) : p.value?.toLocaleString()}</strong></div>
      ))}
    </div>
  );
};

export default function App() {
  const [filters, setFilters] = useState({ municipalities: [], unit_types: [], delivery_years: [], esg_grades: [] });
  const [sel, setSel] = useState({ municipality: [], unit_type: [], year: [], esg: [] });
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState({});
  const [loading, setLoading] = useState(false);

  const buildQuery = (extra = {}) => {
    const params = new URLSearchParams();
    [...sel.municipality, ...(extra.municipality || [])].forEach(v => params.append("municipality", v));
    [...sel.unit_type, ...(extra.unit_type || [])].forEach(v => params.append("unit_type", v));
    [...sel.year, ...(extra.year || [])].forEach(v => params.append("year", v));
    [...sel.esg, ...(extra.esg || [])].forEach(v => params.append("esg", v));
    return params.toString();
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const q = buildQuery();
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
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [sel]);

  useEffect(() => {
    fetch(`${API}/filters`).then(r => r.json()).then(setFilters);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const unitColors = { Studio: COLORS[0], "1BR": COLORS[1], "2BR": COLORS[2], "3BR": COLORS[3], "4BR": COLORS[4], "5BR": COLORS[5], Penthouse: COLORS[6] };

  return (
    <div style={{ minHeight: "100vh", background: "#0e1118", fontFamily: "'Inter', sans-serif", color: "#f0e8d5" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #131822 0%, rgba(13,17,24,0) 100%)",
        borderBottom: "1px solid rgba(232,168,56,0.2)",
        padding: "24px 36px 20px",
        display: "flex",
        alignItems: "flex-end",
        gap: 20,
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #E8A838, #c4882a)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏠</div>
            <span style={{ color: "#E8A838", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>Valencia Region</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "#f0e8d5", letterSpacing: "-0.01em" }}>
            New Housing <em style={{ color: "#E8A838" }}>Dashboard</em>
          </h1>
        </div>
        {loading && <div style={{ color: "#E8A838", fontSize: 13, animation: "pulse 1s infinite" }}>⟳ Updating...</div>}
      </div>

      {/* Filters */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 36px",
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
      }}>
        <span style={{ color: "#8fa0b0", fontSize: 12, marginRight: 4 }}>FILTERS</span>
        <MultiSelect label="Municipality" options={filters.municipalities || []} value={sel.municipality} onChange={v => setSel(s => ({ ...s, municipality: v }))} />
        <MultiSelect label="Unit Type" options={filters.unit_types || []} value={sel.unit_type} onChange={v => setSel(s => ({ ...s, unit_type: v }))} />
        <MultiSelect label="Delivery Year" options={(filters.delivery_years || []).map(String)} value={sel.year} onChange={v => setSel(s => ({ ...s, year: v }))} />
        <MultiSelect label="ESG Grade" options={filters.esg_grades || []} value={sel.esg} onChange={v => setSel(s => ({ ...s, esg: v }))} />
        {(sel.municipality.length + sel.unit_type.length + sel.year.length + sel.esg.length > 0) && (
          <button
            onClick={() => setSel({ municipality: [], unit_type: [], year: [], esg: [] })}
            style={{ background: "rgba(200,50,50,0.15)", border: "1px solid rgba(200,50,50,0.4)", color: "#f08080", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}
          >
            ✕ Clear All
          </button>
        )}
      </div>

      <div style={{ padding: "28px 36px", maxWidth: 1600, margin: "0 auto" }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
            <StatCard label="Total Units" value={stats.total_units?.toLocaleString()} sub="matching filters" />
            <StatCard label="Avg. Price" value={fmt(stats.avg_price)} sub="per unit" />
            <StatCard label="Avg. Price/m²" value={`€${stats.avg_price_m2?.toLocaleString()}`} sub="per square meter" />
            <StatCard label="Avg. Size" value={`${stats.avg_size} m²`} sub="floor area" />
            <StatCard label="Developments" value={stats.total_developments?.toLocaleString()} sub="unique projects" />
          </div>
        )}

        {/* Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>

          {/* Price by unit type */}
          <ChartCard title="💰 Average Price by Unit Type">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.byType || []} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="unit_type" tick={{ fill: "#8fa0b0", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `€${(v/1000).toFixed(0)}K`} tick={{ fill: "#8fa0b0", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_price" name="Avg Price" radius={[6, 6, 0, 0]}>
                  {(charts.byType || []).map((entry, i) => (
                    <Cell key={i} fill={unitColors[entry.unit_type] || COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Price distribution */}
          <ChartCard title="📊 Price Range Distribution">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.priceDist || []} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="bin" tick={{ fill: "#8fa0b0", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8fa0b0", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Units" fill="#2A6496" radius={[6, 6, 0, 0]}>
                  {(charts.priceDist || []).map((_, i) => (
                    <Cell key={i} fill={`hsl(${200 + i * 15}, 60%, ${40 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Delivery timeline */}
          <ChartCard title="📅 Delivery Timeline — Units per Quarter" span={2}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="delivery_quarter" tick={{ fill: "#8fa0b0", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={55} />
                <YAxis yAxisId="left" tick={{ fill: "#8fa0b0", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={v => `€${(v/1000).toFixed(0)}K`} tick={{ fill: "#8fa0b0", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#8fa0b0", fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="count" name="Units" fill="#E8A838" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Line yAxisId="right" type="monotone" dataKey="avg_price" name="Avg Price" stroke="#3DAA6E" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Municipality overview */}
          <ChartCard title="🏙️ Top Municipalities by Unit Count">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.muniR || []} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#8fa0b0", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="municipality" tick={{ fill: "#8fa0b0", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="units" name="Units" fill="#E8A838" radius={[0, 6, 6, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ESG Breakdown */}
          <ChartCard title="🌱 ESG Energy Certificate Breakdown">
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <ResponsiveContainer width="50%" height={240}>
                <PieChart>
                  <Pie data={charts.esgR || []} dataKey="count" nameKey="esg_grade" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                    {(charts.esgR || []).map((entry, i) => (
                      <Cell key={i} fill={entry.esg_grade === 'A' ? '#3DAA6E' : entry.esg_grade === 'B' ? '#E8A838' : entry.esg_grade === 'C' ? '#E67E22' : entry.esg_grade === 'Unknown' ? '#555' : COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {(charts.esgR || []).sort((a,b) => b.count - a.count).map((d, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: d.esg_grade === 'A' ? '#3DAA6E' : d.esg_grade === 'B' ? '#E8A838' : d.esg_grade === 'C' ? '#E67E22' : '#555' }} />
                      <span style={{ fontSize: 13, color: "#f0e8d5" }}>Grade {d.esg_grade}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f0e8d5" }}>{d.count}</div>
                      <div style={{ fontSize: 11, color: "#8fa0b0" }}>{fmt(d.avg_price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Scatter: Size vs Price */}
          <ChartCard title="📐 Size vs. Price (sampled)" span={2}>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="size" name="Size (m²)" tick={{ fill: "#8fa0b0", fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: "Size (m²)", position: "insideBottom", fill: "#8fa0b0", fontSize: 12, dy: 10 }} />
                <YAxis dataKey="price" name="Price" tickFormatter={v => `€${(v/1000).toFixed(0)}K`} tick={{ fill: "#8fa0b0", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: "#1a1f2e", border: "1px solid rgba(232,168,56,0.4)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                      <div style={{ color: "#E8A838", marginBottom: 4, fontWeight: 600 }}>{d?.property_name}</div>
                      <div style={{ color: "#f0e8d5" }}>Size: <strong>{d?.size} m²</strong></div>
                      <div style={{ color: "#f0e8d5" }}>Price: <strong>{fmt(d?.price)}</strong></div>
                      <div style={{ color: "#8fa0b0" }}>{d?.municipality}</div>
                    </div>
                  );
                }} />
                <Scatter
                  data={charts.scatter || []}
                  fill="#E8A838"
                  opacity={0.6}
                  shape={(props) => {
                    const c = unitColors[props.payload?.unit_type] || "#E8A838";
                    return <circle cx={props.cx} cy={props.cy} r={4} fill={c} opacity={0.65} />;
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              {Object.entries(unitColors).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8fa0b0" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: v }} />
                  {k}
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Municipality avg price/m2 */}
          <ChartCard title="💎 Price per m² by Municipality (Top 15)" span={2}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={(charts.muniR || []).sort((a,b) => b.avg_price_m2 - a.avg_price_m2).slice(0,15)} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="municipality" tick={{ fill: "#8fa0b0", fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} interval={0} />
                <YAxis tickFormatter={v => `€${v}`} tick={{ fill: "#8fa0b0", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_price_m2" name="Avg €/m²" radius={[6, 6, 0, 0]}>
                  {(charts.muniR || []).map((_, i) => (
                    <Cell key={i} fill={`hsl(${35 + i * 8}, 75%, ${50 - i * 1.5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>

        <div style={{ marginTop: 28, color: "#3a4555", fontSize: 11, textAlign: "center" }}>
          Valencia Housing Dashboard • Data from Idealista • {stats?.total_units?.toLocaleString()} units across {stats?.total_developments?.toLocaleString()} developments
        </div>
      </div>
    </div>
  );
}
