import json
import re
from pathlib import Path
import pandas as pd

BASE_DIR = Path("./land-data")
OUT_JSON = Path("stats_by_county_quarter.json")

CITY_CODE_MAP = {
    "a": "臺北市", "b": "臺中市", "c": "基隆市", "d": "臺南市", "e": "高雄市", "f": "新北市",
    "g": "宜蘭縣", "h": "桃園市", "i": "嘉義市", "j": "新竹縣", "k": "苗栗縣",
    "m": "南投縣", "n": "彰化縣", "o": "新竹市", "p": "雲林縣", "q": "嘉義縣",
    "t": "屏東縣", "u": "花蓮縣", "v": "臺東縣", "w": "金門縣", "x": "澎湖縣", "z": "連江縣",
}

MIN_TOTAL_PRICE = 1_000_000
MIN_UNIT_PRICE_PING = 50_000
MAX_UNIT_PRICE_PING = 5_000_000

def folder_to_quarter(name: str) -> str:
    m = re.match(r"^(\d{4})-q([1-4])$", name.lower())
    if not m:
        raise ValueError(f"Invalid quarter folder name: {name} (expected like 2025-q4)")
    return f"{m.group(1)}Q{m.group(2)}"

def roc_to_date(s):
    ss = str(s).strip()
    if len(ss) != 7 or not ss.isdigit():
        return pd.NaT
    y = int(ss[:3]) + 1911
    return pd.to_datetime(f"{y}-{ss[3:5]}-{ss[5:7]}", errors="coerce")

out = {"quarters": [], "data": {}}

quarter_dirs = sorted(
    [p for p in BASE_DIR.iterdir() if p.is_dir() and re.match(r"^\d{4}-q[1-4]$", p.name.lower())]
)

for qdir in quarter_dirs:
    qkey = folder_to_quarter(qdir.name)
    frames = []

    for csv_path in sorted(qdir.glob("*_lvr_land_a.csv")):
        code = csv_path.name[0].lower()
        county = CITY_CODE_MAP.get(code)
        if not county:
            continue

        df = pd.read_csv(csv_path, skiprows=[1])

        if "交易年月日" in df.columns:
            df["trade_date"] = df["交易年月日"].apply(roc_to_date)
            df = df[df["trade_date"].notna()].copy()

        df["COUNTYNAME"] = county
        df["total_price"] = pd.to_numeric(df.get("總價元"), errors="coerce")
        df["unit_price_ping"] = pd.to_numeric(df.get("單價元平方公尺"), errors="coerce") * 3.305785

        df = df[
            (df["total_price"] > MIN_TOTAL_PRICE) &
            (df["unit_price_ping"] > MIN_UNIT_PRICE_PING) &
            (df["unit_price_ping"] < MAX_UNIT_PRICE_PING)
        ][["COUNTYNAME", "total_price", "unit_price_ping"]].copy()

        frames.append(df)

    if not frames:
        continue

    full = pd.concat(frames, ignore_index=True)

    g = full.groupby(["COUNTYNAME"], as_index=False).agg(
        count=("COUNTYNAME", "size"),
        median_total_price=("total_price", "median"),
        median_unit_price_ping=("unit_price_ping", "median"),
    )

    out["quarters"].append(qkey)
    out["data"][qkey] = {
        row["COUNTYNAME"]: {
            "count": int(row["count"]),
            "median_total_price": int(round(row["median_total_price"])),
            "median_unit_price_ping": int(round(row["median_unit_price_ping"])),
        }
        for _, row in g.iterrows()
    }

out["quarters"] = sorted(out["quarters"])
OUT_JSON.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
print(f"done → {OUT_JSON}")

