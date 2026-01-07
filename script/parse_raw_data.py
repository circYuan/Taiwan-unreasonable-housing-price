#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
從「季度資料夾」內的多縣市 CSV（檔名以縣市代碼開頭，如 a_lvr_land_a.csv）彙整出：
- 每季度 × 每行政區（COUNTYNAME+TOWNNAME）的
  - 總價中位數（median_total_price，元）
  - 單價中位數（median_unit_price_ping，元/坪）
  - 樣本數（count）

並輸出一個前端好用的 JSON：stats_by_town_quarter.json

特色：
- 季度由資料夾名稱決定（例如 2025-q4 → 2025Q4），不再用交易日期分季
- CSV 第二行英文說明自動跳過（skiprows=[1]）
- 新竹市特例：若 CSV 沒有分區（只有「新竹市」或空），會用「市級統計」填入 東區/北區/香山區
"""

from __future__ import annotations
import json
import re
from pathlib import Path

import pandas as pd

# ====== 你需要改的地方（通常只有這裡） ======
BASE_DIR = Path("./land-data")                 # 放季度資料夾的上層資料夾，例如 data/2025-q4/*.csv
OUT_JSON = Path("stats_by_town_quarter.json")

# 縣市代碼（檔名第一個字母）→ 縣市中文名
CITY_CODE_MAP = {
    "a": "臺北市",
    "b": "臺中市",
    "c": "基隆市",
    "d": "臺南市",
    "e": "高雄市",
    "f": "新北市",
    "g": "宜蘭縣",
    "h": "桃園市",
    "i": "嘉義市",
    "j": "新竹縣",
    "k": "苗栗縣",
    "m": "南投縣",
    "n": "彰化縣",
    "o": "新竹市",
    "p": "雲林縣",
    "q": "嘉義縣",
    "t": "屏東縣",
    "u": "花蓮縣",
    "v": "臺東縣",
    "w": "金門縣",
    "x": "澎湖縣",
    "z": "連江縣",
}

# 「市級」資料要灌到哪些行政區（目前只針對新竹市）
CITY_WIDE_TO_DISTRICTS = {
    "新竹市": ["東區", "北區", "香山區"],
}

# 清洗門檻（你可以依需求調整）
MIN_TOTAL_PRICE = 1_000_000
MIN_UNIT_PRICE_PING = 50_000
MAX_UNIT_PRICE_PING = 5_000_000
MIN_SAMPLE_COUNT = 1  # 彙整時不過濾；前端可用 count < 10 淡化
# ==========================================


def folder_to_quarter(folder_name: str) -> str:
    """
    解析季度資料夾名稱：'2025-q4' -> '2025Q4'
    """
    m = re.match(r"^(\d{4})-q([1-4])$", folder_name.lower())
    if not m:
        raise ValueError(f"Invalid quarter folder name: {folder_name} (expected like 2025-q4)")
    return f"{m.group(1)}Q{m.group(2)}"


def roc_to_date(s: object) -> pd.Timestamp:
    """
    民國 yyyMMdd（7 碼）→ pandas Timestamp
    e.g. 1140203 -> 2025-02-03
    """
    ss = str(s).strip()
    if len(ss) != 7 or not ss.isdigit():
        return pd.NaT
    y = int(ss[:3]) + 1911
    return pd.to_datetime(f"{y}-{ss[3:5]}-{ss[5:7]}", errors="coerce")


def looks_citywide_no_district(df: pd.DataFrame, city_name: str) -> bool:
    """
    判斷這份 df 的「鄉鎮市區」是否沒有分區資訊（例如整欄都空 / 都寫新竹市）
    """
    if "鄉鎮市區" not in df.columns:
        return False

    s = df["鄉鎮市區"].fillna("").astype(str).str.strip()
    uniq = set(s[s != ""].unique().tolist())

    # 沒有任何有效值
    if len(uniq) == 0:
        return True

    # 全部都等於縣市名（例如：新竹市）
    if uniq == {city_name}:
        return True

    return False


def read_city_csv(csv_path: Path, city_name: str) -> pd.DataFrame:
    """
    讀入一個縣市 CSV，回傳帶有 admin_key、total_price、unit_price_ping 的 DataFrame（已基本清洗）
    """
    df = pd.read_csv(csv_path, skiprows=[1])

    # （可選）用日期做基本合法性過濾，但不用來分季
    if "交易年月日" in df.columns:
        df["trade_date"] = df["交易年月日"].apply(roc_to_date)
        df = df[df["trade_date"].notna()].copy()

    df["COUNTYNAME"] = city_name
    df["TOWNNAME"] = df["鄉鎮市區"].fillna("").astype(str).str.strip()

    # 新竹市特例：若沒有分區，就先把 TOWNNAME 指定成「東區」（之後會整市統計複製到三區）
    if city_name in CITY_WIDE_TO_DISTRICTS and looks_citywide_no_district(df, city_name):
        df["TOWNNAME"] = CITY_WIDE_TO_DISTRICTS[city_name][0]  # 先填東區，方便算一次統計

    df["admin_key"] = df["COUNTYNAME"] + df["TOWNNAME"]

    # 數值欄位
    df["total_price"] = pd.to_numeric(df.get("總價元"), errors="coerce")
    df["unit_price_ping"] = pd.to_numeric(df.get("單價元平方公尺"), errors="coerce") * 3.305785

    # 基本清洗
    df = df[
        (df["total_price"] > MIN_TOTAL_PRICE) &
        (df["unit_price_ping"] > MIN_UNIT_PRICE_PING) &
        (df["unit_price_ping"] < MAX_UNIT_PRICE_PING)
    ].copy()

    return df[["admin_key", "total_price", "unit_price_ping"]]


def replicate_citywide_to_districts(g: pd.DataFrame, city_name: str) -> pd.DataFrame:
    """
    若某縣市是「市級資料」而非分區資料，將該市唯一一筆統計複製到指定的行政區列表。
    目前用於新竹市：東區/北區/香山區
    """
    if city_name not in CITY_WIDE_TO_DISTRICTS:
        return g

    districts = CITY_WIDE_TO_DISTRICTS[city_name]
    prefix = city_name

    # 找出這個縣市的 keys
    keys = g["admin_key"].tolist()
    city_keys = [k for k in keys if k.startswith(prefix)]

    # 若只有一筆 city key，視為市級統計（因為前面已強制指定成東區）
    if len(city_keys) != 1:
        return g

    base_key = city_keys[0]
    base_row = g[g["admin_key"] == base_key].iloc[0].to_dict()

    rows = []
    for d in districts:
        r = dict(base_row)
        r["admin_key"] = city_name + d
        # 可選：標記這是「市級套用」
        r["synthetic"] = True
        rows.append(r)

    return pd.DataFrame(rows)


def main() -> None:
    out = {"quarters": [], "data": {}}

    # 找所有季度資料夾（只接受 YYYY-qN）
    quarter_dirs = sorted(
        [p for p in BASE_DIR.iterdir()
         if p.is_dir() and re.match(r"^\d{4}-q[1-4]$", p.name.lower())]
    )

    if not quarter_dirs:
        raise RuntimeError(f"No quarter folders found under {BASE_DIR} (expected like 2025-q4/)")

    for qdir in quarter_dirs:
        quarter_key = folder_to_quarter(qdir.name)
        print(f"== {quarter_key} from folder: {qdir} ==")

        frames = []
        # 逐縣市 CSV
        for csv_path in sorted(qdir.glob("*_lvr_land_a.csv")):
            city_code = csv_path.name[0].lower()
            city_name = CITY_CODE_MAP.get(city_code)
            if not city_name:
                print(f"  skip unknown city code: {csv_path.name}")
                continue

            print(f"  read {csv_path.name} → {city_name}")
            df_city = read_city_csv(csv_path, city_name)
            if len(df_city) == 0:
                continue

            frames.append(df_city)

        if not frames:
            print(f"  (no usable CSV rows in {qdir})")
            continue

        full = pd.concat(frames, ignore_index=True)

        # 先算所有行政區（包含可能的「新竹市東區（市級套用前）」）
        g = full.groupby(["admin_key"], as_index=False).agg(
            count=("admin_key", "size"),
            median_total_price=("total_price", "median"),
            median_unit_price_ping=("unit_price_ping", "median"),
        )

        # 針對「新竹市市級資料」做複製（若符合條件）
        # 注意：這裡是對整個 g 做處理，因此我們要把新竹市那部分挑出來改，再合回去
        if "新竹市" in CITY_WIDE_TO_DISTRICTS:
            # 分離新竹市與非新竹市
            is_hsinchu = g["admin_key"].str.startswith("新竹市")
            g_h = g[is_hsinchu].copy()
            g_o = g[~is_hsinchu].copy()

            if len(g_h) > 0:
                g_h2 = replicate_citywide_to_districts(g_h, "新竹市")
                # 保險：若 g_h2 有 synthetic 欄位，確保 g_o 也有同欄位（或輸出時忽略）
                g = pd.concat([g_o, g_h2], ignore_index=True)

        # 過濾（通常不必，給前端決定淡化/不畫）
        g = g[g["count"] >= MIN_SAMPLE_COUNT].copy()

        out["quarters"].append(quarter_key)
        out["data"][quarter_key] = {
            row["admin_key"]: {
                "count": int(row["count"]),
                "median_total_price": int(round(row["median_total_price"])),
                "median_unit_price_ping": int(round(row["median_unit_price_ping"])),
                **({"synthetic": True} if ("synthetic" in row and bool(row["synthetic"])) else {}),
            }
            for _, row in g.iterrows()
        }

    out["quarters"] = sorted(out["quarters"])

    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"done → {OUT_JSON} (quarters={len(out['quarters'])})")


if __name__ == "__main__":
    main()

