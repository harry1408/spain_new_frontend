import { useState } from "react";

export const COLORS = ["#E8A838","#2A6496","#3DAA6E","#C0392B","#8E44AD","#16A085","#E67E22","#2980B9"];
export const UNIT_COLORS = { Studio:"#E8A838","1BR":"#2A6496","2BR":"#3DAA6E","3BR":"#C0392B","4BR":"#8E44AD","5BR":"#16A085",Penthouse:"#E67E22" };
export const ESG_COLORS = { A:"#3DAA6E", B:"#E8A838", C:"#E67E22", D:"#C0392B", E:"#8B0000", Unknown:"#444" };

export const fmt = (n) => {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1000000) return `€${(n/1000000).toFixed(2)}M`;
  if (n >= 1000) return `€${(n/1000).toFixed(0)}K`;
  return `€${Math.round(n)}`;
};
export const fmtFull = (n) => n != null ? `€${Number(n).toLocaleString("en-GB")}` : "—";

export function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "linear-gradient(135deg,rgba(232,168,56,0.1),rgba(42,100,150,0.08))", border: "1px solid rgba(232,168,56,0.2)", borderRadius: 12, padding: "18px 22px", flex: 1, minWidth: 145 }}>
      <div style={{ color: "#E8A838", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <div style={{ color: accent || "#f0e8d5", fontSize: 22, fontWeight: 700, fontFamily: "'DM Serif Display',serif" }}>{value}</div>
      {sub && <div style={{ color: "#8fa0b0", fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export function ChartCard({ title, children, span = 1, style = {} }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 18px", gridColumn: `span ${span}`, ...style }}>
      <div style={{ color: "#f0e8d5", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

export const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#161c2d", border: "1px solid rgba(232,168,56,0.35)", borderRadius: 8, padding: "10px 14px", fontSize: 12, maxWidth: 220 }}>
      {label && <div style={{ color: "#E8A838", marginBottom: 4, fontWeight: 600 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: "#f0e8d5", marginTop: 2 }}>
          <span style={{ color: p.color || "#aaa" }}>{p.name}: </span>
          <strong>{typeof p.value === "number" && String(p.name).toLowerCase().match(/price|m2|eur/) ? fmt(p.value) : p.value?.toLocaleString?.() ?? p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export function Tag({ label, color = "#E8A838" }) {
  return <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:600, color, background:`${color}22`, border:`1px solid ${color}44` }}>{label}</span>;
}

export function Pill({ on, label }) {
  if (!on) return null;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:20, fontSize:10, background:"rgba(61,170,110,0.15)", color:"#3DAA6E", border:"1px solid rgba(61,170,110,0.3)" }}>{label}</span>;
}

export function MultiSelect({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:"relative", minWidth:160 }}>
      <button onClick={() => setOpen(!open)} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(232,168,56,0.3)", color:"#f0e8d5", padding:"7px 12px", borderRadius:7, cursor:"pointer", fontSize:12, width:"100%", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}: {value.length===0?"All":value.length===1?value[0]:`${value.length} selected`}</span>
        <span style={{ color:"#E8A838", marginLeft:6 }}>{open?"^":"v"}</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, background:"#131827", border:"1px solid rgba(232,168,56,0.35)", borderRadius:8, zIndex:200, maxHeight:260, overflowY:"auto", minWidth:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }}>
          <div onClick={() => { onChange([]); setOpen(false); }} style={{ padding:"7px 13px", cursor:"pointer", fontSize:12, color:value.length===0?"#E8A838":"#f0e8d5", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>All</div>
          {options.map(opt => (
            <div key={opt} onClick={() => value.includes(opt)?onChange(value.filter(v=>v!==opt)):onChange([...value,opt])} style={{ padding:"6px 13px", cursor:"pointer", fontSize:12, color:value.includes(opt)?"#E8A838":"#f0e8d5", background:value.includes(opt)?"rgba(232,168,56,0.08)":"transparent" }}>
              {value.includes(opt)?"* ":"  "}{opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
