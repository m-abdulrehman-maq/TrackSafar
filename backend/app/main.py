import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.router import api_router
from app.controllers.tracking.hub import tracking_socket
from app.core.config import settings
from app.core.errors import ApiError, api_error_handler
from app.models.database import init_db

logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.validate_security()
    if settings.auth_mode == "development":
        logging.getLogger("tracksafar").warning(
            "auth_mode=development: local identity store in use. "
            "Not permitted in production (refused at startup)."
        )
    await init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(ApiError, api_error_handler)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "environment": settings.environment, "auth_mode": settings.auth_mode}


@app.websocket("/ws/tracking")
async def ws_tracking(ws: WebSocket):
    await tracking_socket(ws)
