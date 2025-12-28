import base64
import json
from typing import Any, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.schemas.me import MeResponse

security = HTTPBearer()


def _decode_jwt(token: str) -> Dict[str, Any]:
    secret = settings.SUPABASE_JWT_SECRET

    try:
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": False},
        )
    except JWTError:
        pass

    try:
        decoded_secret = base64.b64decode(secret)
        return jwt.decode(
            token,
            decoded_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": False},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _first_value(data: Dict[str, Any], keys: list[str]) -> Any:
    for key in keys:
        value = data.get(key)
        if value is not None:
            return value
    return None


def get_current_user_claims(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    token = credentials.credentials
    payload = _decode_jwt(token)
    return json.dumps(payload)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> MeResponse:
    token = credentials.credentials
    payload = _decode_jwt(token)

    app_metadata = payload.get("app_metadata") or {}
    user_metadata = payload.get("user_metadata") or {}

    return MeResponse(
        user_id=str(payload.get("sub")),
        email=_first_value(payload, ["email"]),
        role=_first_value(payload, ["role"]) or _first_value(app_metadata, ["role"]),
        city_id=_first_value(app_metadata, ["city_id", "cityId"])
        or _first_value(user_metadata, ["city_id", "cityId"]),
        hq_id=_first_value(app_metadata, ["hq_id", "hqId"])
        or _first_value(user_metadata, ["hq_id", "hqId"]),
        shop_id=_first_value(app_metadata, ["shop_id", "shopId"])
        or _first_value(user_metadata, ["shop_id", "shopId"]),
        admin_region_id=_first_value(app_metadata, ["admin_region_id", "adminRegionId"])
        or _first_value(user_metadata, ["admin_region_id", "adminRegionId"]),
    )
