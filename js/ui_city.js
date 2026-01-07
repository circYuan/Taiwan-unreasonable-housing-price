const elCityTitle = document.getElementById("cityTitle");
const elName = document.getElementById("name");
const elCount = document.getElementById("count");
const elValue = document.getElementById("value");
const elUnit = document.getElementById("unit");

const quarterSel = document.getElementById("quarter");
const metricSel = document.getElementById("metric");

export function setCityTitle(countyName) {
  elCityTitle.textContent = countyName || "縣市";
}

export function initQuarterOptions(statsAll) {
  quarterSel.innerHTML = "";
  const qs = statsAll.quarters || [];
  qs.forEach((q) => {
    const opt = document.createElement("option");
    opt.value = q;
    opt.textContent = q;
    quarterSel.appendChild(opt);
  });
  if (qs.length) quarterSel.value = qs[qs.length - 1];
}

export function getSelections() {
  return { quarter: quarterSel.value, metric: metricSel.value };
}

export function bindUi(onChange) {
  quarterSel.addEventListener("change", onChange);
  metricSel.addEventListener("change", onChange);
}

function townKey(props) {
  return ((props.COUNTYNAME ?? "") + (props.TOWNNAME ?? "")).trim();
}
function label(props) {
  return ((props.COUNTYNAME ?? "") + " " + (props.TOWNNAME ?? "")).trim() || "（未知）";
}
function fmtWan(td) {
  if (td == null) return "—";
  return Math.round(td / 10000).toLocaleString("zh-Hant-TW") + " 萬";
}
function fmtPing(v) {
  if (v == null) return "—";
  return Math.round(v).toLocaleString("zh-Hant-TW") + " 元/坪";
}

export function setEmptyPanel() {
  elName.textContent = "（滑鼠移上去）";
  elCount.textContent = "—";
  elValue.textContent = "—";
  elUnit.textContent = "";
}

export function setHoverPanel(feature, statsQ, metric) {
  const props = feature?.properties || {};
  const key = townKey(props);
  const rec = statsQ[key];

  elName.textContent = label(props);
  elCount.textContent = rec?.count ?? "—";

  if (!rec) {
    elValue.textContent = "—";
    elUnit.textContent = "";
    return;
  }

  if (metric === "median_total_price") {
    elValue.textContent = `總價中位數：${fmtWan(rec.median_total_price)}`;
    elUnit.textContent = "（單位：萬元）";
  } else {
    elValue.textContent = `單價中位數：${fmtPing(rec.median_unit_price_ping)}`;
    elUnit.textContent = "（單位：元/坪）";
  }
}

