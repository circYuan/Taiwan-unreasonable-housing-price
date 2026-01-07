export async function loadGeoJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`GeoJSON 讀取失敗: ${r.status}`);
  return await r.json();
}

export async function loadJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`JSON 讀取失敗: ${r.status}`);
  return await r.json();
}

