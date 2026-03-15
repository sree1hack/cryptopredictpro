import os
import shutil

src_base = "e:/projects/Cryptocurrency Price Forecasting Platform/milestone-2/infosys/cleaned data"
dst_base = "e:/projects/Cryptocurrency Price Forecasting Platform/live_data"

M2_COIN_FILES = {
    "BTC": {"daily": "bitcoin_inr_daily.csv", "hourly": "bitcoin_inr_hourly.csv"},
    "ETH": {"daily": "ethereum_inr_daily.csv", "hourly": "ethereum_inr_hourly.csv"},
    "DOGE": {"daily": "dogecoin_inr_daily.csv", "hourly": "dogecoin_inr_hourly.csv"},
    "LTC": {"daily": "litecoin_inr_daily.csv", "hourly": "litecoin_inr_hourly.csv"},
    "DOT": {"daily": "polkadot_inr_daily.csv", "hourly": "polkadot_inr_hourly.csv"},
    "MATIC": {"daily": "polygon_inr_daily.csv", "hourly": "polygon_inr_hourly.csv"},
    "XRP": {"daily": "ripple_inr_daily.csv", "hourly": "ripple_inr_hourly.csv"},
    "LINK": {"daily": "chainlink_coin_inr_daily.csv", "hourly": "chainlink_inr_hourly.csv"},
    "BCH": {"daily": "bitcoin_cash_inr_daily.csv", "hourly": "bitcoin_cash_inr_hourly.csv"},
    "BNB": {"daily": "binance_coin_inr_daily.csv", "hourly": "binance_inr_hourly.csv"}
}

FILE_MAP = {
    "BTC": "btc_inr",
    "ETH": "eth_inr",
    "DOGE": "doge_inr",
    "LTC": "ltc_inr",
    "DOT": "dot_inr",
    "MATIC": "polygon_inr",
    "XRP": "ripple_inr",
    "LINK": "link_inr",
    "BCH": "bch_inr",
    "BNB": "bnb_inr"
}

for coin, m2_files in M2_COIN_FILES.items():
    prefix = FILE_MAP[coin]
    
    # Hourly
    src_h = os.path.join(src_base, "hourly", m2_files["hourly"])
    dst_h = os.path.join(dst_base, "hourly", f"{prefix}_hourly.csv")
    if os.path.exists(src_h):
        shutil.copy2(src_h, dst_h)
        print(f"Copied {src_h} -> {dst_h}")
        
    # Daily
    src_d = os.path.join(src_base, "daily", m2_files["daily"])
    dst_d = os.path.join(dst_base, "daily", f"{prefix}_daily.csv")
    if os.path.exists(src_d):
        shutil.copy2(src_d, dst_d)
        print(f"Copied {src_d} -> {dst_d}")

print("Done copying benchmark data.")
