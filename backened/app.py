from flask import Flask, request, jsonify
from flask_cors import CORS
from database import get_db_connection, init_db
import sqlite3
import uuid
import keras
import tensorflow as tf
import numpy as np
import pandas as pd
import os
import requests
from sklearn.preprocessing import MinMaxScaler
from datetime import datetime, timedelta
import threading
import time
import hashlib
import hmac
import re
from urllib.parse import urlencode
from werkzeug.security import generate_password_hash, check_password_hash
from data_sync import run_sync

app = Flask(__name__)

# CORS: restrict in production with comma-separated origins.
cors_origins = os.environ.get("CORS_ORIGINS", "*")
CORS(app, resources={r"/*": {"origins": [o.strip() for o in cors_origins.split(",")] if cors_origins != "*" else "*"}})

# Absolute paths to ensure it works from any directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "milestone-2", "infosys", "outputs", "models")
USD_TO_INR = 88.19
BINANCE_BASE_URL = os.environ.get("BINANCE_BASE_URL", "https://api.binance.com")
BINANCE_TESTNET_BASE_URL = os.environ.get("BINANCE_TESTNET_BASE_URL", "https://testnet.binance.vision")
ALLOW_LIVE_TRADING = os.environ.get("ALLOW_LIVE_TRADING", "false").strip().lower() == "true"
ALLOW_TESTNET_TRADING = os.environ.get("ALLOW_TESTNET_TRADING", "true").strip().lower() == "true"
BINANCE_RECV_WINDOW = int(os.environ.get("BINANCE_RECV_WINDOW", "5000"))
MAX_ORDER_NOTIONAL_USDT = float(os.environ.get("MAX_ORDER_NOTIONAL_USDT", "250"))
MAX_DAILY_NOTIONAL_USDT = float(os.environ.get("MAX_DAILY_NOTIONAL_USDT", "1000"))

def fetch_usd_to_inr():
    """Fetch live USD to INR exchange rate with fallback."""
    try:
        resp = requests.get("https://api.frankfurter.app/latest?from=USD&to=INR", timeout=5)
        rate = float(resp.json()["rates"]["INR"])
        return rate
    except Exception as e:
        print(f"⚠️ Exchange rate fetch failed: {e}. Using fallback.")
        return 86.5


# Coin mapping (same as in milestone-2/main.py)
MODEL_NAME_MAP = {
    "BTC": "BITCOIN_INR",
    "ETH": "ETHEREUM_INR",
    "DOGE": "DOGECOIN_INR",
    "LTC": "LITECOIN_INR",
    "DOT": "POLKADOT_INR",
    "MATIC": "POLYGON_INR",
    "XRP": "RIPPLE_INR",
    "LINK": "CHAINLINK_INR",
    "BCH": "BITCOIN_CASH_INR",
    "BNB": "BINANCE_INR",
    "SOL": "SOLANA_INR",
    "ADA": "CARDANO_INR",
    "AVAX": "AVALANCHE_INR",
}

models = {
    "hourly": {},
    "daily": {}
}


def public_user(user_row):
    user = dict(user_row)
    user.pop("password_hash", None)
    return user


def verify_password(stored_hash, plain_password):
    # Backward compatibility for old SHA-256 hashes in existing DB rows.
    if not stored_hash:
        return False
    if stored_hash.startswith("pbkdf2:") or stored_hash.startswith("scrypt:"):
        return check_password_hash(stored_hash, plain_password)
    legacy = hashlib.sha256(plain_password.encode()).hexdigest()
    return stored_hash == legacy


def upsert_google_user(email, name, avatar, google_id):
    now_iso = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not user:
        cursor.execute(
            "INSERT INTO users (id, email, name, avatar, created_at, last_login, provider) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (google_id, email, name, avatar, now_iso, now_iso, "google")
        )
        conn.commit()
    else:
        cursor.execute(
            "UPDATE users SET name = ?, avatar = ?, last_login = ?, provider = ? WHERE email = ?",
            (name or user["name"], avatar or user["avatar"], now_iso, "google", email)
        )
        conn.commit()

    user = cursor.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return user


def fetch_binance_price(symbol):
    return fetch_binance_price_by_mode(symbol, "live")


def get_binance_base_url(exchange_mode):
    return BINANCE_TESTNET_BASE_URL if exchange_mode == "testnet" else BINANCE_BASE_URL


def fetch_binance_price_by_mode(symbol, exchange_mode):
    resp = requests.get(
        f"{get_binance_base_url(exchange_mode)}/api/v3/ticker/price",
        params={"symbol": symbol},
        timeout=8
    )
    payload = resp.json() if resp.status_code == 200 else {}
    if not payload.get("price"):
        return None
    return float(payload["price"])


def sign_binance_params(params, api_secret):
    query = urlencode(params, doseq=True)
    signature = hmac.new(api_secret.encode("utf-8"), query.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{query}&signature={signature}"

def get_model(timeframe, coin):
    if coin in models[timeframe]:
        return models[timeframe][coin]
    
    # Try to load if not cached
    mapped_name = MODEL_NAME_MAP.get(coin)
    if not mapped_name:
        return None
    
    model_file = f"{mapped_name}.keras"
    model_path = os.path.join(MODEL_PATH, timeframe, model_file)
    
    if os.path.exists(model_path):
        print(f"📦 Lazy loading {timeframe} model for {coin} from {model_file}...")
        try:
            model = keras.models.load_model(model_path)
            models[timeframe][coin] = model
            return model
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return None
    return None

# Initialize Database
init_db()

@app.route("/health")
def health():
    return "ok"

@app.route("/api/prices")
def get_all_prices():
    try:
        BINANCE_SYMBOLS = {
            "BTC": "BTCUSDT", "ETH": "ETHUSDT", "DOGE": "DOGEUSDT",
            "LTC": "LTCUSDT", "DOT": "DOTUSDT", "MATIC": "MATICUSDT",
            "XRP": "XRPUSDT", "LINK": "LINKUSDT", "BCH": "BCHUSDT", "BNB": "BNBUSDT",
            "ADA": "ADAUSDT", "AVAX": "AVAXUSDT", "SOL": "SOLUSDT"
        }
        resp = requests.get("https://api.binance.com/api/v3/ticker/price", timeout=8)
        ticker_data = resp.json()
        ticker_map = {item['symbol']: float(item['price']) for item in ticker_data}
        usd_inr = fetch_usd_to_inr()
        prices = {}
        for coin, symbol in BINANCE_SYMBOLS.items():
            price_usdt = ticker_map.get(symbol)
            if price_usdt:
                prices[coin] = { "usdt": price_usdt, "inr": price_usdt * usd_inr, "symbol": symbol }
        return jsonify({ "success": True, "prices": prices, "timestamp": datetime.now().isoformat(), "usd_to_inr": usd_inr })
    except Exception as e:
        return jsonify({ "success": False, "error": str(e) }), 500


@app.route("/api/auth/google", methods=["POST"])
def google_auth():
    data = request.get_json() or {}
    access_token = data.get("access_token")

    # Preferred flow: token comes from Google OAuth popup account chooser.
    if access_token:
        try:
            userinfo_resp = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=8
            )
            if userinfo_resp.status_code != 200:
                return jsonify({"success": False, "error": "Invalid Google access token"}), 401

            profile = userinfo_resp.json()
            if not profile.get("email"):
                return jsonify({"success": False, "error": "Google account email not available"}), 400

            user = upsert_google_user(
                email=profile.get("email"),
                name=profile.get("name") or "Google User",
                avatar=profile.get("picture"),
                google_id=profile.get("sub") or str(uuid.uuid4())
            )
            return jsonify({"success": True, "user": public_user(user)})
        except Exception as e:
            return jsonify({"success": False, "error": f"Google OAuth verification failed: {e}"}), 500

    # Backward compatibility for old frontend payload.
    email = data.get("email")
    if not email:
        return jsonify({"success": False, "error": "Email or access_token is required"}), 400

    user = upsert_google_user(
        email=email,
        name=data.get("name") or "Google User",
        avatar=data.get("avatar"),
        google_id=data.get("id") or str(uuid.uuid4())
    )

    return jsonify({
        "success": True,
        "user": public_user(user)
    })

@app.route("/api/auth/register", methods=["POST"])
def register():
    """Email+password registration."""
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or email.split("@")[0]).strip()

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required"}), 400
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return jsonify({"success": False, "error": "Invalid email address"}), 400
    if len(password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters"}), 400

    password_hash = generate_password_hash(password)
    user_id = "user_" + str(uuid.uuid4()).replace("-", "")[:12]
    now_iso = datetime.now().isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    existing = cursor.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"success": False, "error": "An account with this email already exists"}), 409

    cursor.execute(
        "INSERT INTO users (id, email, name, avatar, created_at, last_login, password_hash, provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (user_id, email, name, f"https://ui-avatars.com/api/?name={name}&background=6366f1&color=fff",
         now_iso, now_iso, password_hash, "email")
    )
    conn.commit()
    user = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return jsonify({"success": True, "user": public_user(user)})

@app.route("/api/auth/login", methods=["POST"])
def login():
    """Email+password login."""
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required"}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"success": False, "error": "Invalid email or password"}), 401

    if not verify_password(user["password_hash"], password):
        conn.close()
        return jsonify({"success": False, "error": "Invalid email or password"}), 401

    if user:
        conn.execute(
            "UPDATE users SET last_login = ? WHERE id = ?",
            (datetime.now().isoformat(), user["id"])
        )
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    conn.close()

    return jsonify({"success": True, "user": public_user(user)})

@app.route("/api/user/stats/<user_id>")
def get_user_stats(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    total = cursor.execute("SELECT COUNT(*) FROM predictions WHERE user_id = ?", (user_id,)).fetchone()[0]
    # Estimate accuracy from confidence scores of past predictions
    conf_row = cursor.execute(
        "SELECT AVG(confidence) FROM predictions WHERE user_id = ?", (user_id,)
    ).fetchone()
    accuracy = round(float(conf_row[0])) if conf_row and conf_row[0] else 0
    
    predictions = cursor.execute(
        "SELECT * FROM predictions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10", 
        (user_id,)
    ).fetchall()
    
    conn.close()
    
    return jsonify({
        "success": True,
        "totalPredictions": total,
        "accuracyRate": accuracy,
        "history": [dict(p) for p in predictions]
    })


@app.route("/api/trade/quote", methods=["POST"])
def trade_quote():
    data = request.get_json() or {}
    symbol = (data.get("symbol") or "BTCUSDT").upper()
    exchange_mode = (data.get("exchange_mode") or "live").lower()
    if not re.match(r"^[A-Z0-9]{6,15}$", symbol):
        return jsonify({"success": False, "error": "Invalid symbol format"}), 400
    if exchange_mode not in ["live", "testnet"]:
        return jsonify({"success": False, "error": "exchange_mode must be live or testnet"}), 400

    try:
        price = fetch_binance_price_by_mode(symbol, exchange_mode)
        if price is None:
            return jsonify({"success": False, "error": "Unable to fetch live quote"}), 502

        return jsonify({
            "success": True,
            "symbol": symbol,
            "exchange_mode": exchange_mode,
            "price": price,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Quote service error: {e}"}), 500


@app.route("/api/trade/paper", methods=["POST"])
def execute_paper_trade():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    symbol = (data.get("symbol") or "").upper()
    side = (data.get("side") or "").lower()
    quantity = float(data.get("quantity") or 0)

    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    if not symbol or not re.match(r"^[A-Z0-9]{6,15}$", symbol):
        return jsonify({"success": False, "error": "Valid symbol is required"}), 400
    if side not in ["buy", "sell"]:
        return jsonify({"success": False, "error": "side must be buy or sell"}), 400
    if quantity <= 0:
        return jsonify({"success": False, "error": "quantity must be greater than 0"}), 400

    price = fetch_binance_price(symbol)
    if price is None:
        return jsonify({"success": False, "error": "Unable to fetch live quote"}), 502

    executed_price = price
    notional = executed_price * quantity
    now_iso = datetime.now().isoformat()

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO trades (user_id, symbol, side, quantity, executed_price, notional_value, mode, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, symbol, side, quantity, executed_price, notional, "paper", "filled", now_iso)
    )
    trade_id = cur.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "trade": {
            "id": trade_id,
            "user_id": user_id,
            "symbol": symbol,
            "side": side,
            "quantity": quantity,
            "executed_price": executed_price,
            "notional_value": notional,
            "mode": "paper",
            "status": "filled",
            "created_at": now_iso
        }
    })


@app.route("/api/trade/history/<user_id>")
def trade_history(user_id):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM trades WHERE user_id = ? ORDER BY created_at DESC LIMIT 25",
        (user_id,)
    ).fetchall()
    conn.close()
    return jsonify({"success": True, "history": [dict(row) for row in rows]})


@app.route("/api/trade/config")
def trade_config():
    return jsonify({
        "success": True,
        "liveTradingEnabled": ALLOW_LIVE_TRADING,
        "testnetTradingEnabled": ALLOW_TESTNET_TRADING,
        "maxOrderNotionalUsdt": MAX_ORDER_NOTIONAL_USDT,
        "maxDailyNotionalUsdt": MAX_DAILY_NOTIONAL_USDT,
        "exchange": "binance"
    })


@app.route("/api/trade/balances", methods=["POST"])
def trade_balances():
    data = request.get_json() or {}
    api_key = (data.get("api_key") or "").strip()
    api_secret = (data.get("api_secret") or "").strip()
    exchange_mode = (data.get("exchange_mode") or "live").lower()

    if exchange_mode not in ["live", "testnet"]:
        return jsonify({"success": False, "error": "exchange_mode must be live or testnet"}), 400
    if exchange_mode == "live" and not ALLOW_LIVE_TRADING:
        return jsonify({"success": False, "error": "Live trading is disabled by server config"}), 403
    if exchange_mode == "testnet" and not ALLOW_TESTNET_TRADING:
        return jsonify({"success": False, "error": "Testnet trading is disabled by server config"}), 403
    if not api_key or not api_secret:
        return jsonify({"success": False, "error": "API key and secret are required"}), 400

    params = {"timestamp": int(time.time() * 1000), "recvWindow": BINANCE_RECV_WINDOW}
    signed_query = sign_binance_params(params, api_secret)

    try:
        resp = requests.get(
            f"{get_binance_base_url(exchange_mode)}/api/v3/account?{signed_query}",
            headers={"X-MBX-APIKEY": api_key},
            timeout=10
        )
        payload = resp.json()
        if resp.status_code != 200:
            return jsonify({"success": False, "error": payload.get("msg", "Unable to fetch balances")}), 400

        balances = []
        for item in payload.get("balances", []):
            free_val = float(item.get("free", 0))
            locked_val = float(item.get("locked", 0))
            if free_val > 0 or locked_val > 0:
                balances.append({
                    "asset": item.get("asset"),
                    "free": free_val,
                    "locked": locked_val
                })

        return jsonify({"success": True, "balances": balances, "exchange_mode": exchange_mode})
    except Exception as e:
        return jsonify({"success": False, "error": f"Balance fetch failed: {e}"}), 500


@app.route("/api/trade/live", methods=["POST"])
def execute_live_trade():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    symbol = (data.get("symbol") or "").upper()
    side = (data.get("side") or "").upper()
    quantity = data.get("quantity")
    api_key = (data.get("api_key") or "").strip()
    api_secret = (data.get("api_secret") or "").strip()
    confirm_live = bool(data.get("confirm_live"))
    exchange_mode = (data.get("exchange_mode") or "live").lower()

    if exchange_mode not in ["live", "testnet"]:
        return jsonify({"success": False, "error": "exchange_mode must be live or testnet"}), 400
    if exchange_mode == "live" and not ALLOW_LIVE_TRADING:
        return jsonify({"success": False, "error": "Live trading is disabled by server config"}), 403
    if exchange_mode == "testnet" and not ALLOW_TESTNET_TRADING:
        return jsonify({"success": False, "error": "Testnet trading is disabled by server config"}), 403
    if not confirm_live:
        return jsonify({"success": False, "error": "confirm_live=true is required"}), 400
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    if not symbol or not re.match(r"^[A-Z0-9]{6,15}$", symbol):
        return jsonify({"success": False, "error": "Valid symbol is required"}), 400
    if side not in ["BUY", "SELL"]:
        return jsonify({"success": False, "error": "side must be BUY or SELL"}), 400
    if not api_key or not api_secret:
        return jsonify({"success": False, "error": "API key and secret are required"}), 400

    try:
        qty = float(quantity)
    except Exception:
        return jsonify({"success": False, "error": "quantity must be numeric"}), 400
    if qty <= 0:
        return jsonify({"success": False, "error": "quantity must be greater than 0"}), 400

    # Pre-trade guardrails: per-order and daily notional limits per user.
    mark_price = fetch_binance_price_by_mode(symbol, exchange_mode)
    if mark_price is None:
        return jsonify({"success": False, "error": "Unable to fetch mark price for guard checks"}), 502
    requested_notional = mark_price * qty
    if requested_notional > MAX_ORDER_NOTIONAL_USDT:
        return jsonify({
            "success": False,
            "error": f"Order exceeds per-order limit ({MAX_ORDER_NOTIONAL_USDT} USDT)"
        }), 400

    conn = get_db_connection()
    today_date = datetime.utcnow().strftime("%Y-%m-%d")
    daily_row = conn.execute(
        "SELECT COALESCE(SUM(notional_value), 0) FROM trades WHERE user_id = ? AND mode = ? AND DATE(created_at) = ?",
        (user_id, exchange_mode, today_date)
    ).fetchone()
    conn.close()
    daily_notional = float(daily_row[0] or 0)
    if (daily_notional + requested_notional) > MAX_DAILY_NOTIONAL_USDT:
        return jsonify({
            "success": False,
            "error": f"Daily notional limit exceeded ({MAX_DAILY_NOTIONAL_USDT} USDT)"
        }), 400

    params = {
        "symbol": symbol,
        "side": side,
        "type": "MARKET",
        "quantity": f"{qty:.8f}".rstrip("0").rstrip("."),
        "timestamp": int(time.time() * 1000),
        "recvWindow": BINANCE_RECV_WINDOW
    }
    signed_query = sign_binance_params(params, api_secret)

    try:
        resp = requests.post(
            f"{get_binance_base_url(exchange_mode)}/api/v3/order",
            headers={"X-MBX-APIKEY": api_key},
            data=signed_query,
            timeout=12
        )
        payload = resp.json()
        if resp.status_code != 200:
            return jsonify({"success": False, "error": payload.get("msg", "Live trade failed")}), 400

        executed_qty = float(payload.get("executedQty", 0))
        quote_qty = float(payload.get("cummulativeQuoteQty", 0))
        executed_price = (quote_qty / executed_qty) if executed_qty > 0 else 0.0
        now_iso = datetime.now().isoformat()

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO trades (user_id, symbol, side, quantity, executed_price, notional_value, mode, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, symbol, side.lower(), executed_qty or qty, executed_price, quote_qty, exchange_mode, payload.get("status", "filled").lower(), now_iso)
        )
        trade_id = cur.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "trade": {
                "id": trade_id,
                "user_id": user_id,
                "symbol": symbol,
                "side": side.lower(),
                "quantity": executed_qty or qty,
                "executed_price": executed_price,
                "notional_value": quote_qty,
                "mode": exchange_mode,
                "status": payload.get("status", "FILLED"),
                "exchange_order_id": payload.get("orderId"),
                "created_at": now_iso
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Live trade failed: {e}"}), 500

@app.route("/predict", methods=["POST"])
def predict():
    print("📥 Received prediction request")
    try:
        data = request.get_json()
        coin = data.get("coin", "BTC").upper()
        timeframe = data.get("timeframe", "hourly") # "hourly" or "daily"
        user_id = data.get("user_id", "anonymous")
        
        model = get_model(timeframe, coin)
        if not model:
            return jsonify({"error": f"Model for {coin} ({timeframe}) not found"}), 400

        # Data source selection (Database ohlcv table)
        conn = get_db_connection()
        query = "SELECT close FROM ohlcv WHERE coin = ? AND timeframe = ? ORDER BY timestamp DESC LIMIT ?"
        # Handle SQLite vs Postgres param syntax
        cursor = conn.cursor()
        is_postgres = hasattr(cursor, 'cursor_factory')
        if is_postgres:
             query = query.replace("?", "%s")
             cursor.execute(query, (coin, timeframe, 100))
        else:
             cursor.execute(query, (coin, timeframe, 100))
             
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
             return jsonify({"error": f"No data found for {coin} ({timeframe}) in database"}), 404
             
        # Extract and reverse to get chronological order
        prices_list = [float(row[0]) for row in rows]
        prices_list.reverse()
        
        df = pd.DataFrame(prices_list, columns=["CLOSE"])
        
        # Use 100 points for better MinMaxScaler context, predict from last 60
        SEQ_LEN = 60
        
        if len(df) < SEQ_LEN:
             return jsonify({"error": f"Insufficient data (need {SEQ_LEN}, have {len(df)})"}), 400

        close_prices = df["CLOSE"].values.reshape(-1, 1)
        
        # --- Attempt to fetch the freshest live price from CoinDesk ---
        try:
            interval_type = "hours" if timeframe == "hourly" else "days"
            coin_instrument = {
                "BTC": "BTC-USD", "ETH": "ETH-USD", "DOGE": "DOGE-USD",
                "LTC": "LTC-USD", "DOT": "DOT-USD", "MATIC": "MATIC-USD",
                "XRP": "XRP-USD", "LINK": "LINK-USD", "BCH": "BCH-USD", "BNB": "BNB-USD"
            }.get(coin, f"{coin}-USD")
            live_url = f"https://data-api.coindesk.com/index/cc/v1/historical/{interval_type}"
            live_resp = requests.get(live_url, params={
                "market": "cadli", "instrument": coin_instrument, "limit": 1, "aggregate": 1
            }, timeout=5)
            if live_resp.status_code == 200:
                live_records = live_resp.json().get("Data", [])
                if live_records:
                    # Fetch live USD/INR rate for accurate conversion
                    live_inr_rate = fetch_usd_to_inr()
                    live_close_usd = float(live_records[-1]["CLOSE"])
                    live_close_inr = live_close_usd * live_inr_rate
                    # Inject the live price as the last data point
                    close_prices[-1][0] = live_close_inr
                    print(f"💡 Injected live {coin} price: ₹{live_close_inr:,.2f} (USD: ${live_close_usd:,.2f} × {live_inr_rate})")
        except Exception as e:
            print(f"⚠️ Live price injection failed, using CSV data: {e}")

        # Scale using CONTEXT_LEN rows for better min/max range
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(close_prices)

        # Prepare last 60 timesteps for model input
        X_input = np.array([scaled_data[-SEQ_LEN:]]).reshape((1, SEQ_LEN, 1))

        # Prediction
        predicted_scaled = model.predict(X_input, verbose=0)
        predicted_price = scaler.inverse_transform(predicted_scaled)[0][0]
        current_price = float(close_prices[-1][0])
        
        # --- Real confidence score based on recent price volatility ---
        recent_prices = close_prices[-SEQ_LEN:].flatten()
        price_std = float(np.std(recent_prices))
        price_mean = float(np.mean(recent_prices))
        volatility_pct = (price_std / price_mean) * 100 if price_mean > 0 else 10
        # Lower volatility → higher confidence (capped between 50% and 95%)
        real_confidence = max(50, min(95, round(95 - volatility_pct * 3)))
        
        print(f"✨ {coin} → Current: ₹{current_price:,.2f} | Predicted: ₹{float(predicted_price):,.2f} | Confidence: {real_confidence}%")
        
        # Prepare Response Object
        prediction_result = {
            "success": True,
            "coin": coin,
            "timeframe": timeframe,
            "currentPrice": current_price,
            "predictedPrice": float(predicted_price),
            "historicalData": close_prices.flatten().tolist(),
            "confidence": real_confidence,
            "timestamp": datetime.now().isoformat(),
            "status": "Live Data Connected",
            "version": "2.2"
        }

        # Save to DB
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO predictions (user_id, coin, timeframe, current_price, predicted_price, confidence, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, coin, timeframe, prediction_result["currentPrice"], prediction_result["predictedPrice"], 
             int(prediction_result["confidence"]), prediction_result["timestamp"])
        )
        conn.commit()
        conn.close()

        return jsonify(prediction_result)
        
    except Exception as e:
        print(f"❌ Prediction Error: {e}")
        return jsonify({"error": str(e)}), 500

def background_sync():
    """Run data sync every 60 minutes."""
    while True:
        try:
            run_sync()
        except Exception as e:
            print(f"❌ Background sync error: {e}")
        time.sleep(900)  # Sync every 15 minutes for fresher data

if __name__ == "__main__":
    # Start sync thread
    print("⏲️ Starting background sync thread...")
    threading.Thread(target=background_sync, daemon=True).start()
    
    # Use environment port for deployment (Render/Heroku/etc)
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=False, port=port, host="0.0.0.0")
