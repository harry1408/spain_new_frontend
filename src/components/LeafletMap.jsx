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

export const TILE_STYLES = {
  voyager: { url:"https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",    attr:"© CARTO",         label:"Standard" },
  street:  { url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", attr:"© Esri", label:"Street" },
  light:   { url:"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",              attr:"© CARTO",         label:"Light"    },
  satellite:{ url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",   attr:"© Esri",  label:"Satellite"},
};

export default function LeafletMap({
  markers      = [],
  onMarkerClick,
  center,
  zoom         = 11,
  height       = "340px",
  radiusKm     = null,
  radiusCenter = null,
  tileStyle    = "voyager",
}) {
  const elRef        = useRef(null);
  const mapRef       = useRef(null);
  const layerGroup   = useRef(null);
  const tileLayerRef = useRef(null);
  const circleLayer  = useRef(null);
  const radiusKmRef   = useRef(radiusKm);     // always current value
  const radiusCtrRef  = useRef(radiusCenter); // always current value
  const tileStyleRef   = useRef(tileStyle);    // always current value
  const tileInitedRef  = useRef(false);        // skip first swap (init handles it)

  // Keep refs in sync
  radiusKmRef.current  = radiusKm;
  radiusCtrRef.current = radiusCenter;
  tileStyleRef.current = tileStyle;

  // ── One-time init ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!elRef.current) return;
    const tid = setTimeout(() => {
      if (mapRef.current) return;
      const initCenter = (radiusCtrRef.current?.lat && radiusKmRef.current)
        ? [radiusCtrRef.current.lat, radiusCtrRef.current.lng]
        : (center || [39.47, -0.38]);
      const map = L.map(elRef.current, {
        zoomControl: true, scrollWheelZoom: false, attributionControl: false,
      }).setView(initCenter, zoom);
      const style = TILE_STYLES[tileStyleRef.current] || TILE_STYLES.voyager;
      tileLayerRef.current = L.tileLayer(style.url, { maxZoom: 19 }).addTo(map);
      L.control.attribution({ prefix: false }).addAttribution(style.attr).addTo(map);
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

  // ── Re-center when center prop changes (e.g. street preview) ─────────────
  useEffect(() => {
    if (!center) return;
    // Skip plain setView when radius is active — radius effect handles fitBounds
    if (radiusKmRef.current && radiusCtrRef.current?.lat) return;
    let attempts = 0;
    const pan = () => {
      if (!mapRef.current) { if (++attempts < 20) setTimeout(pan, 80); return; }
      // Re-check inside callback — radius may have been set by the time map is ready
      if (radiusKmRef.current && radiusCtrRef.current?.lat) return;
      mapRef.current.setView(center, zoom, { animate: true });
    };
    pan();
  }, [center, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const color    = isActive ? "#0B1239" : (m.color || "#2D3F8F");
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

      // Use ref so this always reads the live radiusKm value
      const rKm  = radiusKmRef.current;
      const rCtr = radiusCtrRef.current;

      if (rKm && rCtr?.lat && rCtr?.lng) {
        // Radius active — fit to circle (don't fit to markers)
        try {
          const c      = [rCtr.lat, rCtr.lng];
          const rM     = rKm * 1000;
          const pad    = rKm < 0.5 ? [50, 50] : rKm < 2 ? [40, 40] : [30, 30];
          map.fitBounds(L.circle(c, { radius: rM }).getBounds(), { padding: pad, animate: false });
        } catch {}
      } else if (valid.length > 1) {
        try { map.fitBounds(valid.map(m => [m.lat, m.lng]), { padding: [40, 40], maxZoom: 14, animate: false }); } catch {}
      } else if (valid.length === 1) {
        map.setView([valid[0].lat, valid[0].lng], 14, { animate: true });
      }
      map.invalidateSize();
    };
    draw();
  }, [markers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Swap tile layer when tileStyle prop changes ───────────────────────────
  useEffect(() => {
    if (!tileInitedRef.current) { tileInitedRef.current = true; return; } // init handles first tile
    let attempts = 0;
    const swap = () => {
      if (!mapRef.current) { if (++attempts < 20) setTimeout(swap, 80); return; }
      const style = TILE_STYLES[tileStyle] || TILE_STYLES.voyager;
      if (tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
      }
      tileLayerRef.current = L.tileLayer(style.url, { maxZoom: 19 }).addTo(mapRef.current);
      tileLayerRef.current.bringToBack();
    };
    swap();
  }, [tileStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Radius circle + zoom ──────────────────────────────────────────────────
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
        const c  = [radiusCenter.lat, radiusCenter.lng];
        const rM = radiusKm * 1000;
        L.circle(c, {
          radius: rM, color: "#0B1239", weight: 2, opacity: 0.8,
          fillColor: "#0B1239", fillOpacity: 0.08,
        }).addTo(circleLayer.current);
        L.circleMarker(c, {
          radius: 5, color: "#0B1239", fillColor: "#0B1239", fillOpacity: 1, weight: 2,
        }).addTo(circleLayer.current);
        try {
          const pad = radiusKm < 0.5 ? [50, 50] : radiusKm < 2 ? [40, 40] : [30, 30];
          map.fitBounds(L.circle(c, { radius: rM }).getBounds(), { padding: pad, animate: true });
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
        height, background: "#eeeae3",
      }}>
        <div ref={elRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </>
  );
}
