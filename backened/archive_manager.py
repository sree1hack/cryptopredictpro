import os
import pandas as pd
from datetime import datetime

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE_DATA_BASE = os.path.join(BASE_DIR, "live_data")
MILESTONE_BASE = os.path.join(BASE_DIR, "milestone-2", "infosys", "cleaned data")

# Mapping between live short names and milestone long names
NAME_MAP = {
    "btc": "bitcoin",
    "eth": "ethereum",
    "doge": "dogecoin",
    "ltc": "litecoin",
    "dot": "polkadot",
    "polygon": "polygon",
    "ripple": "ripple",
    "bch": "bitcoin_cash",
    "bnb": "binance_coin",
    "link_daily": "chainlink_coin",
    "link_hourly": "chainlink"
}

def archive_coin_data(coin_short, interval_type):
    """Merges live_data CSV into milestone-2 CSV for a specific coin and interval."""
    # Resolve Milestone filename
    m2_prefix = NAME_MAP.get(coin_short, coin_short)
    if coin_short == "link":
        m2_prefix = NAME_MAP["link_hourly" if interval_type == "hourly" else "link_daily"]
    elif coin_short == "bnb":
        m2_prefix = "binance" if interval_type == "hourly" else "binance_coin"
    
    m2_filename = f"{m2_prefix}_inr_{interval_type}.csv"
    m2_path = os.path.join(MILESTONE_BASE, interval_type, m2_filename)
    
    # Resolve Live filename
    live_filename = f"{coin_short}_inr_{interval_type}.csv"
    live_path = os.path.join(LIVE_DATA_BASE, interval_type, live_filename)
    
    if not os.path.exists(live_path):
        return f"⚠️ Skip: Live data for {coin_short} ({interval_type}) not found."
    
    if not os.path.exists(m2_path):
        return f"⚠️ Skip: Milestone target {m2_filename} not found."

    try:
        # Load both datasets
        df_live = pd.read_csv(live_path)
        df_m2 = pd.read_csv(m2_path)
        
        # Merge and deduplicate
        initial_len = len(df_m2)
        combined = pd.concat([df_m2, df_live], ignore_index=True)
        # Assuming TIMESTAMP is the unique key
        combined = combined.drop_duplicates(subset=['TIMESTAMP'], keep='last')
        combined = combined.sort_values(by='TIMESTAMP')
        
        final_len = len(combined)
        added = final_len - initial_len
        
        if added > 0:
            # Create a backup before overwriting
            backup_path = m2_path + ".bak"
            if not os.path.exists(backup_path):
                import shutil
                shutil.copy2(m2_path, backup_path)
                
            combined.to_csv(m2_path, index=False)
            return f"✅ Archived {added} new records for {m2_prefix} ({interval_type})."
        else:
            return f"ℹ️ {m2_prefix} ({interval_type}) is already up to date."

    except Exception as e:
        return f"❌ Error archiving {coin_short} ({interval_type}): {e}"

def run_archiving():
    print(f"📦 Starting Data Archiving Process at {datetime.now()}")
    print("-" * 50)
    
    coins = ["btc", "eth", "doge", "ltc", "dot", "polygon", "ripple", "bch", "bnb", "link"]
    intervals = ["hourly", "daily"]
    
    for interval in intervals:
        for coin in coins:
            result = archive_coin_data(coin, interval)
            print(result)
            
    print("-" * 50)
    print("🎯 Archiving complete.")

if __name__ == "__main__":
    run_archiving()
