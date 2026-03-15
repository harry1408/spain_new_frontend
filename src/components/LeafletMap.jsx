import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeIcon(color, size, isActive) {
  const ring = isActive
    ? `box-shadow:0 0 0 5px rgba(201,168,76,0.3),0 3px 10px rgba(0,0,0,0.3);`
    : `box-shadow:0 2px 6px rgba(0,0,0,0.22);`;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2.5px solid white;
      ${ring}
      display:flex;align-items:center;justify-content:center;
      font-size:${isActive ? 14 : 9}px;font-weight:800;color:white;
      cursor:pointer;
    ">${isActive ? "★" : ""}</div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function LeafletMap({
  markers      = [],
  onMarkerClick,
  center,
  zoom         = 11,
  height       = "340px",
  radiusKm     = null,   // draw circle + zoom to it
  radiusCenter = null,   // {lat, lng} center of circle
}) {
  const elRef       = useRef(null);
  const mapRef      = useRef(null);
  const layerGroup  = useRef(null);
  const circleLayer = useRef(null); // separate layer for radius circle

  // ── One-time init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!elRef.current) return;
    const tid = setTimeout(() => {
      if (mapRef.current) return;
      const map = L.map(elRef.current, {
        zoomControl: true, scrollWheelZoom: false, attributionControl: false,
      }).setView(center || [39.47, -0.38], zoom);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      L.control.attribution({ prefix: false }).addAttribution('© <a href="https://carto.com">CARTO</a>').addTo(map);

      layerGroup.current  = L.layerGroup().addTo(map);
      circleLayer.current = L.layerGroup().addTo(map);
      mapRef.current      = map;
      map.invalidateSize();
    }, 60);

    return () => {
      clearTimeout(tid);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; layerGroup.current = null; circleLayer.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-draw markers ───────────────────────────────────────────────────────
  useEffect(() => {
    let attempts = 0;
    const draw = () => {
      if (!mapRef.current || !layerGroup.current) {
        if (++attempts < 20) setTimeout(draw, 80);
        return;
      }
      const map   = mapRef.current;
      const group = layerGroup.current;
      group.clearLayers();

      const valid = markers.filter(m => m.lat && m.lng);
      valid.forEach(m => {
        const isActive = !!m.active;
        const color    = isActive ? "#C9A84C" : (m.color || "#2563EB");
        const size     = isActive ? 36 : 26;
        const marker   = L.marker([m.lat, m.lng], {
          icon: makeIcon(color, size, isActive),
          zIndexOffset: isActive ? 1000 : 0,
        });
        marker.bindTooltip(
          `<div style="font-weight:700;font-size:12px;color:#1A1A2E;white-space:nowrap">${m.label || ""}</div>` +
          (m.sublabel ? `<div style="font-size:11px;color:#6B7280;margin-top:2px">${m.sublabel}</div>` : ""),
          { permanent: false, direction: "top", offset: [0, -(size / 2 + 4)], className: "vd-tip", opacity: 1 }
        );
        marker.on("click", () => onMarkerClick && onMarkerClick(m.id));
        group.addLayer(marker);
      });

      // Fit/center on markers
      if (valid.length > 1) {
        // Only auto-fit if no radius (radius effect handles zoom)
        if (!radiusKm) {
          try { map.fitBounds(valid.map(m => [m.lat, m.lng]), { padding: [40, 40], maxZoom: 14, animate: false }); } catch {}
        }
      } else if (valid.length === 1) {
        // Always center on single result, zoom in tightly
        map.setView([valid[0].lat, valid[0].lng], 14, { animate: true });
      }
      map.invalidateSize();
    };
    draw();
  }, [markers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Radius circle + zoom ─────────────────────────────────────────────────
  useEffect(() => {
    let attempts = 0;
    const draw = () => {
      if (!mapRef.current || !circleLayer.current) {
        if (++attempts < 20) setTimeout(draw, 80);
        return;
      }
      const map = mapRef.current;
      circleLayer.current.clearLayers();

      if (radiusKm && radiusCenter?.lat && radiusCenter?.lng) {
        const c = [radiusCenter.lat, radiusCenter.lng];
        // Draw circle
        L.circle(c, {
          radius:      radiusKm * 1000,
          color:       "#C9A84C",
          weight:      2,
          opacity:     0.7,
          fillColor:   "#C9A84C",
          fillOpacity: 0.08,
        }).addTo(circleLayer.current);
        // Center dot
        L.circleMarker(c, {
          radius: 5, color: "#C9A84C", fillColor: "#C9A84C", fillOpacity: 1, weight: 2,
        }).addTo(circleLayer.current);
        // Zoom map to fit circle bounds
        try {
          map.fitBounds(
            L.circle(c, { radius: radiusKm * 1000 }).getBounds(),
            { padding: [30, 30], animate: true }
          );
        } catch {}
      }
    };
    draw();
  }, [radiusKm, radiusCenter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{`
        .vd-tip {
          background: white !important; border: 1px solid #E4E0D8 !important;
          border-radius: 8px !important; padding: 7px 12px !important;
          box-shadow: 0 4px 14px rgba(0,0,0,0.10) !important;
          font-family: 'Inter', sans-serif !important;
        }
        .vd-tip::before { display: none !important; }
        .leaflet-container { font-family: 'Inter', sans-serif !important; }
      `}</style>
      <div style={{
        borderRadius: 12, overflow: "hidden",
        border: "1px solid #E4E0D8",
        boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
        height, background: "#f0ede6",
      }}>
        <div ref={elRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </>
  );
}
