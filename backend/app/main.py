from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import (
    health,
    deliveries,
    pricing,
    reporting,
    me,
    clients,
)

app = FastAPI(title="DringDring Backend")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
