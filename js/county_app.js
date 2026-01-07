import { loadGeoJson } from "./data.js";
import { createMap, renderCountyLayer } from "./map_county.js";

const elName = document.getElementById("name");

function setName(s) { elName.textContent = s; }

async function main() {
  const map = createMap("map");
  const geo = await loadGeoJson("./taiwan_county_simplified.geojson");

  renderCountyLayer({
    map,
    geoData: geo,
    onHoverName: (name) => setName(name),
    onLeave: () => setName("（滑鼠移上去）"),
    onClickCounty: (name) => {
      // 導到縣市頁（用 query string 帶縣市名）
      const url = new URL("./city.html", window.location.href);
      url.searchParams.set("county", name);
      window.location.href = url.toString();
    }
  });
}

main().catch(err => {
  console.error(err);
  alert("初始化失敗：\n" + err.message);
});

