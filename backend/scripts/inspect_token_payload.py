import datetime
import os
import sys

from jose import jwt

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.config import settings
from app.db.session import get_db_connection


def main():
    token = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000000",
            "email": "debug@example.com",
            "role": "authenticated",
            "app_metadata": {"role": "shop", "shop_id": "00000000-0000-0000-0000-000000000000"},
            "aud": "authenticated",
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
            "iat": datetime.datetime.utcnow(),
        },
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256",
    )

    payload = jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
        options={"verify_aud": True},
    )
    print(payload)
    print("exp type:", type(payload.get("exp")))
    print("iat type:", type(payload.get("iat")))


if __name__ == "__main__":
    main()
