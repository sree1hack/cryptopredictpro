import os
import requests
import pandas as pd
import time
from datetime import datetime

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M1_BASE = os.path.join(BASE_DIR, "milestone-1")
M2_BASE = os.path.join(BASE_DIR, "milestone-2", "infosys", "cleaned data")
API_BASE = "https://data-api.coindesk.com"
USD_TO_INR = 92.38  # Using a consistent live-ish rate for reconstruction

COINS = {
    "BTC": "BTC-USD",
    "ETH": "ETH-USD",
    "DOGE": "DOGE-USD",
    "LTC": "LTC-USD",
    "DOT": "DOT-USD",
    "MATIC": "MATIC-USD",
    "XRP": "XRP-USD",
    "LINK": "LINK-USD",
    "BCH": "BCH-USD",
    "BNB": "BNB-USD",
    "SOL": "SOL-USD",
    "ADA": "ADA-USD",
    "AVAX": "AVAX-USD"
}

# Mapping for Milestone filenames
FILE_MAP = {
    "BTC": "bitcoin_inr",
    "ETH": "ethereum_inr",
    "DOGE": "dogecoin_inr",
    "LTC": "litecoin_inr",
    "DOT": "polkadot_inr",
    "MATIC": "polygon_inr",
    "XRP": "ripple_inr",
    "LINK": "chainlink_inr",
    "BCH": "bitcoin_cash_inr",
    "BNB": "binance_coin_inr",
    "SOL": "solana_inr",
    "ADA": "cardano_inr",
    "AVAX": "avalanche_inr"
}

def fetch_full_history(coin_symbol, instrument, interval_type):
    endpoint = "hours" if interval_type == "hourly" else "days"
    url = f"{API_BASE}/index/cc/v1/historical/{endpoint}"
    
    all_records = []
    current_to_ts = int(time.time())
    chunk_size = 2000
    
    print(f"🔍 Reconstructing {coin_symbol} {interval_type}...")
    
    while True:
        params = {
            "market": "cadli",
            "instrument": instrument,
            "limit": chunk_size,
            "aggregate": 1,
            "to_ts": current_to_ts
        }
        
        try:
            response = requests.get(url, params=params, timeout=15)
            if response.status_code != 200:
                print(f"  ❌ API Error: {response.status_code}")
                break
                
            data = response.json().get('Data', [])
            if not data:
                break
                
            batch = []
            min_ts = data[0]['TIMESTAMP']
            
            for rec in data:
                ts = int(rec['TIMESTAMP'])
                # Convert to INR and update label
                batch.append({
                    "UNIT": "HOUR" if interval_type == "hourly" else "DAY",
                    "TIMESTAMP": ts,
                    "TYPE": rec.get('TYPE', '267'),
                    "MARKET": rec.get('MARKET', 'cadli'),
                    "INSTRUMENT": f"{coin_symbol}-INR",
                    "OPEN": float(rec['OPEN']) * USD_TO_INR,
                    "HIGH": float(rec['HIGH']) * USD_TO_INR,
                    "LOW": float(rec['LOW']) * USD_TO_INR,
                    "CLOSE": float(rec['CLOSE']) * USD_TO_INR,
                    "DATE": pd.to_datetime(ts, unit='s').strftime('%Y-%m-%d %H:%M:%S' if interval_type == 'hourly' else '%Y-%m-%d')
                })
            
            all_records.extend(batch)
            
            if len(data) < chunk_size:
                print(f"  ✨ Reached the launch of {coin_symbol}!")
                break
            
            current_to_ts = min_ts - 1
            print(f"  ...fetched {len(all_records)} total records (Earliest: {batch[0]['DATE']})")
            time.sleep(0.5) # Be kind to API
            
        except Exception as e:
            print(f"  ❌ Exception: {e}")
            break
            
    if not all_records:
        return None
        
    # Create DataFrame and sort Chronologically (Old to New)
    df = pd.DataFrame(all_records)
    df = df.sort_values(by='TIMESTAMP', ascending=True)
    return df

def save_and_clean(df, coin_symbol, interval_type):
    if df is None: return
    
    prefix = FILE_MAP[coin_symbol]
    # Special case for LINK/BNB M2 naming if needed
    m2_name = f"{prefix}_{interval_type}.csv"
    if coin_symbol == "LINK" and interval_type == "daily":
        m2_name = "chainlink_coin_inr_daily.csv"
    elif coin_symbol == "BNB" and interval_type == "hourly":
        m2_name = "binance_inr_hourly.csv"
    
    # Milestone 1 (Raw)
    m1_folder = os.path.join(M1_BASE, "hourly" if interval_type == "hourly" else "daily")
    os.makedirs(m1_folder, exist_ok=True)
    m1_path = os.path.join(m1_folder, f"{coin_symbol.lower()}_inr_{interval_type}.csv")
    df.to_csv(m1_path, index=False)
    print(f"  ✅ Saved Raw to Milestone 1: {m1_path}")
    
    # Milestone 2 (Cleaned)
    m2_folder = os.path.join(M2_BASE, "hourly" if interval_type == "hourly" else "daily")
    os.makedirs(m2_folder, exist_ok=True)
    m2_path = os.path.join(m2_folder, m2_name)
    
    # Cleaning rule: Prices >= 1 INR
    cleaned_df = df[df['CLOSE'] >= 1]
    cleaned_df.to_csv(m2_path, index=False)
    print(f"  ✅ Saved Cleaned into Milestone 2: {m2_path} ({len(cleaned_df)} rows)")

def run_reconstruction():
    print(f"🚀 Starting Full Historical Reconstruction at {datetime.now()}")
    print("="*60)
    
    # Focus on Daily first as it's faster to verify, then Hourly
    intervals = ["daily", "hourly"]
    
    for interval in intervals:
        for symbol, instrument in COINS.items():
            df = fetch_full_history(symbol, instrument, interval)
            save_and_clean(df, symbol, interval)
            print("-" * 30)

    print("="*60)
    print("🎯 RECONSTRUCTION COMPLETE.")

if __name__ == "__main__":
    run_reconstruction()
