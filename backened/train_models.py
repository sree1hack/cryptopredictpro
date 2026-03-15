import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf
from joblib import dump
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import MinMaxScaler

BASE = Path(__file__).resolve().parents[1] / "milestone-2" / "infosys"

DATA_DIRS = {
    "daily": BASE / "cleaned data" / "daily",
    "hourly": BASE / "cleaned data" / "hourly",
}

COIN_FILES = {
    "daily": [
        ("bitcoin_inr_daily.csv", "BITCOIN_INR"),
        ("ethereum_inr_daily.csv", "ETHEREUM_INR"),
        ("dogecoin_inr_daily.csv", "DOGECOIN_INR"),
        ("litecoin_inr_daily.csv", "LITECOIN_INR"),
        ("polkadot_inr_daily.csv", "POLKADOT_INR"),
        ("polygon_inr_daily.csv", "POLYGON_INR"),
        ("ripple_inr_daily.csv", "RIPPLE_INR"),
        ("chainlink_coin_inr_daily.csv", "CHAINLINK_COIN_INR"),
        ("bitcoin_cash_inr_daily.csv", "BITCOIN_CASH_INR"),
        ("binance_coin_inr_daily.csv", "BINANCE_COIN_INR"),
        ("solana_inr_daily.csv", "SOLANA_INR"),
        ("cardano_inr_daily.csv", "CARDANO_INR"),
        ("avalanche_inr_daily.csv", "AVALANCHE_INR"),
    ],
    "hourly": [
        ("bitcoin_inr_hourly.csv", "BITCOIN_INR"),
        ("ethereum_inr_hourly.csv", "ETHEREUM_INR"),
        ("dogecoin_inr_hourly.csv", "DOGECOIN_INR"),
        ("litecoin_inr_hourly.csv", "LITECOIN_INR"),
        ("polkadot_inr_hourly.csv", "POLKADOT_INR"),
        ("polygon_inr_hourly.csv", "POLYGON_INR"),
        ("ripple_inr_hourly.csv", "RIPPLE_INR"),
        ("chainlink_inr_hourly.csv", "CHAINLINK_INR"),
        ("bitcoin_cash_inr_hourly.csv", "BITCOIN_CASH_INR"),
        ("binance_inr_hourly.csv", "BINANCE_INR"),
        ("solana_inr_hourly.csv", "SOLANA_INR"),
        ("cardano_inr_hourly.csv", "CARDANO_INR"),
        ("avalanche_inr_hourly.csv", "AVALANCHE_INR"),
    ],
}


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def make_windows(series: np.ndarray, window: int, horizon: int) -> tuple[np.ndarray, np.ndarray]:
    x_vals = []
    y_vals = []
    for i in range(len(series) - window - horizon + 1):
        x_vals.append(series[i : i + window])
        y_vals.append(series[i + window : i + window + horizon].ravel())
    return np.array(x_vals), np.array(y_vals)


def split_time_series(
    x_vals: np.ndarray, y_vals: np.ndarray, val_size: float, test_size: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    n = len(x_vals)
    n_test = max(1, int(n * test_size))
    n_val = max(1, int((n - n_test) * val_size))
    train_end = n - n_test - n_val
    val_end = n - n_test
    return (
        x_vals[:train_end],
        y_vals[:train_end],
        x_vals[train_end:val_end],
        y_vals[train_end:val_end],
        x_vals[val_end:],
        y_vals[val_end:],
    )


def build_model(window: int, horizon: int) -> tf.keras.Model:
    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(window, 1)),
            tf.keras.layers.LSTM(64, return_sequences=True),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.LSTM(32),
            tf.keras.layers.Dense(horizon),
        ]
    )
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3), loss="mse")
    return model


def inverse_transform(scaler: MinMaxScaler, arr: np.ndarray) -> np.ndarray:
    return np.array([scaler.inverse_transform(row.reshape(-1, 1)).ravel() for row in arr])


def mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    denom = np.clip(np.abs(y_true), 1e-8, None)
    return float(np.mean(np.abs((y_true - y_pred) / denom)) * 100.0)


def train_for_frequency(
    freq: str,
    window: int,
    horizon: int,
    epochs: int,
    batch_size: int,
    val_size: float,
    test_size: float,
) -> None:
    out_base = BASE / "outputs"
    model_dir = out_base / "models" / freq
    scaler_dir = out_base / "scalers" / freq
    pred_dir = out_base / "predictions" / freq
    metrics_dir = out_base / "metrics" / freq

    for directory in [model_dir, scaler_dir, pred_dir, metrics_dir]:
        ensure_dir(directory)

    metric_rows = []

    for csv_name, model_name in COIN_FILES[freq]:
        csv_path = DATA_DIRS[freq] / csv_name
        if not csv_path.exists():
            print(f"[{freq}] Missing file: {csv_name}")
            continue

        df = pd.read_csv(csv_path)
        if "CLOSE" not in df.columns:
            print(f"[{freq}] CLOSE column missing for {csv_name}, skipping")
            continue

        close = pd.to_numeric(df["CLOSE"], errors="coerce").dropna().values.reshape(-1, 1)
        if len(close) < (window + horizon + 20):
            print(f"[{freq}] Not enough rows for {model_name}: {len(close)}")
            continue

        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled = scaler.fit_transform(close)

        x_vals, y_vals = make_windows(scaled, window, horizon)
        if len(x_vals) < 100:
            print(f"[{freq}] Not enough windows for {model_name}: {len(x_vals)}")
            continue

        x_train, y_train, x_val, y_val, x_test, y_test = split_time_series(
            x_vals, y_vals, val_size, test_size
        )

        model_path = model_dir / f"{model_name}.keras"
        if model_path.exists():
            model = tf.keras.models.load_model(model_path)
        else:
            model = build_model(window, horizon)

        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=2, restore_best_weights=True
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss", factor=0.5, patience=1, verbose=0
            ),
            tf.keras.callbacks.ModelCheckpoint(
                str(model_path), monitor="val_loss", save_best_only=True
            ),
        ]

        model.fit(
            x_train,
            y_train,
            validation_data=(x_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            verbose=0,
            callbacks=callbacks,
        )

        y_val_pred = model.predict(x_val, verbose=0)
        y_test_pred = model.predict(x_test, verbose=0)

        y_val_true = inverse_transform(scaler, y_val)[:, 0]
        y_test_true = inverse_transform(scaler, y_test)[:, 0]
        y_val_hat = inverse_transform(scaler, y_val_pred)[:, 0]
        y_test_hat = inverse_transform(scaler, y_test_pred)[:, 0]

        val_rmse = float(np.sqrt(mean_squared_error(y_val_true, y_val_hat)))
        val_mae = float(mean_absolute_error(y_val_true, y_val_hat))
        val_mape = mape(y_val_true, y_val_hat)
        test_rmse = float(np.sqrt(mean_squared_error(y_test_true, y_test_hat)))
        test_mae = float(mean_absolute_error(y_test_true, y_test_hat))
        test_mape = mape(y_test_true, y_test_hat)

        dump(scaler, scaler_dir / f"{model_name}.joblib")

        pd.DataFrame(
            {
                "set": ["val"] * len(y_val_true) + ["test"] * len(y_test_true),
                "y_true": np.concatenate([y_val_true, y_test_true]),
                "y_pred": np.concatenate([y_val_hat, y_test_hat]),
            }
        ).to_csv(pred_dir / f"{model_name}.csv", index=False)

        metric_rows.append(
            {
                "freq": freq,
                "coin": model_name,
                "window": window,
                "horizon": horizon,
                "val_RMSE": val_rmse,
                "val_MAE": val_mae,
                "val_MAPE": val_mape,
                "test_RMSE": test_rmse,
                "test_MAE": test_mae,
                "test_MAPE": test_mape,
            }
        )
        print(f"[{freq}] trained {model_name}: test_RMSE={test_rmse:.4f}")

    if metric_rows:
        pd.DataFrame(metric_rows).to_csv(metrics_dir / "metrics.csv", index=False)
        print(f"[{freq}] metrics updated: {metrics_dir / 'metrics.csv'}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train hourly and daily crypto models.")
    parser.add_argument(
        "--freq",
        choices=["daily", "hourly", "both"],
        default="both",
        help="Which frequency to train.",
    )
    parser.add_argument("--window", type=int, default=60)
    parser.add_argument("--horizon", type=int, default=1)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--val-size", type=float, default=0.15)
    parser.add_argument("--test-size", type=float, default=0.15)
    return parser.parse_args()


def run_training(
    freq: str = "both",
    window: int = 60,
    horizon: int = 1,
    epochs: int = 3,
    batch_size: int = 64,
    val_size: float = 0.15,
    test_size: float = 0.15,
) -> None:
    targets = ["daily", "hourly"] if freq == "both" else [freq]

    for item in targets:
        train_for_frequency(
            freq=item,
            window=window,
            horizon=horizon,
            epochs=epochs,
            batch_size=batch_size,
            val_size=val_size,
            test_size=test_size,
        )

    print("Training complete.")


def main() -> None:
    args = parse_args()
    run_training(
        freq=args.freq,
        window=args.window,
        horizon=args.horizon,
        epochs=args.epochs,
        batch_size=args.batch_size,
        val_size=args.val_size,
        test_size=args.test_size,
    )


if __name__ == "__main__":
    main()
