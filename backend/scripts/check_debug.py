import requests
try:
    resp = requests.get("http://localhost:8000/api/v1/debug-config")
    print(resp.json())
except Exception as e:
    print(e)
