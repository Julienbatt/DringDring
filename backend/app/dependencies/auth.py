from dataclasses import dataclass
from typing import List, Optional
import os

from dotenv import load_dotenv
from pathlib import Path
import firebase_admin  # pyright: ignore[reportMissingImports]
from firebase_admin import auth, credentials
from fastapi import HTTPException, Header
import threading


_initialized_app = None
_init_lock = threading.Lock()

# Load environment variables from backend/.env regardless of CWD
_env_path = Path(__file__).resolve().parents[2] / ".env"
if not _env_path.exists():
    # Fallback to backend/.env
    _env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=str(_env_path), override=True)


def _init_firebase_if_needed() -> None:
    global _initialized_app
    if _initialized_app is not None:
        return
    with _init_lock:
        if _initialized_app is not None:
            return
        # If already initialized in this process, just get the app
        try:
            _initialized_app = firebase_admin.get_app()
            return
        except ValueError:
            pass

        # Try environment variables first (for Docker)
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        private_key = os.getenv("FIREBASE_PRIVATE_KEY")
        client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
        
        try:
            if project_id and private_key and client_email:
                # Use environment variables for Firebase credentials
                import json
                cred_dict = {
                    "type": "service_account",
                    "project_id": project_id,
                    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID", ""),
                    "private_key": private_key.replace("\\n", "\n"),
                    "client_email": client_email,
                    "client_id": os.getenv("FIREBASE_CLIENT_ID", ""),
                    "auth_uri": os.getenv("FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
                    "token_uri": os.getenv("FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token"),
                }
                cred = credentials.Certificate(cred_dict)
                _initialized_app = firebase_admin.initialize_app(cred)
            else:
                # Fallback to file-based credentials
                cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
                if cred_path and os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    _initialized_app = firebase_admin.initialize_app(cred)
                else:
                    # Attempt default credentials (e.g., when running in Cloud Run)
                    _initialized_app = firebase_admin.initialize_app()
        except ValueError:
            # Another thread/process initialized concurrently; retrieve reference
            _initialized_app = firebase_admin.get_app()
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(
                "Firebase Admin SDK could not initialize. Set FIREBASE_* environment variables or GOOGLE_APPLICATION_CREDENTIALS."
            ) from exc


@dataclass
class CurrentUser:
    user_id: str
    email: Optional[str]
    roles: List[str]
    shop_id: Optional[str]
    client_id: Optional[str]
    region_id: Optional[str]
    chain_id: Optional[str]


def get_current_user(authorization: str = Header(default="")) -> CurrentUser:
    _init_firebase_if_needed()
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    id_token = authorization.split(" ", 1)[1]
    try:
        decoded = auth.verify_id_token(id_token)
    except Exception as exc:  # noqa: BLE001
        # Surface error cause during development to diagnose 401s
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc

    roles = decoded.get("roles", [])
    if not isinstance(roles, list):
        roles = []

    return CurrentUser(
        user_id=decoded.get("uid", ""),
        email=decoded.get("email"),
        roles=roles,
        shop_id=decoded.get("shopId"),
        client_id=decoded.get("clientId"),
        region_id=decoded.get("regionId"),
        chain_id=decoded.get("chainId"),
    )

