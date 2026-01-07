import geopandas as gpd

gdf = gpd.read_file("taiwan_town_simplified.geojson")
# 依 COUNTYNAME 合併成縣市邊界
county = gdf.dissolve(by="COUNTYNAME", as_index=False)
county = county[["COUNTYNAME", "geometry"]]
county.to_file("taiwan_county_simplified.geojson", driver="GeoJSON")
