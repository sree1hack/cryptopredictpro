import requests
import time

url_health = 'https://cryptopredictpro.onrender.com/health'
url_sql = 'https://cryptopredictpro.onrender.com/debug_sql'
query = {'q': 'SELECT COUNT(*) FROM ohlcv WHERE coin="LTC" AND timeframe="daily"'}

print("Waiting for server to come up...")
for i in range(40):
    try:
        r = requests.get(url_health, timeout=5)
        if r.status_code == 200:
            print("Server is UP! Now checking DB sync status...")
            for j in range(10):
                r_sql = requests.get(url_sql, params=query, timeout=5)
                if r_sql.status_code == 200:
                    json_resp = r_sql.json()
                    count = json_resp.get('result', [{}])[0].get('COUNT(*)', 0)
                    print(f"LTC Row Count in DB: {count}")
                    if count > 0:
                        print("Sync successful!")
                        exit(0)
                time.sleep(10)
            break
    except Exception as e:
        print(f"Waiting... ({type(e).__name__})")
        
    time.sleep(10)
