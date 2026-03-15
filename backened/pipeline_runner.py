import argparse
from pathlib import Path

import pandas as pd

from data_sync import run_sync

BASE = Path(__file__).resolve().parents[1]
M1_DAILY = BASE / "milestone-1" / "daily"
M1_HOURLY = BASE / "milestone-1" / "hourly"
M2_DAILY = BASE / "milestone-2" / "infosys" / "cleaned data" / "daily"
M2_HOURLY = BASE / "milestone-2" / "infosys" / "cleaned data" / "hourly"

COINS = {
    "btc": {
        "daily": "bitcoin_inr_daily.csv",
        "hourly": "bitcoin_inr_hourly.csv",
        "instrument": "BTC-USD",
        "name": "Bitcoin",
    },
    "eth": {
        "daily": "ethereum_inr_daily.csv",
        "hourly": "ethereum_inr_hourly.csv",
        "instrument": "ETH-USD",
        "name": "Ethereum",
    },
    "doge": {
        "daily": "dogecoin_inr_daily.csv",
        "hourly": "dogecoin_inr_hourly.csv",
        "instrument": "DOGE-USD",
        "name": "Dogecoin",
    },
    "ltc": {
        "daily": "litecoin_inr_daily.csv",
        "hourly": "litecoin_inr_hourly.csv",
        "instrument": "LTC-USD",
        "name": "Litecoin",
    },
    "dot": {
        "daily": "polkadot_inr_daily.csv",
        "hourly": "polkadot_inr_hourly.csv",
        "instrument": "DOT-USD",
        "name": "Polkadot",
    },
    "polygon": {
        "daily": "polygon_inr_daily.csv",
        "hourly": "polygon_inr_hourly.csv",
        "instrument": "MATIC-USD",
        "name": "Polygon",
    },
    "ripple": {
        "daily": "ripple_inr_daily.csv",
        "hourly": "ripple_inr_hourly.csv",
        "instrument": "XRP-USD",
        "name": "Ripple",
    },
    "link": {
        "daily": "chainlink_coin_inr_daily.csv",
        "hourly": "chainlink_inr_hourly.csv",
        "instrument": "LINK-USD",
        "name": "Chainlink",
    },
    "bch": {
        "daily": "bitcoin_cash_inr_daily.csv",
        "hourly": "bitcoin_cash_inr_hourly.csv",
        "instrument": "BCH-USD",
        "name": "Bitcoin Cash",
    },
    "bnb": {
        "daily": "binance_coin_inr_daily.csv",
        "hourly": "binance_inr_hourly.csv",
        "instrument": "BNB-USD",
        "name": "Binance",
    },
}


def clean_source(df: pd.DataFrame) -> pd.DataFrame:
    for col in ["OPEN", "HIGH", "LOW", "CLOSE"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["TIMESTAMP"] = pd.to_numeric(df["TIMESTAMP"], errors="coerce")
    df = df.dropna(subset=["TIMESTAMP", "OPEN", "HIGH", "LOW", "CLOSE"])
    df["TIMESTAMP"] = df["TIMESTAMP"].astype("int64")
    df = df[(df[["OPEN", "HIGH", "LOW", "CLOSE"]] >= 1).all(axis=1)]
    df = df.drop_duplicates(subset=["TIMESTAMP"], keep="last")
    return df.sort_values("TIMESTAMP").reset_index(drop=True)


def write_cleaned_milestone2() -> None:
    daily_merged = []
    hourly_merged = []

    for short_name, meta in COINS.items():
        source_daily = M1_DAILY / f"{short_name}_inr_daily.csv"
        source_hourly = M1_HOURLY / f"{short_name}_inr_hourly.csv"

        if not source_daily.exists() or not source_hourly.exists():
            print(f"Skipping {short_name}: source file missing")
            continue

        daily_df = clean_source(pd.read_csv(source_daily))
        daily_df["INSTRUMENT"] = meta["instrument"]
        daily_df["VOLUME"] = 1.0
        daily_df["DATE"] = pd.to_datetime(daily_df["TIMESTAMP"], unit="s", utc=True).dt.strftime(
            "%Y-%m-%d"
        )
        daily_out = daily_df[
            ["TIMESTAMP", "INSTRUMENT", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME", "DATE"]
        ]
        daily_out.to_csv(M2_DAILY / meta["daily"], index=False)

        daily_m = daily_out.copy()
        daily_m["Cryptocurrency"] = meta["name"]
        daily_merged.append(daily_m)

        hourly_df = clean_source(pd.read_csv(source_hourly))
        hourly_df["INSTRUMENT"] = meta["instrument"]
        hourly_df["VOLUME"] = 1.0
        dt_utc = pd.to_datetime(hourly_df["TIMESTAMP"], unit="s", utc=True)
        hourly_df["DATE_UTC"] = dt_utc.astype(str)
        hourly_df["DATE_IST"] = dt_utc.dt.tz_convert("Asia/Kolkata").astype(str)
        hourly_out = hourly_df[
            [
                "TIMESTAMP",
                "INSTRUMENT",
                "OPEN",
                "HIGH",
                "LOW",
                "CLOSE",
                "VOLUME",
                "DATE_UTC",
                "DATE_IST",
            ]
        ]
        hourly_out.to_csv(M2_HOURLY / meta["hourly"], index=False)

        hourly_m = hourly_out.copy()
        hourly_m["Cryptocurrency"] = meta["name"]
        hourly_merged.append(hourly_m)

    if daily_merged:
        pd.concat(daily_merged, ignore_index=True).sort_values(
            ["TIMESTAMP", "Cryptocurrency"]
        ).to_csv(M2_DAILY / "all_crypto_inr_daily_merged.csv", index=False)

    if hourly_merged:
        pd.concat(hourly_merged, ignore_index=True).sort_values(
            ["TIMESTAMP", "Cryptocurrency"]
        ).to_csv(M2_HOURLY / "all_crypto_inr_hourly_merged.csv", index=False)

    print("Milestone-2 cleaned files refreshed from milestone-1 sync data.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run sync, prepare milestone-2 cleaned files, and retrain models."
    )
    parser.add_argument("--skip-sync", action="store_true", help="Skip Coindesk sync step.")
    parser.add_argument("--prepare-only", action="store_true", help="Only refresh cleaned files.")
    parser.add_argument("--skip-train", action="store_true", help="Skip model training step.")
    parser.add_argument(
        "--freq",
        choices=["daily", "hourly", "both"],
        default="both",
        help="Training frequency when training is enabled.",
    )
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=64)
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.skip_sync:
        print("Starting sync...")
        run_sync()

    write_cleaned_milestone2()
    if args.prepare_only or args.skip_train:
        print("Pipeline completed without training.")
        return

    from train_models import run_training

    run_training(freq=args.freq, epochs=args.epochs, batch_size=args.batch_size)


if __name__ == "__main__":
    main()
