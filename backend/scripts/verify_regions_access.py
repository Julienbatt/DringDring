import urllib.request
import urllib.parse
import json
import ssl
import sys

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "jub@ik.me"
PASSWORD = "password123" 
# User said password is "123456" in the chat but wait, I previously used "password123" in verify_shops_admin.py and it worked?
# The user said "mot de passse est 123456" in the *browser* context. 
# Let's try both or just try 123456 first as per user latest instruction.
PASSWORD_ATTEMPT = "123456"

def verify_regions_access():
    print(f"1. Logging in as {EMAIL} with password {PASSWORD_ATTEMPT}...")
    auth_data = {
        "email": EMAIL,
        "password": PASSWORD_ATTEMPT
    }
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        f"{BASE_URL}/me/login",
        data=json.dumps(auth_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    access_token = None
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status != 200:
                print(f"Login failed: {response.status}")
                return
            data = json.loads(response.read().decode('utf-8'))
            access_token = data.get("access_token")
            print("Login successful.")
    except Exception as e:
        print(f"Login error with {PASSWORD_ATTEMPT}: {e}")
        # Try fallback password if user changed it back or I am confused
        print("Retrying with 'password123'...")
        auth_data["password"] = "password123"
        req = urllib.request.Request(
            f"{BASE_URL}/me/login",
            data=json.dumps(auth_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        try:
             with urllib.request.urlopen(req, context=ctx) as response:
                data = json.loads(response.read().decode('utf-8'))
                access_token = data.get("access_token")
                print("Login successful with fallback password.")
        except Exception as e2:
             print(f"Login completely failed: {e2}")
             return

    print("2. Testing GET /regions ...")
    req_regions = urllib.request.Request(
        f"{BASE_URL}/regions",
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
    )
    
    try:
        with urllib.request.urlopen(req_regions, context=ctx) as response:
            if response.status == 200:
                regions = json.loads(response.read().decode('utf-8'))
                print("SUCCESS: /regions returned 200 OK")
                print(f"Returned {len(regions)} regions:")
                for r in regions:
                    print(f" - {r['name']} (Active: {r['active']})")
            else:
                print(f"FAILURE: Status {response.status}")
                print(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_regions_access()
