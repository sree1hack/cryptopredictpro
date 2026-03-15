import pandas as pd
import os
from pathlib import Path

# Paths configuration
BASE_DIR = Path(__file__).resolve().parents[1]
DIRS_TO_MERGE = [
    {
        "input": BASE_DIR / "milestone-1" / "hourly",
        "output": BASE_DIR / "milestone-1" / "hourly" / "all_crypto_inr_hourly_merged.csv",
        "suffix": "_hourly.csv",
        "unit": "HOUR"
    },
    {
        "input": BASE_DIR / "milestone-1" / "daily",
        "output": BASE_DIR / "milestone-1" / "daily" / "all_crypto_inr_daily_merged.csv",
        "suffix": "_daily.csv",
        "unit": "DAY"
    },
    {
        "input": BASE_DIR / "milestone-2" / "infosys" / "cleaned data" / "hourly",
        "output": BASE_DIR / "milestone-2" / "infosys" / "cleaned data" / "hourly" / "all_crypto_inr_hourly_merged.csv",
        "suffix": "_hourly.csv",
        "unit": "HOUR"
    },
    {
        "input": BASE_DIR / "milestone-2" / "infosys" / "cleaned data" / "daily",
        "output": BASE_DIR / "milestone-2" / "infosys" / "cleaned data" / "daily" / "all_crypto_inr_daily_merged.csv",
        "suffix": "_daily.csv",
        "unit": "DAY"
    }
]

# Coin name cleanup mapping if needed
COIN_MAP = {
    "solana": "SOL",
    "cardano": "ADA",
    "avalanche": "AVAX",
    "bitcoin": "BTC",
    "ethereum": "ETH",
    "dogecoin": "DOGE",
    "litecoin": "LTC",
    "polkadot": "DOT",
    "polygon": "MATIC",
    "ripple": "XRP",
    "bitcoin_cash": "BCH",
    "binance": "BNB",
    "chainlink": "LINK"
}

def merge_directory(config):
    input_dir = config["input"]
    output_path = config["output"]
    suffix = config["suffix"]
    unit = config["unit"]

    print(f"--- Merging {input_dir} ---")
    
    csv_files = [f for f in os.listdir(input_dir) if f.endswith(suffix) and "merged" not in f]
    
    if not csv_files:
        print(f"No matching files found in {input_dir}")
        return

    all_dfs = []
    for f in csv_files:
        path = input_dir / f
        df = pd.read_csv(path)
        
        # Extract coin symbol
        raw_name = f.replace(suffix, "").replace("_inr", "")
        # Get standardized symbol
        symbol = COIN_MAP.get(raw_name.lower(), raw_name.upper())
        
        # Ensure INSTRUMENT is COIN-INR
        df["INSTRUMENT"] = f"{symbol}-INR"
        
        # Add Cryptocurrency column if missing (standard for dashboard)
        df["Cryptocurrency"] = symbol
        
        # Ensure unit is correct
        if "UNIT" in df.columns:
            df["UNIT"] = unit
            
        all_dfs.append(df)
        print(f"  Added {f} ({len(df)} rows)")

    if not all_dfs:
        return

    merged_df = pd.concat(all_dfs, ignore_index=True)
    
    # Sort chronologically
    if "TIMESTAMP" in merged_df.columns:
        merged_df.sort_values(by=["TIMESTAMP", "Cryptocurrency"], inplace=True)
    elif "DATE" in merged_df.columns:
        # Attempt to parse DATE
        merged_df["DATE_DT"] = pd.to_datetime(merged_df["DATE"], errors='coerce')
        merged_df.sort_values(by=["DATE_DT", "Cryptocurrency"], inplace=True)
        merged_df.drop(columns=["DATE_DT"], inplace=True)

    # Save
    merged_df.to_csv(output_path, index=False)
    print(f"✅ Saved merged file: {output_path} ({len(merged_df)} total rows)")

def main():
    for config in DIRS_TO_MERGE:
        merge_directory(config)

if __name__ == "__main__":
    main()
