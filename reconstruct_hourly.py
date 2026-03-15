import requests
import pandas as pd
import time
import os
import sys

# from utils.exchange_rate import get_usd_to_inr

# Ensure UTF-8 output on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Configuration
COINS = {
    "BTC": {"instrument": "BTC-INR", "m1_name": "btc_inr_hourly.csv", "m2_name": "bitcoin_inr_hourly.csv"},
    "ETH": {"instrument": "ETH-INR", "m1_name": "eth_inr_hourly.csv", "m2_name": "ethereum_inr_hourly.csv"},
    "DOGE": {"instrument": "DOGE-INR", "m1_name": "doge_inr_hourly.csv", "m2_name": "dogecoin_inr_hourly.csv"},
    "LTC": {"instrument": "LTC-INR", "m1_name": "ltc_inr_hourly.csv", "m2_name": "litecoin_inr_hourly.csv"},
    "DOT": {"instrument": "DOT-INR", "m1_name": "dot_inr_hourly.csv", "m2_name": "polkadot_inr_hourly.csv"},
    "MATIC": {"instrument": "MATIC-INR", "m1_name": "polygon_inr_hourly.csv", "m2_name": "polygon_inr_hourly.csv"},
    "XRP": {"instrument": "XRP-INR", "m1_name": "ripple_inr_hourly.csv", "m2_name": "ripple_inr_hourly.csv"},
    "LINK": {"instrument": "LINK-INR", "m1_name": "link_inr_hourly.csv", "m2_name": "chainlink_inr_hourly.csv"},
    "BCH": {"instrument": "BCH-INR", "m1_name": "bch_inr_hourly.csv", "m2_name": "bitcoin_cash_inr_hourly.csv"},
    "BNB": {"instrument": "BNB-INR", "m1_name": "bnb_inr_hourly.csv", "m2_name": "binance_inr_hourly.csv"},
    "SOL": {"instrument": "SOL-INR", "m1_name": "sol_inr_hourly.csv", "m2_name": "solana_inr_hourly.csv"},
    "ADA": {"instrument": "ADA-INR", "m1_name": "ada_inr_hourly.csv", "m2_name": "cardano_inr_hourly.csv"},
    "AVAX": {"instrument": "AVAX-INR", "m1_name": "avax_inr_hourly.csv", "m2_name": "avalanche_inr_hourly.csv"},
}

MARKET = "cadli"
# USD_TO_INR = 87.43  # Removed static rate
API_KEY = "0f4bf6167c05f388a4a22bb9bbd9e546cf9ef08c3556ee3dd97626292f84dbdf"
BATCH_LIMIT = 2000

M1_DIR = "milestone-1/hourly"
M2_DIR = "milestone-2/infosys/cleaned data/hourly"

def fetch_coin_hourly(symbol, config):
    print(f"\n--- Processing {symbol} ---")
    instrument = config["instrument"]
    m1_path = os.path.join(M1_DIR, config["m1_name"])
    m2_path = os.path.join(M2_DIR, config["m2_name"])
    
    # Ensure directories exist
    os.makedirs(M1_DIR, exist_ok=True)
    os.makedirs(M2_DIR, exist_ok=True)

    all_data = []
    to_ts = int(time.time())
    
    while True:
        print(f"Fetching {symbol} ending at {to_ts}...")
        response = requests.get(
            'https://data-api.coindesk.com/index/cc/v1/historical/hours',
            params={
                "market": MARKET,
                "instrument": instrument,
                "aggregate": 1,
                "fill": "true",
                "apply_mapping": "true",
                "response_format": "JSON",
                "limit": BATCH_LIMIT,
                "to_ts": to_ts,
                "api_key": API_KEY
            },
            headers={"Content-type": "application/json; charset=UTF-8"}
        )
        
        if response.status_code != 200:
            print(f"Error fetching data: {response.status_code}")
            break
            
        json_resp = response.json()
        data_block = []
        if "Data" in json_resp:
            data_block = json_resp["Data"].get("Data", json_resp["Data"]) if isinstance(json_resp["Data"], dict) else json_resp["Data"]
        elif "data" in json_resp:
            data_block = json_resp["data"]
            
        if not data_block:
            print(f"No more data for {symbol}.")
            break
            
        df_batch = pd.DataFrame(data_block)
        all_data.append(df_batch)
        
        earliest_ts = df_batch["TIMESTAMP"].min()
        if earliest_ts >= to_ts:
            break
        to_ts = earliest_ts - 1
        time.sleep(0.5)

    if not all_data:
        print(f"No data collected for {symbol}.")
        return

    df = pd.concat(all_data).drop_duplicates(subset=["TIMESTAMP"]).sort_values("TIMESTAMP")
    
    # Milestone 1: Raw-ish but with INR prices
    df_m1 = df.copy()
    df_m1["INSTRUMENT"] = symbol + "-INR"
    df_m1["DATE"] = pd.to_datetime(df_m1["TIMESTAMP"], unit="s")
    
    # Milestone 1 expected columns (based on daily.py)
    # [UNIT, TIMESTAMP, TYPE, MARKET, INSTRUMENT, OPEN, HIGH, LOW, CLOSE, DATE]
    m1_cols = ["UNIT", "TIMESTAMP", "TYPE", "MARKET", "INSTRUMENT", "OPEN", "HIGH", "LOW", "CLOSE", "DATE"]
    df_m1 = df_m1[[c for c in m1_cols if c in df_m1.columns]]
    df_m1.to_csv(m1_path, index=False)
    print(f"Saved {len(df_m1)} rows to {m1_path}")

    # Milestone 2: Cleaned
    df_m2 = df.copy()
    df_m2["INSTRUMENT"] = symbol + "-INR"
    
    # Milestone 2 formatting (based on hourly.py in M2)
    # [TIMESTAMP, INSTRUMENT, OPEN, HIGH, LOW, CLOSE, VOLUME, DATE_UTC, DATE_IST]
    df_m2["DATE_UTC"] = pd.to_datetime(df_m2["TIMESTAMP"], unit="s", utc=True)
    df_m2["DATE_IST"] = df_m2["DATE_UTC"].dt.tz_convert("Asia/Kolkata")
    
    m2_cols = ["TIMESTAMP", "INSTRUMENT", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME", "DATE_UTC", "DATE_IST"]
    df_m2 = df_m2[[c for c in m2_cols if c in df_m2.columns]]
    
    # Filter Price >= 1 INR (as per user rule in task.md)
    df_m2 = df_m2[df_m2["CLOSE"] >= 1]
    
    df_m2.to_csv(m2_path, index=False)
    print(f"Saved {len(df_m2)} rows to {m2_path}")

if __name__ == "__main__":
    # If arguments provided, process only those coins
    selected_coins = sys.argv[1:] if len(sys.argv) > 1 else COINS.keys()
    
    for coin in selected_coins:
        if coin in COINS:
            try:
                fetch_coin_hourly(coin, COINS[coin])
            except KeyboardInterrupt:
                print(f"\nStopped by user during {coin} processing.")
                sys.exit(0)
            except Exception as e:
                print(f"Error processing {coin}: {e}")
        else:
            print(f"Unknown coin: {coin}")
