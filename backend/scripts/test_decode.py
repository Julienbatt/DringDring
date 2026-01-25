import datetime
import os
import sys

from jose import jwt

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.config import settings
from app.core.security import _decode_jwt


def main():
    payload = {
        "sub": "d1bce612-e302-41e6-85b5-2456b2888ff1",
        "email": "shop_metropole@dringdring.ch",
        "role": "authenticated",
        "app_metadata": {
            "role": "shop",
            "shop_id": "f2538ca7-9497-4ee1-afc0-1af835b9e461",
            "hq_id": "04295bba-cd9e-41fd-99c9-a5d8bda1a090",
        },
        "aud": "authenticated",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        "iat": datetime.datetime.utcnow(),
    }

    token = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
    decoded = _decode_jwt(token)
    print(decoded)


if __name__ == "__main__":
    main()
