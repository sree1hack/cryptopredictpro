import requests
import pandas as pd
import time
import sys
import os

# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# from utils.exchange_rate import get_usd_to_inr

# Ensure UTF-8 output on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Configuration
instrument = "MATIC-INR"
market = "cadli"
aggregate = 1
# usd_to_inr = 87.43  # Removed static rate
batch_limit = 2000   # max days per request
api_key = "0f4bf6167c05f388a4a22bb9bbd9e546cf9ef08c3556ee3dd97626292f84dbdf"
output_file = "polygon_inr_daily.csv"

# Start from current timestamp
to_ts = int(time.time())

while True:
    print(f"Fetching daily data ending at timestamp: {to_ts}")

    response = requests.get(
        'https://data-api.coindesk.com/index/cc/v1/historical/days',
        params={
            "market": market,
            "instrument": instrument,
            "aggregate": aggregate,
            "fill": "true",
            "apply_mapping": "true",
            "response_format": "JSON",
            "limit": batch_limit,
            "to_ts": to_ts,
            "api_key": api_key
        },
        headers={"Content-type": "application/json; charset=UTF-8"}
    )

    json_response = response.json()

    # Extract daily data
    if "Data" in json_response:
        data_block = (
            json_response["Data"].get("Data") 
            if isinstance(json_response["Data"], dict) 
            else json_response["Data"]
        )
    elif "data" in json_response:
        data_block = json_response["data"]
    else:
        print("No more data available.")
        break

    if not data_block:
        print("Data block empty. Stopping.")
        break

    df = pd.DataFrame(data_block)
    df = df[["UNIT", "TIMESTAMP", "TYPE", "MARKET", "INSTRUMENT", "OPEN", "HIGH", "LOW", "CLOSE"]]
    df["DATE"] = pd.to_datetime(df["TIMESTAMP"], unit="s")

    # Append to CSV
    df.to_csv(output_file, mode='a', index=False, header=not pd.io.common.file_exists(output_file))
    print(f"Appended {len(df)} rows to {output_file}")

    # Decrement to_ts by the number of days fetched
    earliest_ts = df["TIMESTAMP"].min()
    if earliest_ts >= to_ts:
        print("No older data available. Exiting.")
        break
    to_ts = earliest_ts - 86400  # move back one day (86400 seconds) before earliest fetched

    # Optional: delay to prevent rate limiting
    time.sleep(1)
