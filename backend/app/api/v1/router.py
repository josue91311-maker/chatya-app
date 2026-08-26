from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    companies,
    products,
    categories,
    brands,
    inventory,
    promotions,
    orders,
    customers,
    dashboard,
    config,
    users,
    store,
    tracking,
    whatsapp_webhook
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(brands.router, prefix="/brands", tags=["brands"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(promotions.router, prefix="/promotions", tags=["promotions"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(store.router, prefix="/store", tags=["store"])
api_router.include_router(tracking.router, prefix="/tracking", tags=["tracking"])
api_router.include_router(whatsapp_webhook.router, prefix="/whatsapp", tags=["WhatsApp Meta Cloud API"])
