import { useState, useRef, useEffect } from "react";
import SummaryPage    from "./pages/SummaryPage.jsx";
import DrilldownPage  from "./pages/DrilldownPage.jsx";
import ListingPage    from "./pages/ListingPage.jsx";
import ApartmentPage  from "./pages/ApartmentPage.jsx";
import DelistedPage   from "./pages/DelistedPage.jsx";
import SearchPage            from "./pages/SearchPage.jsx";
import DescriptionSearchPage from "./pages/DescriptionSearchPage.jsx";
import ScraperPage    from "./pages/ScraperPage.jsx";

//export const API = "http://localhost:8000";
export const API = "https://spain-house-development.onrender.com";
//export const API = "https://spain-housing-intelligence-477978906383.asia-south1.run.app";
const NAV_H = 56;
const NAVY  = "#0B1239";
const BEIGE = "#F2F4F6";

const ADMIN_USER = "admin";
const ADMIN_PASS = "valencia2024";

export default function App() {
  const [nav, setNav] = useState(() =>
    window.location.pathname.endsWith("/scraper") ? { page: "scraper" } : { page: "search" }
  );
  const prevPageRef = useRef(null);
  const goTo = (page, extra={}) => {
    prevPageRef.current = nav.page;
    setNav({ page, ...extra });
  };

  const [showLogin, setShowLogin]   = useState(false);
  const [loginUser, setLoginUser]   = useState("");
  const [loginPass, setLoginPass]   = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPw, setShowPw]         = useState(false);

  const openLogin  = () => { setShowLogin(true); setLoginUser(""); setLoginPass(""); setLoginError(""); setShowPw(false); };
  const closeLogin = () => { setShowLogin(false); };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginUser.trim() === ADMIN_USER && loginPass === ADMIN_PASS) {
      closeLogin();
      history.pushState({}, "", import.meta.env.BASE_URL + "scraper");
      setNav({ page: "scraper" });
    } else {
      setLoginError("Invalid credentials.");
    }
  };

  // close modal on Escape
  useEffect(() => {
    if (!showLogin) return;
    const fn = (e) => { if (e.key === "Escape") closeLogin(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [showLogin]);

  const NAV_TABS = [
    ["search",      "Search"],
    ["description", "Description Search"],
    ["summary",     "Market Summary"],
    ["drilldown",   "Analysis"],
    ["delisted",    "Sold Out"],
  ];

  const activeTab = (nav.page==="listing"||nav.page==="apartment") ? "drilldown" : nav.page;

  // Scraper page: full-screen, no nav bar
  if (nav.page === "scraper") {
    return (
      <div style={{ minHeight:"100vh", background:"#F2F4F6", fontFamily:"'Inter',sans-serif", color:NAVY }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
        <div style={{ background:NAVY, padding:"10px 28px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ color:"#fff", fontSize:13, fontWeight:600 }}>Spain Housing Intelligence · Admin</span>
          <button onClick={() => { history.pushState({}, "", import.meta.env.BASE_URL); setNav({ page:"search" }); }}
            style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)",
              color:"#fff", fontSize:11, padding:"5px 12px", borderRadius:6, cursor:"pointer" }}>
            ← Back to App
          </button>
        </div>
        <ScraperPage />
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#FFFFFF", fontFamily:"'Inter',sans-serif", color:NAVY }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>

      {/* Nav — white */}
      <div style={{ position:"sticky", top:0, zIndex:200, background:"#FFFFFF",
        borderBottom:`1px solid #E2E0DB`, padding:"0 28px",
        display:"flex", alignItems:"center", height:NAV_H,
        boxShadow:"0 1px 4px rgba(11,18,57,0.07)" }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:36 }}>
          <span style={{ fontSize:18 }}>🇪🇸</span>
          <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:19, color:NAVY, fontWeight:400 }}>Spain</span>
          <span style={{ color:"#C5CBE9", fontSize:16 }}>/</span>
          <span style={{ color:"#8A96B4", fontSize:13, fontWeight:500 }}>Housing Intelligence</span>
        </div>

        {/* Tabs */}
        {NAV_TABS.map(([id, lbl]) => (
          <button key={id} onClick={() => goTo(id)} style={{
            background:"none", border:"none", cursor:"pointer",
            padding:"0 18px", height:"100%",
            borderBottom: activeTab===id ? `3px solid ${NAVY}` : "3px solid transparent",
            color: activeTab===id ? NAVY : "#8A96B4",
            fontSize:13, fontWeight:600, transition:"all 0.15s",
          }}>{lbl}</button>
        ))}

        {/* Breadcrumb */}
        {nav.municipality && nav.page!=="summary" && nav.page!=="delisted" && (
          <div style={{ marginLeft:"auto", marginRight:12, display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
            <span style={{ cursor:"pointer", color:"#6B7A9F", fontWeight:600 }}
              onClick={() => goTo("drilldown")}>All</span>
            <span style={{ color:"#C5CBE9" }}>/</span>
            <span style={{ cursor: nav.page==="listing"||nav.page==="apartment"?"pointer":"default",
              color: nav.page==="listing"||nav.page==="apartment"?"#3D4A6B":NAVY, fontWeight:600 }}
              onClick={() => (nav.page==="listing"||nav.page==="apartment") && goTo("drilldown",{municipality:nav.municipality})}>
              {nav.municipality}
            </span>
            {nav.listingName && (<>
              <span style={{ color:"#C5CBE9" }}>/</span>
              <span style={{ cursor:nav.page==="apartment"?"pointer":"default",
                color:nav.page==="apartment"?"#3D4A6B":NAVY, fontWeight:600 }}
                onClick={() => nav.page==="apartment" && goTo("listing",{listingId:nav.listingId,listingName:nav.listingName,municipality:nav.municipality})}>
                {nav.listingName}
              </span>
            </>)}
            {nav.aptLabel && (<>
              <span style={{ color:"#C5CBE9" }}>/</span>
              <span style={{ color:NAVY, fontWeight:600 }}>{nav.aptLabel}</span>
            </>)}
          </div>
        )}

        {/* Admin button — top-right */}
        <button onClick={openLogin} style={{
          marginLeft: nav.municipality && nav.page!=="summary" && nav.page!=="delisted" ? 0 : "auto",
          background:"none",
          border:`1px solid #E2E0DB`, borderRadius:6,
          padding:"5px 12px", cursor:"pointer",
          fontSize:11, fontWeight:600, color:"#8A96B4",
          display:"flex", alignItems:"center", gap:5,
          transition:"all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor=NAVY; e.currentTarget.style.color=NAVY; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="#E2E0DB"; e.currentTarget.style.color="#8A96B4"; }}
        >
          <span style={{ fontSize:12 }}>⚙</span> Admin
        </button>
      </div>

      {/* Login modal */}
      {showLogin && (
        <div onClick={closeLogin} style={{
          position:"fixed", inset:0, zIndex:1000,
          background:"rgba(11,18,57,0.45)", backdropFilter:"blur(3px)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:"#fff", borderRadius:14, padding:"32px 28px",
            width:340, boxShadow:"0 20px 60px rgba(11,18,57,0.2)",
          }}>
            <div style={{ fontSize:15, fontWeight:700, color:NAVY, marginBottom:4 }}>Admin Access</div>
            <div style={{ fontSize:12, color:"#8A96B4", marginBottom:24 }}>Enter your credentials to continue</div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#6B7A9F", marginBottom:5 }}>Username</div>
                <input
                  autoFocus
                  value={loginUser}
                  onChange={e => { setLoginUser(e.target.value); setLoginError(""); }}
                  style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px",
                    border:`1px solid ${loginError?"#FCA5A5":"#E2E0DB"}`, borderRadius:8,
                    fontSize:13, color:NAVY, outline:"none", fontFamily:"inherit" }}
                  placeholder="Username"
                />
              </div>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#6B7A9F", marginBottom:5 }}>Password</div>
                <div style={{ position:"relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={loginPass}
                    onChange={e => { setLoginPass(e.target.value); setLoginError(""); }}
                    style={{ width:"100%", boxSizing:"border-box", padding:"9px 36px 9px 12px",
                      border:`1px solid ${loginError?"#FCA5A5":"#E2E0DB"}`, borderRadius:8,
                      fontSize:13, color:NAVY, outline:"none", fontFamily:"inherit" }}
                    placeholder="Password"
                  />
                  <span onClick={() => setShowPw(v=>!v)} style={{
                    position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                    cursor:"pointer", fontSize:14, userSelect:"none",
                  }}>{showPw ? "🙈" : "👁"}</span>
                </div>
              </div>

              {loginError && (
                <div style={{ fontSize:11, color:"#DC2626", marginBottom:14,
                  padding:"7px 10px", background:"#FEF2F2", borderRadius:6 }}>
                  {loginError}
                </div>
              )}

              <div style={{ display:"flex", gap:8 }}>
                <button type="button" onClick={closeLogin} style={{
                  flex:1, padding:"10px 0", borderRadius:8,
                  border:`1px solid #E2E0DB`, background:"#fff",
                  color:"#6B7A9F", fontSize:13, fontWeight:600, cursor:"pointer",
                }}>Cancel</button>
                <button type="submit" style={{
                  flex:2, padding:"10px 0", borderRadius:8,
                  border:"none", background:NAVY,
                  color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer",
                }}>Sign In</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pages */}
      {nav.page==="search" && <SearchPage onSelectListing={(id,name,muni) => goTo("listing",{listingId:id,listingName:name,municipality:muni})} onSelectDelisted={id => goTo("delisted",{selectedId:id,fromSearch:true})}/>}
      {nav.page==="description" && <DescriptionSearchPage onSelectListing={(id,name,muni,dq) => goTo("listing",{listingId:id,listingName:name,municipality:muni,descQuery:dq})} onSelectDelisted={id => goTo("delisted",{selectedId:id,fromSearch:true})}/>}
      {nav.page==="summary" && <SummaryPage onDrilldown={m => goTo("drilldown",{municipality:m})} onGoListing={(id,name,muni) => goTo("listing",{listingId:id,listingName:name,municipality:muni,highlight:id})}/>}
      {nav.page==="drilldown" && <DrilldownPage municipality={nav.municipality} onSelectMunicipality={m => goTo("drilldown",{municipality:m})} onSelectListing={(id,name,muni) => goTo("listing",{listingId:id,listingName:name,municipality:muni})} onSelectDelisted={id => goTo("delisted",{selectedId:id})} onBackToSearch={prevPageRef.current==="search" ? () => goTo("search") : null}/>}
      {nav.page==="listing" && <ListingPage listingId={nav.listingId} municipality={nav.municipality} highlight={nav.highlight} descQuery={nav.descQuery}
        backLabel={prevPageRef.current==="search" ? "Search" : prevPageRef.current==="description" ? "Description Search" : nav.municipality}
        onBack={prevPageRef.current==="search" ? () => goTo("search") : prevPageRef.current==="description" ? () => goTo("description") : () => goTo("drilldown",{municipality:nav.municipality})}
        onGoListing={(id,name,muni) => goTo("listing",{listingId:id,listingName:name,municipality:muni})} onGoApartment={(apt,lid,lname,muni) => goTo("apartment",{apt,listingId:lid,listingName:lname,municipality:muni,aptLabel:`${apt.unit_type} · ${apt.floor||"—"}`})}/>}
      {nav.page==="apartment" && <ApartmentPage apt={nav.apt} listingId={nav.listingId} listingName={nav.listingName} municipality={nav.municipality} onBack={() => goTo("listing",{listingId:nav.listingId,listingName:nav.listingName,municipality:nav.municipality})} onGoListing={(id,name,muni) => goTo("listing",{listingId:id,listingName:name,municipality:muni})}/>}
      {nav.page==="delisted" && <DelistedPage onGoListing={(id,name,muni) => goTo("listing",{listingId:id,listingName:name,municipality:muni})} onGoDrilldown={m => goTo("drilldown",{municipality:m})} selectedId={nav.selectedId} fromSearch={nav.fromSearch} onBackToSearch={() => goTo("search")}/>}
    </div>
  );
}
