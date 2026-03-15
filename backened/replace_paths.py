import sys
import os

app_path = 'e:/projects/Cryptocurrency Price Forecasting Platform/backened/app.py'

with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """        # Data source selection (local sync CSV)
        folder = HOURLY_PATH if timeframe == "hourly" else DAILY_PATH
        file_prefix = FILE_MAP.get(coin.upper(), coin.lower() + "_inr")
        filename = f"{file_prefix}_{timeframe}.csv"
        file_path = os.path.join(folder, filename)"""

repl = """        # Data source selection (M2 Cleaned CSV)
        M2_HOURLY_PATH = os.path.join(BASE_DIR, "milestone-2", "infosys", "cleaned data", "hourly")
        M2_DAILY_PATH = os.path.join(BASE_DIR, "milestone-2", "infosys", "cleaned data", "daily")
        
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

        folder = M2_HOURLY_PATH if timeframe == "hourly" else M2_DAILY_PATH
        coin_upper = coin.upper()
        if coin_upper in M2_COIN_FILES:
            filename = M2_COIN_FILES[coin_upper][timeframe]
        else:
            return jsonify({"error": f"Invalid coin: {coin}"}), 400
            
        file_path = os.path.join(folder, filename)"""

if target in content:
    content = content.replace(target, repl)
    with open(app_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found. Looking for lines...")
    with open(app_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if '# Data source selection' in line:
                print(f"Line {i}: {repr(line)}")
