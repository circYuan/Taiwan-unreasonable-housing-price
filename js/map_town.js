const colors = ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#3182bd", "#08519c"];

function townKey(props) {
  return ((props.COUNTYNAME ?? "") + (props.TOWNNAME ?? "")).trim();
}

function computeQuantileThresholds(values) {
  const qs = [1/7, 2/7, 3/7, 4/7, 5/7, 6/7];
  return qs.map(p => values[Math.floor(p * (values.length - 1))]);
}

function colorFor(v, thresholds) {
  if (v == null) return "#eee";
  if (v < thresholds[0]) return colors[0];
  if (v < thresholds[1]) return colors[1];
  if (v < thresholds[2]) return colors[2];
  if (v < thresholds[3]) return colors[3];
  if (v < thresholds[4]) return colors[4];
  if (v < thresholds[5]) return colors[5];
  return colors[6];
}

export function createMap(containerId) {
  return L.map(containerId, { attributionControl: false, zoomControl: true });
}

export function renderTownLayer({ map, geoData, statsQ, metric, countyName, onHoverFeature, onLeave }) {
  map.eachLayer((l) => { if (l instanceof L.GeoJSON) map.removeLayer(l); });

  let selectedLayer = null;

  // 只留該縣市的 features
  const filtered = {
    ...geoData,
    features: (geoData.features || []).filter(f => (f.properties?.COUNTYNAME ?? "") === countyName)
  };

  // 用該縣市資料算分位數門檻（樣本>=10）
  const values = Object.entries(statsQ)
    .filter(([k, r]) => k.startsWith(countyName) && (r.count ?? 0) >= 10 && r[metric] != null)
    .map(([_, r]) => r[metric])
    .sort((a, b) => a - b);

  const thresholds = values.length >= 7 ? computeQuantileThresholds(values) : null;

  const layer = L.geoJSON(filtered, {
    style: (feature) => {
      const key = townKey(feature.properties || {});
      const rec = statsQ[key];
      const ok = rec && (rec.count ?? 0) >= 10;
      const v = rec ? rec[metric] : null;

      return {
        color: "#000",
        weight: 1,
        fillColor: ok && thresholds ? colorFor(v, thresholds) : "#eee",
        fillOpacity: ok && thresholds ? 0.78 : 0.25
      };
    },
    onEachFeature: (feature, lyr) => {
      lyr.on("mouseover", () => {
        if (selectedLayer && selectedLayer === lyr) return;
        lyr.setStyle({ weight: 2 });
        lyr.bringToFront();
        onHoverFeature?.(feature);
      });

      lyr.on("mouseout", () => {
        if (selectedLayer && selectedLayer === lyr) return;
        layer.resetStyle(lyr);
        onLeave?.();
      });

      lyr.on("click", () => {
        if (selectedLayer && selectedLayer !== lyr) layer.resetStyle(selectedLayer);
        selectedLayer = lyr;
        lyr.setStyle({ weight: 3 });
        lyr.bringToFront();
        onHoverFeature?.(feature);
      });
    }
  }).addTo(map);

  return { layer, thresholds };
}

