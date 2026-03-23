import React from 'react';
import LeafletMap from './LeafletMap.jsx';

// ── Multi-pin map — Google Maps embed centered on current/active listing ────
export function MultiPinGoogleMap({ markers = [], activePin, currentLat, currentLng, height = "510px" }) {
  const center = React.useMemo(() => {
    if (activePin) {
      const m = markers.find(m => m.id === activePin);
      if (m?.lat && m?.lng) return { lat: m.lat, lng: m.lng };
    }
    if (currentLat && currentLng) return { lat: currentLat, lng: currentLng };
    if (markers.length) return { lat: markers[0].lat, lng: markers[0].lng };
    return { lat: 39.47, lng: -0.38 };
  }, [activePin, markers, currentLat, currentLng]);

  if (!center.lat || !center.lng) return null;

  return (
    <div style={{ position:"relative", width:"100%", height, overflow:"hidden" }}>
      <iframe
        title="nearby-map"
        src={`https://maps.google.com/maps?q=${center.lat},${center.lng}&z=13&output=embed`}
        width="100%" height="100%"
        style={{ border:0, display:"block" }}
        allowFullScreen="" loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a href={`https://www.google.com/maps?q=${center.lat},${center.lng}`}
        target="_blank" rel="noreferrer"
        style={{ position:"absolute", bottom:8, right:8, background:"rgba(255,255,255,0.92)",
          borderRadius:4, fontSize:10, fontWeight:600, color:"#1e40af",
          padding:"3px 8px", textDecoration:"none",
          boxShadow:"0 1px 4px rgba(0,0,0,0.2)", zIndex:10 }}>
        Open in Google Maps ↗
      </a>
    </div>
  );
}

// ── Single-location Google Maps embed iframe (no API key needed) ──────────
export function GoogleMapEmbed({ lat, lng, height = "220px", zoom = 16 }) {
  if (!lat || !lng) return null;
  return (
    <div style={{ position:"relative", width:"100%", height, overflow:"hidden" }}>
      <iframe
        title="map"
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`}
        width="100%" height="100%"
        style={{ border:0, display:"block" }}
        allowFullScreen="" loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank" rel="noreferrer"
        style={{ position:"absolute", bottom:6, right:6, background:"rgba(255,255,255,0.92)",
          borderRadius:4, fontSize:10, fontWeight:600, color:"#1e40af",
          padding:"2px 7px", textDecoration:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", zIndex:10 }}>
        Open in Google Maps ↗
      </a>
    </div>
  );
}

// ── Small thumbnail (Section 4 development cards) ─────────────────────────
export function MapThumbnail({ lat, lng, height = 90, zoom = 15, overlay }) {
  if (!lat || !lng) return null;
  return (
    <div style={{ position:"relative", height, overflow:"hidden" }}>
      <iframe
        title="map-thumb"
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`}
        width="100%" height={height * 2}
        style={{ border:0, display:"block", marginTop: -(height * 0.35), pointerEvents:"none" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {overlay && <div style={{ position:"absolute", inset:0, ...overlay }} />}
      <a href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank" rel="noreferrer"
        style={{ position:"absolute", bottom:4, right:5, background:"rgba(255,255,255,0.85)",
          borderRadius:3, fontSize:9, fontWeight:600, color:"#1e40af",
          padding:"1px 5px", textDecoration:"none", zIndex:10 }}>
        Google Maps ↗
      </a>
    </div>
  );
}

// ── Default export (ListingPage address popup) ────────────────────────────
export default function GoogleStaticMap({ lat, lng, height = "220px", zoom = 16 }) {
  if (lat && lng) return <GoogleMapEmbed lat={lat} lng={lng} height={height} zoom={zoom} />;
  return null;
}
