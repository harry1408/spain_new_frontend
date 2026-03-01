export const COLORS = ["#5B9BD5","#E8A838","#3DAA6E","#9B59B6","#E74C3C","#1ABC9C","#F39C12","#2ECC71","#E67E22","#3498DB"];
export const UNIT_COLORS = { Studio:"#9B59B6", "1BR":"#3DAA6E", "2BR":"#5B9BD5", "3BR":"#E8A838", "4BR":"#E74C3C", "5BR":"#F39C12", Penthouse:"#1ABC9C" };
export const ESG_COLORS  = { A:"#27AE60", B:"#2ECC71", C:"#F39C12", D:"#E67E22", E:"#E74C3C" };

export const fmt     = (v) => v==null ? "—" : `€${Number(v).toLocaleString("en",{maximumFractionDigits:0})}`;
export const fmtFull = (v) => v==null ? "—" : `€${Number(v).toLocaleString("en",{maximumFractionDigits:0})}`;

export function StatCard({ label, value, sub, accent, children }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"14px 18px", minWidth:130 }}>
      <div style={{ color:"#3a4555", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{label}</div>
      <div style={{ color: accent||"#E8A838", fontWeight:700, fontSize:20 }}>{value}</div>
      {sub   && <div style={{ color:"#8fa0b0", fontSize:11, marginTop:3 }}>{sub}</div>}
      {children}
    </div>
  );
}

export function ChartCard({ title, children, span }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"18px 20px", gridColumn: span===2?"span 2":"auto" }}>
      <div style={{ color:"#f0e8d5", fontWeight:600, fontSize:14, marginBottom:14 }}>{title}</div>
      {children}
    </div>
  );
}

export function Tag({ label, color }) {
  return (
    <span style={{ background:`${color}22`, color, border:`1px solid ${color}55`, borderRadius:6, padding:"3px 8px", fontSize:11, fontWeight:600 }}>{label}</span>
  );
}

export function Pill({ on, label }) {
  if (!on) return null;
  return (
    <span style={{ background:"rgba(61,170,110,0.15)", color:"#3DAA6E", border:"1px solid rgba(61,170,110,0.3)", borderRadius:5, padding:"2px 7px", fontSize:10 }}>{label}</span>
  );
}

export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#161c2d", border:"1px solid rgba(232,168,56,0.35)", borderRadius:8, padding:"10px 14px", fontSize:12 }}>
      {label && <div style={{ color:"#E8A838", fontWeight:600, marginBottom:4 }}>{label}</div>}
      {payload.map((p,i) => (
        <div key={i} style={{ color:"#f0e8d5" }}>{p.name}: <strong style={{ color:p.color||"#E8A838" }}>{typeof p.value==="number"&&p.value>1000?fmt(p.value):p.value}</strong></div>
      ))}
    </div>
  );
}

export function MultiSelect({ label, options, value, onChange }) {
  return null; // used locally in pages
}
