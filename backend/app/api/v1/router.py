from fastapi import APIRouter

from app.api.v1.routes import admin_routes, auth_routes, catalog_routes, driver_routes

api_router = APIRouter()
api_router.include_router(auth_routes.router)
api_router.include_router(admin_routes.router)
api_router.include_router(catalog_routes.router)
api_router.include_router(driver_routes.router)
