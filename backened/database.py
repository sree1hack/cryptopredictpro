import sqlite3
import os
from datetime import datetime

# Get DB type and URL from environment
DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    if DATABASE_URL and DATABASE_URL.startswith("postgres"):
        import psycopg2
        import psycopg2.extras
        
        # Format for Heroku/Render: postgres://... -> postgresql://...
        url = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        conn = psycopg2.connect(url)
        # Use DictCursor for PostgreSQL to match sqlite3.Row behavior
        return conn
    
    # Fallback to SQLite
    DB_PATH = os.path.join(os.path.dirname(__file__), "crypto_pro.db")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def execute_query(query, params=(), fetch=True):
    """Abstraction layer for SQLite vs PostgreSQL queries."""
    conn = get_db_connection()
    try:
        if DATABASE_URL and DATABASE_URL.startswith("postgres"):
            import psycopg2.extras
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            # PostgreSQL uses %s, SQLite uses ?
            query = query.replace("?", "%s")
            cur.execute(query, params)
            if fetch:
                res = cur.fetchall()
                return [dict(r) for r in res]
            conn.commit()
        else:
            cur = conn.cursor()
            cur.execute(query, params)
            if fetch:
                res = cur.fetchall()
                return [dict(r) for r in res]
            conn.commit()
    finally:
        conn.close()

def init_db():
    print("🗄️ Initializing Database...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    is_postgres = DATABASE_URL and (DATABASE_URL.startswith("postgres") or DATABASE_URL.startswith("postgresql"))
    
    # Users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        avatar TEXT,
        created_at TEXT,
        last_login TEXT,
        password_hash TEXT,
        provider TEXT DEFAULT 'email'
    )
    ''')

    # OHLCV table for centralized price data
    cursor.execute(f'''
    CREATE TABLE IF NOT EXISTS ohlcv (
        id {'SERIAL' if is_postgres else 'INTEGER'} PRIMARY KEY {'AUTOINCREMENT' if not is_postgres else ''},
        coin TEXT,
        timeframe TEXT,
        timestamp BIGINT,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        date TEXT,
        UNIQUE (coin, timeframe, timestamp)
    )
    ''')
    
    # Predictions table
    cursor.execute(f'''
    CREATE TABLE IF NOT EXISTS predictions (
        id {'SERIAL' if is_postgres else 'INTEGER'} PRIMARY KEY {'AUTOINCREMENT' if not is_postgres else ''},
        user_id TEXT,
        coin TEXT,
        timeframe TEXT,
        current_price REAL,
        predicted_price REAL,
        confidence INTEGER,
        timestamp TEXT,
        is_correct INTEGER DEFAULT NULL
    )
    ''')

    # trades table
    cursor.execute(f'''
    CREATE TABLE IF NOT EXISTS trades (
        id {'SERIAL' if is_postgres else 'INTEGER'} PRIMARY KEY {'AUTOINCREMENT' if not is_postgres else ''},
        user_id TEXT,
        symbol TEXT,
        side TEXT,
        quantity REAL,
        executed_price REAL,
        notional_value REAL,
        mode TEXT DEFAULT 'paper',
        status TEXT DEFAULT 'filled',
        created_at TEXT
    )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database Initialized.")

if __name__ == "__main__":
    init_db()
