export function createMap(containerId) {
  return L.map(containerId, {
    attributionControl: false,
    zoomControl: true,
    center: [23.7, 121.0],
    zoom: 8,
    minZoom: 6,
    maxZoom:11
  });
}

export function renderCountyLayer({ map, geoData, onHoverName, onLeave, onClickCounty }) {
  map.eachLayer((l) => { if (l instanceof L.GeoJSON) map.removeLayer(l); });

  let selectedLayer = null;

  const baseStyle = { color: "#000", weight: 1, fillColor: "#fff", fillOpacity: 0.0 };
  const hoverStyle = { weight: 2, fillOpacity: 0.08, fillColor: "#000" };
  const selectedStyle = { weight: 3, fillOpacity: 0.12, fillColor: "#000" };

  const layer = L.geoJSON(geoData, {
    style: () => baseStyle,
    onEachFeature: (feature, lyr) => {
      const name = feature.properties?.COUNTYNAME ?? "（未知）";

      lyr.on("mouseover", () => {
        if (selectedLayer && selectedLayer === lyr) return;
        lyr.setStyle(hoverStyle);
        lyr.bringToFront();
        onHoverName?.(name);
      });

      lyr.on("mouseout", () => {
        if (selectedLayer && selectedLayer === lyr) return;
        lyr.setStyle(baseStyle);
        onLeave?.();
      });

      lyr.on("click", () => {
        if (selectedLayer && selectedLayer !== lyr) selectedLayer.setStyle(baseStyle);
        selectedLayer = lyr;
        lyr.setStyle(selectedStyle);
        lyr.bringToFront();
        onClickCounty?.(name);
      });
    }
  }).addTo(map);

  // ✅ 1) 預設 zoom 到適中（可調 padding 讓台灣不要太小）
  const b = layer.getBounds();

  // ✅ 2) 限制拖曳範圍（台灣 bounds 外不給拖太遠）
  const maxB = b.pad(0.25); // pad 越大越鬆（0.2~0.4 都可）
  map.setMaxBounds(maxB);
  map.options.maxBoundsViscosity = 0.9; // 越接近 1 越拉不出去

  // ✅ 3) 限制縮放：不給縮太遠，也不給放太近
  // 用 fitBounds 後的 zoom 當基準比較穩
  const z = map.getZoom();
  map.setMinZoom(Math.max(2, z - 1));  // 最小縮放：比預設再縮小一點點就停
  map.setMaxZoom(z + 4);               // 最大縮放：預設放大 4 級（你可改 5~6）

  //// ✅ 4) 有些手機/切換版面會需要重算尺寸（避免空白）
  //setTimeout(() => map.invalidateSize(), 0);

  return layer;
}

