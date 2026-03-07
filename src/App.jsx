import { useState } from "react";
import SummaryPage    from "./pages/SummaryPage.jsx";
import DrilldownPage  from "./pages/DrilldownPage.jsx";
import ListingPage    from "./pages/ListingPage.jsx";
import ApartmentPage  from "./pages/ApartmentPage.jsx";
import DelistedPage   from "./pages/DelistedPage.jsx";

// export const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API = "https://spain-house-development.onrender.com";
const NAV_H = 56;

export default function App() {
  const [nav, setNav] = useState({ page:"summary" });
  const goTo = (page, extra={}) => setNav({ page, ...extra });

  const navActive   = "#C9A84C";
  const navInactive = "#6B7280";

  const NAV_TABS = [
    ["summary",  "Market Summary"],
    ["drilldown","Analysis"],
    ["delisted", "Delisted"],
  ];

  const activeTab = (nav.page==="listing"||nav.page==="apartment") ? "drilldown" : nav.page;

  return (
    <div style={{ minHeight:"100vh", background:"#F7F6F2", fontFamily:"'Inter',sans-serif", color:"#1A1A2E" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>

      {/* Nav */}
      <div style={{ position:"sticky", top:0, zIndex:200, background:"#FFFFFF",
        borderBottom:"1px solid #E4E0D8", padding:"0 32px",
        display:"flex", alignItems:"center", height:NAV_H,
        boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:36 }}>
          <span style={{ fontSize:20 }}>🇪🇸</span>
          <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:19, color:"#C9A84C", fontWeight:400 }}>Spain</span>
          <span style={{ color:"#D1C9B8", fontSize:16 }}>/</span>
          <span style={{ color:"#9CA3AF", fontSize:13, fontWeight:500 }}>Housing Intelligence</span>
        </div>

        {NAV_TABS.map(([id, lbl]) => (
          <button key={id} onClick={() => goTo(id)} style={{
            background:"none", border:"none", cursor:"pointer",
            padding:"0 18px", height:"100%",
            borderBottom: activeTab===id ? `3px solid ${navActive}` : "3px solid transparent",
            color: activeTab===id ? navActive : navInactive,
            fontSize:13, fontWeight:600, transition:"all 0.15s",
          }}>{lbl}</button>
        ))}

        {/* Breadcrumb */}
        {nav.municipality && nav.page!=="summary" && nav.page!=="delisted" && (
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
            <span style={{ cursor:"pointer", color:navActive, fontWeight:600 }}
              onClick={() => goTo("drilldown")}>All</span>
            <span style={{ color:"#D1C9B8" }}>/</span>
            <span style={{ cursor: nav.page==="listing"||nav.page==="apartment"?"pointer":"default",
              color: nav.page==="listing"||nav.page==="apartment"?navActive:"#1A1A2E", fontWeight:600 }}
              onClick={() => (nav.page==="listing"||nav.page==="apartment") && goTo("drilldown",{municipality:nav.municipality})}>
              {nav.municipality}
            </span>
            {nav.listingName && (<>
              <span style={{ color:"#D1C9B8" }}>/</span>
              <span style={{ cursor:nav.page==="apartment"?"pointer":"default",
                color:nav.page==="apartment"?navActive:"#1A1A2E", fontWeight:600 }}
                onClick={() => nav.page==="apartment" && goTo("listing",{listingId:nav.listingId,listingName:nav.listingName,municipality:nav.municipality})}>
                {nav.listingName}
              </span>
            </>)}
            {nav.aptLabel && (<>
              <span style={{ color:"#D1C9B8" }}>/</span>
              <span style={{ color:"#1A1A2E", fontWeight:600 }}>{nav.aptLabel}</span>
            </>)}
          </div>
        )}
      </div>

      {/* Pages */}
      {nav.page==="summary" && <SummaryPage
        onDrilldown={m => goTo("drilldown",{municipality:m})}
        onGoListing={(id,name,muni) => goTo("listing",{listingId:id,listingName:name,municipality:muni,highlight:id})}
      />}
      {nav.page==="drilldown" && <DrilldownPage
        municipality={nav.municipality}
        onSelectMunicipality={m => goTo("drilldown",{municipality:m})}
        onSelectListing={(id,name,muni) => goTo("listing",{listingId:id,listingName:name,municipality:muni})}
      />}
      {nav.page==="listing" && <ListingPage
        listingId={nav.listingId}
        municipality={nav.municipality}
        highlight={nav.highlight}
        onBack={() => goTo("drilldown",{municipality:nav.municipality})}
        onGoListing={(id,name,muni) => goTo("listing",{listingId:id,listingName:name,municipality:muni})}
        onGoApartment={(apt,lid,lname,muni) => goTo("apartment",{apt,listingId:lid,listingName:lname,municipality:muni,aptLabel:`${apt.unit_type} · ${apt.floor||"—"}`})}
      />}
      {nav.page==="apartment" && <ApartmentPage
        apt={nav.apt}
        listingId={nav.listingId}
        listingName={nav.listingName}
        municipality={nav.municipality}
        onBack={() => goTo("listing",{listingId:nav.listingId,listingName:nav.listingName,municipality:nav.municipality})}
      />}
      {nav.page==="delisted" && <DelistedPage
        onGoListing={(id,name,muni) => goTo("listing",{listingId:id,listingName:name,municipality:muni})}
      />}
    </div>
  );
}
