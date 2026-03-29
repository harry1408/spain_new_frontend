/**
 * Small animated brick-house logo used as a loading indicator.
 * Usage: <LoadingHouse /> or <LoadingHouse size={48} message="Loading…" />
 */
export default function LoadingHouse({ size = 52, message = "" }) {
  const s = size;
  const w = s, h = s * 0.85;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", width:"100%", minHeight:260, gap:8 }}>
      <style>{`
        @keyframes lh-brick  { 0%,100%{opacity:.45} 50%{opacity:1} }
        @keyframes lh-window { 0%,100%{opacity:.5;filter:brightness(.7)} 50%{opacity:1;filter:brightness(1.3)} }
        @keyframes lh-smoke  { 0%{transform:translateY(0) scale(.3);opacity:.7} 100%{transform:translateY(-${s*.45}px) scale(1.6);opacity:0} }
        @keyframes lh-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-${s*.08}px)} }
      `}</style>

      <div style={{ animation:`lh-bounce 1.6s ease-in-out infinite`, width:w, height:h, position:"relative" }}>
        <svg viewBox="0 0 100 88" width={w} height={h} xmlns="http://www.w3.org/2000/svg">

          {/* ── Foundation ── */}
          <rect x="8" y="74" width="84" height="10" rx="2" fill="#7A7060"/>

          {/* ── Brick wall ── */}
          {/* Row 1 (bottom) */}
          {[[10,60],[28,60],[46,60],[64,60],[80,60]].map(([x,y],i)=>(
            <rect key={`r1${i}`} x={x} y={y} width="14" height="10" rx="1.5"
              fill={["#C55226","#C05028","#CA5A2A","#B84C22","#CD5E2E"][i]}
              style={{animation:`lh-brick 1.8s ease-in-out ${i*.18}s infinite`}}/>
          ))}
          {/* Row 2 */}
          {[[4,48],[22,48],[40,48],[58,48],[76,48]].map(([x,y],i)=>(
            <rect key={`r2${i}`} x={x} y={y} width="14" height="10" rx="1.5"
              fill={["#C25428","#BB4E26","#C8582C","#C15028","#CB5C2C"][i]}
              style={{animation:`lh-brick 1.8s ease-in-out ${i*.18+.2}s infinite`}}/>
          ))}
          {/* Row 3 (window row) */}
          <rect x="10" y="36" width="14" height="10" rx="1.5" fill="#C55226"
            style={{animation:"lh-brick 1.8s ease-in-out 0s infinite"}}/>
          {/* window gap left */}
          <rect x="58" y="36" width="14" height="10" rx="1.5" fill="#CA5A2A"
            style={{animation:"lh-brick 1.8s ease-in-out .3s infinite"}}/>
          <rect x="76" y="36" width="14" height="10" rx="1.5" fill="#C05028"
            style={{animation:"lh-brick 1.8s ease-in-out .5s infinite"}}/>

          {/* ── Windows ── */}
          <rect x="26" y="35" width="18" height="13" rx="1.5" fill="#3A200A" stroke="#7A5030" strokeWidth="1.5"/>
          <rect x="26" y="35" width="18" height="13" rx="1.5" fill="#FFD040"
            style={{animation:"lh-window 1.6s ease-in-out .1s infinite"}}/>
          <line x1="35" y1="35" x2="35" y2="48" stroke="rgba(80,45,8,.5)" strokeWidth="1.2"/>
          <line x1="26" y1="41.5" x2="44" y2="41.5" stroke="rgba(80,45,8,.5)" strokeWidth="1.2"/>

          <rect x="52" y="35" width="18" height="13" rx="1.5" fill="#3A200A" stroke="#7A5030" strokeWidth="1.5"/>
          <rect x="52" y="35" width="18" height="13" rx="1.5" fill="#FFD040"
            style={{animation:"lh-window 1.6s ease-in-out .5s infinite"}}/>
          <line x1="61" y1="35" x2="61" y2="48" stroke="rgba(80,45,8,.5)" strokeWidth="1.2"/>
          <line x1="52" y1="41.5" x2="70" y2="41.5" stroke="rgba(80,45,8,.5)" strokeWidth="1.2"/>

          {/* ── Door ── */}
          <rect x="41" y="57" width="18" height="23" rx="8 8 0 0" fill="#3A1C08" stroke="#5A3010" strokeWidth="1.5"/>
          <circle cx="56" cy="68" r="1.8" fill="#C8A020"/>

          {/* ── Chimney ── */}
          <rect x="68" y="14" width="12" height="22" rx="2" fill="#A04428"/>
          <rect x="65" y="11" width="18" height="5"  rx="1.5" fill="#7A2E18"/>

          {/* ── Roof ── */}
          <polygon points="50,2 97,34 3,34" fill="#0B1239"/>
          <rect x="1" y="32" width="98" height="8" rx="1.5" fill="#0D1545"/>
          <polygon points="50,2 56,8 44,8" fill="#1E2F70"/>
        </svg>

        {/* Smoke puffs */}
        {[0,1].map(i=>(
          <div key={i} style={{
            position:"absolute",
            top: s * 0.02,
            left: s * 0.77,
            width: s * 0.1,
            height: s * 0.1,
            borderRadius:"50%",
            background:"rgba(180,180,190,.65)",
            animation:`lh-smoke 2s ease-out ${i * .9}s infinite`,
          }}/>
        ))}
      </div>

      {message && (
        <div style={{ fontSize:12, color:"#6B7A9F", fontWeight:500 }}>{message}</div>
      )}
    </div>
  );
}
