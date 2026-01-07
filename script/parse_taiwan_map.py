import geopandas as gpd

gdf = gpd.read_file("./taiwan-map-data/TOWN_MOI_1140318.shp")

# 只留必要欄位（檔案會小很多）
gdf = gdf[["TOWNCODE", "COUNTYNAME", "TOWNNAME", "geometry"]].copy()
gdf["admin_key"] = gdf["COUNTYNAME"] + gdf["TOWNNAME"]

# 統一成 WGS84，前端好用
gdf = gdf.to_crs(epsg=4326)

# ⚠️ 簡化（先轉投影座標再 simplify）
gdf_3857 = gdf.to_crs(epsg=3857)
gdf_3857["geometry"] = gdf_3857["geometry"].simplify(
    tolerance=300,  # 公尺；300~800 常見
    preserve_topology=True
)
gdf = gdf_3857.to_crs(epsg=4326)

gdf.to_file("taiwan_town_simplified.geojson", driver="GeoJSON")
