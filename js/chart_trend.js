let chart = null;

function fmtY(metric, v) {
  if (v == null) return "";
  if (metric === "median_total_price") return (Math.round(v / 10000)).toLocaleString("zh-Hant-TW") + "萬";
  return Math.round(v).toLocaleString("zh-Hant-TW");
}

export function renderTrendChart({ canvasId, quarters, values, metric, highlightQuarter }) {
  const el = document.getElementById(canvasId);
  if (!el) return;

  const title = metric === "median_total_price" ? "總價中位數" : "單價中位數（元/坪）";

  const idx = highlightQuarter ? quarters.indexOf(highlightQuarter) : -1;

  const pointRadius = quarters.map((_, i) => (i === idx ? 5 : 2));
  const pointHoverRadius = 6;

  if (!chart) {
    chart = new Chart(el, {
      type: "line",
      data: {
        labels: quarters,
        datasets: [{
          label: title,
          data: values,
          tension: 0.25,
          pointRadius,
          pointHoverRadius,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${title}：${fmtY(metric, ctx.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: (v) => fmtY(metric, v)
            }
          }
        }
      }
    });
    return;
  }

  // update
  chart.data.labels = quarters;
  chart.data.datasets[0].label = title;
  chart.data.datasets[0].data = values;
  chart.data.datasets[0].pointRadius = pointRadius;
  chart.update();
}

