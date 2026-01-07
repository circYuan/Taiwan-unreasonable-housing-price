const legendEl = document.getElementById("legend");
const colors = ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#3182bd", "#08519c"];

function fmt(metric, x) {
  if (metric === "median_total_price") return Math.round(x / 10000).toLocaleString("zh-Hant-TW") + "萬";
  return Math.round(x).toLocaleString("zh-Hant-TW");
}

export function renderLegend({ thresholds, metric }) {
  if (!legendEl) return;
  if (!thresholds || thresholds.length !== 6) {
    legendEl.innerHTML = `<div style="font-weight:700;">沒有足夠資料產生圖例</div>`;
    return;
  }

  const labels = [];
  labels.push(`< ${fmt(metric, thresholds[0])}`);
  for (let i = 0; i < 5; i++) labels.push(`${fmt(metric, thresholds[i])}–${fmt(metric, thresholds[i + 1])}`);
  labels.push(`≥ ${fmt(metric, thresholds[5])}`);

  const title = metric === "median_total_price"
    ? "總價中位數（分位數分級）"
    : "單價中位數（元/坪，分位數分級）";

  legendEl.innerHTML = `
    <div style="font-weight:700; margin-bottom:6px;">${title}</div>
    ${labels.map((lab, i) => `
      <div class="legend-item">
        <span class="swatch" style="background:${colors[i]}"></span>
        <span>${lab}</span>
      </div>
    `).join("")}
    <div class="muted" style="margin-top:8px;">樣本數 < 10：淡灰顯示</div>
  `;
}

