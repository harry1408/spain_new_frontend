import { useState } from "react";
import SummaryPage    from "./pages/SummaryPage.jsx";
import DrilldownPage  from "./pages/DrilldownPage.jsx";
import ListingPage    from "./pages/ListingPage.jsx";
export const API = "https://spain-house-development.onrender.com";
export default function App(){
  const [nav,setNav]=useState({page:"summary"});
  const goTo=(page,extra={})=>setNav({page,...extra});
  return(
    <div style={{minHeight:"100vh",background:"#0e1118",fontFamily:"'Inter',sans-serif",color:"#f0e8d5"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      {/* Nav */}
      <div style={{background:"#0b0e16",borderBottom:"1px solid rgba(232,168,56,0.18)",padding:"0 32px",display:"flex",alignItems:"center",height:52,gap:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:32}}>
          <span style={{fontSize:18}}>🏠</span>
          <span style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:"#E8A838"}}>Valencia</span>
          <span style={{color:"#4a5568",fontSize:16}}>/</span>
          <span style={{color:"#8fa0b0",fontSize:13}}>Housing Intelligence</span>
        </div>
        {[["summary","Market Summary"],["drilldown","Drill-Down"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>goTo(id)} style={{background:"none",border:"none",cursor:"pointer",padding:"0 18px",height:"100%",borderBottom:(nav.page===id||nav.page==="listing"&&id==="drilldown")?"2px solid #E8A838":"2px solid transparent",color:(nav.page===id||nav.page==="listing"&&id==="drilldown")?"#E8A838":"#8fa0b0",fontSize:13,fontWeight:600}}>
            {lbl}
          </button>
        ))}
        {/* Breadcrumb */}
        {nav.municipality&&nav.page!=="summary"&&(
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#8fa0b0"}}>
            <span style={{cursor:"pointer",color:"#E8A838"}} onClick={()=>goTo("drilldown")}>All</span>
            <span style={{color:"#3a4555"}}>/</span>
            <span style={{cursor:nav.page==="listing"?"pointer":"default",color:nav.page==="listing"?"#E8A838":"#f0e8d5"}} onClick={()=>nav.page==="listing"&&goTo("drilldown",{municipality:nav.municipality})}>
              {nav.municipality}
            </span>
            {nav.listingName&&<><span style={{color:"#3a4555"}}>/</span><span style={{color:"#f0e8d5"}}>{nav.listingName}</span></>}
          </div>
        )}
      </div>
      {nav.page==="summary"  && <SummaryPage onDrilldown={m=>goTo("drilldown",{municipality:m})}/>}
      {nav.page==="drilldown"&& <DrilldownPage municipality={nav.municipality} onSelectMunicipality={m=>goTo("drilldown",{municipality:m})} onSelectListing={(id,name,muni)=>goTo("listing",{listingId:id,listingName:name,municipality:muni})}/>}
      {nav.page==="listing"  && <ListingPage  listingId={nav.listingId} onBack={()=>goTo("drilldown",{municipality:nav.municipality})}/>}
    </div>
  );
}
