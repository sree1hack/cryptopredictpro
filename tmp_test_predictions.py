import requests
import json

URL = "http://127.0.0.1:5001/predict"

def test_prediction(coin):
    payload = {
        "coin": coin,
        "timeframe": "hourly",
        "user_id": "test_agent"
    }
    try:
        response = requests.post(URL, json=payload, timeout=10)
        print(f"Prediction for {coin}: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data["success"]:
                print(f"  Success! Predicted Price: {data['predictedPrice']}")
            else:
                print(f"  Failed: {data.get('error')}")
        else:
            print(f"  Server Error: {response.text}")
    except Exception as e:
        print(f"  Connection Error: {e}")

# Note: This requires the backend to be running.
if __name__ == "__main__":
    print("Testing predictions for new coins...")
    # test_prediction("SOL")
    # test_prediction("ADA")
    # test_prediction("AVAX")
    print("Verification script ready. Run 'python backened/app.py' in one terminal and this in another if needed.")
