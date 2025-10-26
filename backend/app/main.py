from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import time
import logging
import uuid

from .dependencies.auth import get_current_user, CurrentUser
from .routers import shops, clients, deliveries, reports, admin, ux, documentation


class HealthResponse(BaseModel):
    status: str


app = FastAPI(title="DringDring API", version="0.1.0")

# Optional Sentry initialization (no-op if DSN missing or package absent)
_sentry_dsn = os.getenv("SENTRY_DSN", "").strip()
if _sentry_dsn:
    try:
        import sentry_sdk  # type: ignore
        sentry_sdk.init(dsn=_sentry_dsn, traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")))
    except Exception:
        pass

# Basic structured logging
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("dringdring")


@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    start = time.perf_counter()
    response = None
    try:
        response = await call_next(request)
        return response
    except Exception:
        # Log the exception; Sentry (if enabled) will capture it too
        duration_ms = int((time.perf_counter() - start) * 1000)
        logger.exception(
            "request_error",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": 500,
                "duration_ms": duration_ms,
                "request_id": request_id,
            },
        )
        raise
    finally:
        duration_ms = int((time.perf_counter() - start) * 1000)
        logger.info(
            "request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": getattr(response, "status_code", 0) or 0,
                "duration_ms": duration_ms,
                "request_id": request_id,
            },
        )
        if response is not None:
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(duration_ms)


# CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Requested-With",
        "Origin",
    ],
    expose_headers=["Content-Disposition", "Content-Type"],
)


@app.get("/health", response_model=HealthResponse, tags=["health"]) 
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/debug/sentry", tags=["debug"]) 
def debug_sentry():
    # Force an unhandled error to validate Sentry wiring
    raise RuntimeError("Sentry test error from /debug/sentry")


@app.get("/auth/me", tags=["auth"]) 
def auth_me(current_user: CurrentUser = Depends(get_current_user)) -> dict:
    return {
        "userId": current_user.user_id,
        "email": current_user.email,
        "roles": current_user.roles,
        "shopId": current_user.shop_id,
        "clientId": current_user.client_id,
    }


app.include_router(shops.router)
app.include_router(clients.router)
app.include_router(deliveries.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(ux.router)
app.include_router(documentation.router)


