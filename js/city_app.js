import { loadGeoJson, loadJson } from "./data.js";
import { createMap, renderTownLayer } from "./map_town.js";
import { renderLegend } from "./legend.js";
import { bindUi, initQuarterOptions, getSelections, setHoverPanel, setEmptyPanel, setCityTitle } from "./ui_city.js";

function getCountyFromQuery() {
  const url = new URL(window.location.href);
  return url.searchParams.get("county") || "";
}

async function main() {
  const countyName = getCountyFromQuery();
  if (!countyName) {
    alert("缺少 county 參數，請從縣市地圖進入。");
    window.location.href = "./index.html";
    return;
  }

  setCityTitle(countyName);

  const map = createMap("map");

  const [geoData, statsAll] = await Promise.all([
    loadGeoJson("./taiwan_town_simplified.geojson"),
    loadJson("./stats_by_town_quarter.json"),
  ]);

  initQuarterOptions(statsAll);

  function redraw() {
    const { quarter, metric } = getSelections();
    const statsQ = statsAll.data?.[quarter] || {};

    const { layer, thresholds } = renderTownLayer({
      map,
      geoData,
      statsQ,
      metric,
      countyName,
      onHoverFeature: (feature) => setHoverPanel(feature, statsQ, metric),
      onLeave: () => setEmptyPanel(),
    });

    renderLegend({ thresholds, metric });
    map.fitBounds(layer.getBounds(), { padding: [10, 10] });
  }

  bindUi(redraw);
  redraw();
}

main().catch(err => {
  console.error(err);
  alert("初始化失敗：\n" + err.message);
});

