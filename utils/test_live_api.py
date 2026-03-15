import requests

def test_live_prices():
    url = "http://localhost:5001/api/prices"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            prices = data.get("prices", {})
            new_coins = ["ADA", "AVAX", "SOL"]
            found = [coin for coin in new_coins if coin in prices]
            print(f"Total coins in API: {len(prices)}")
            print(f"New coins found: {found}")
            for coin in found:
                print(f"{coin}: {prices[coin]['inr']:.2f} INR")
        else:
            print(f"Error: {resp.status_code}")
    except Exception as e:
        print(f"Could not connect to backend (is it running?): {e}")

if __name__ == "__main__":
    test_live_prices()
