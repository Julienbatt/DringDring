import os
import sys
import base64
from jose import jwt, JWTError

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

def debug_jwt():
    secret = settings.SUPABASE_JWT_SECRET
    print(f"Secret (first 10 chars): {secret[:10]}")
    
    # Generate token
    payload = {"sub": "12345", "role": "authenticated", "aud": "authenticated"}
    
    # Try encode with RAW
    token_raw = jwt.encode(payload, secret, algorithm="HS256")
    print(f"Token (signed with RAW): {token_raw[:20]}...")
    
    # Try encode with DECODED
    try:
        decoded_secret = base64.b64decode(secret)
        token_decoded = jwt.encode(payload, decoded_secret, algorithm="HS256")
        print(f"Token (signed with DECODED): {token_decoded[:20]}...")
    except Exception as e:
        print(f"Could not decode secret: {e}")
        token_decoded = None

    # Verification Logic (mimic security.py)
    def verify(token, name):
        print(f"\nVerifying {name}...")
        # Attempt 1: Raw
        try:
            jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated", options={"verify_aud": False})
            print("  ✅ Access granted with RAW secret")
            return
        except JWTError as e:
            print(f"  ❌ Failed with RAW secret: {e}")
        
        # Attempt 2: Decoded
        try:
            dec_secret = base64.b64decode(secret)
            jwt.decode(token, dec_secret, algorithms=["HS256"], audience="authenticated", options={"verify_aud": False})
            print("  ✅ Access granted with DECODED secret")
            return
        except JWTError as e:
            print(f"  ❌ Failed with DECODED secret: {e}")

    verify(token_raw, "Token signed with RAW")
    if token_decoded:
        verify(token_decoded, "Token signed with DECODED")

if __name__ == "__main__":
    debug_jwt()
