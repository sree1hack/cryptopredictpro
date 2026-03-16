import requests
import time

url = 'https://cryptopredictpro.onrender.com/debug_sql'
query = {'q': 'SELECT COUNT(*) FROM ohlcv WHERE coin="LTC" AND timeframe="daily"'}

for i in range(5):
    try:
        r = requests.get(url, params=query, timeout=10)
        print("Status:", r.status_code, "Body:", r.text)
        if r.status_code == 200 and int(r.json().get('result', [{}])[0].get('COUNT(*)', 0)) > 0:
            break
    except Exception as e:
        print("Error:", e)
    time.sleep(5)
