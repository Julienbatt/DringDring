from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import (
    health,
    deliveries,
    pricing,
    reporting,
    me,
    clients,
    shops,
    billing,
    regions,
    couriers,
    cities,
    dispatch,
    tariffs,
    users,
    stats,
    settings as settings_router,
)

from app.core.config import settings as app_settings

app = FastAPI(title="DringDring Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(deliveries.router, prefix="/api/v1")
app.include_router(pricing.router, prefix="/api/v1")
app.include_router(reporting.router, prefix="/api/v1")
app.include_router(me.router, prefix="/api/v1")
app.include_router(clients.router, prefix="/api/v1")
app.include_router(shops.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(regions.router, prefix="/api/v1")
app.include_router(couriers.router, prefix="/api/v1")
app.include_router(cities.router, prefix="/api/v1")
app.include_router(dispatch.router, prefix="/api/v1")
app.include_router(tariffs.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(settings_router.router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
