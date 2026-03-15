import os
import pandas as pd
import requests
import time
from datetime import datetime
from database import get_db_connection

# Configuration
COINDESK_API_BASE = "https://data-api.coindesk.com"

COINS = {
    "BTC": "BTC-INR",
    "ETH": "ETH-INR",
    "DOGE": "DOGE-INR",
    "LTC": "LITECOIN_INR", # Fixed symbol for LTC
    "DOT": "DOT-INR",
    "MATIC": "MATIC-INR",
    "XRP": "XRP-INR",
    "LINK": "LINK-INR",
    "BCH": "BCH-INR",
    "BNB": "BNB-INR",
    "SOL": "SOL-INR",
    "ADA": "ADA-INR",
    "AVAX": "AVAX-INR"
}

def get_last_timestamp(coin, timeframe):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT MAX(timestamp) FROM ohlcv WHERE coin = ? AND timeframe = ?"
        # Check if SQLite or Postgres for param symbol
        if hasattr(cursor, 'description') and not hasattr(cursor, 'cursor_factory'): # SQLite
             cursor.execute(query, (coin, timeframe))
        else:
             cursor.execute(query.replace("?", "%s"), (coin, timeframe))
             
        row = cursor.fetchone()
        if row and row[0]:
            return row[0]
        # Default to last 100 days for new coins so daily models have 100 points
        return int(time.time()) - (86400 * 100)
    finally:
        conn.close()

def sync_coin_data(coin_name, instrument, interval_type):
    timeframe = 'hourly' if interval_type == "hours" else 'daily'
    last_ts = get_last_timestamp(coin_name, timeframe)
    
    print(f"Syncing {coin_name} {timeframe} since {pd.to_datetime(last_ts, unit='s')}...")
    
    current_to_ts = int(time.time())
    chunk_size = 2000
    all_new_records = []
    
    while True:
        url = f"{COINDESK_API_BASE}/index/cc/v1/historical/{interval_type}"
        params = {
            "market": "cadli",
            "instrument": instrument,
            "limit": chunk_size,
            "aggregate": 1,
            "to_ts": current_to_ts
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                break
            
            records = response.json().get('Data', [])
            if not records:
                break
                
            min_batch_ts = records[0]['TIMESTAMP']
            
            for rec in records:
                ts = int(rec['TIMESTAMP'])
                if ts > last_ts:
                    all_new_records.append((
                        coin_name, timeframe, ts,
                        float(rec['OPEN']), float(rec['HIGH']),
                        float(rec['LOW']), float(rec['CLOSE']),
                        pd.to_datetime(ts, unit='s').strftime('%Y-%m-%d %H:%M:%S')
                    ))
            
            if min_batch_ts > last_ts and len(records) == chunk_size:
                current_to_ts = min_batch_ts - 1
                time.sleep(0.5)
            else:
                break
                
        except Exception as e:
            print(f"Exception during batch fetch: {e}")
            break

    if all_new_records:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            # Prepare query for upsert
            is_postgres = hasattr(cursor, 'cursor_factory')
            
            if is_postgres:
                from psycopg2.extras import execute_values
                query = """
                    INSERT INTO ohlcv (coin, timeframe, timestamp, open, high, low, close, date)
                    VALUES %s
                    ON CONFLICT (coin, timeframe, timestamp) DO UPDATE SET
                    open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close
                """
                execute_values(cursor, query, all_new_records)
            else:
                query = """
                    INSERT OR REPLACE INTO ohlcv (coin, timeframe, timestamp, open, high, low, close, date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """
                cursor.executemany(query, all_new_records)
            
            conn.commit()
            print(f"✅ Successfully synced {len(all_new_records)} records for {coin_name} {timeframe}")
        finally:
            conn.close()
    else:
        print(f"No newer data found for {coin_name} {timeframe}")

def run_sync():
    print(f"🚀 Starting Centralized Data Sync Engine at {datetime.now()}")
    for coin, instrument in COINS.items():
        sync_coin_data(coin, instrument, "hours")
        sync_coin_data(coin, instrument, "days")
    print(f"🏁 Sync completed at {datetime.now()}")

if __name__ == "__main__":
    run_sync()
