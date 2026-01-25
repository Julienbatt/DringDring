import datetime
import json
import os
import sys

from jose import jwt

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.config import settings
from app.core.identity import resolve_identity
from app.db.session import get_db_connection


def main():
    target_email = "shop_metropole@dringdring.ch"

    with get_db_connection(json.dumps({"role": "service_role"})) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM auth.users WHERE email = %s", (target_email,))
            row = cur.fetchone()
            if not row:
                print("User not found in auth.users")
                return
            user_id = str(row[0])

    payload = {
        "sub": user_id,
        "email": target_email,
        "role": "authenticated",
        "app_metadata": {
            "role": "shop",
        },
        "aud": "authenticated",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        "iat": datetime.datetime.utcnow(),
    }

    token = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
    decoded = jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
        options={"verify_aud": True},
    )
    jwt_claims = json.dumps(decoded)

    try:
        identity = resolve_identity(
            user_id=user_id,
            email=target_email,
            jwt_claims=jwt_claims,
        )
        print(identity.model_dump())
    except Exception as exc:
        print(f"resolve_identity error: {exc}")


if __name__ == "__main__":
    main()
