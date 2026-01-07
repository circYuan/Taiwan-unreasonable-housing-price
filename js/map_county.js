export function createMap(containerId) {
  return L.map(containerId, { attributionControl: false, zoomControl: true });
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

  map.fitBounds(layer.getBounds(), { padding: [10, 10] });
  return layer;
}

