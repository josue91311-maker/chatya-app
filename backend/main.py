import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, Query, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

# Import all SQLAlchemy models FIRST to register relationships with Base
import app.models
from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.api.v1.router import api_router
from app.api.v1.endpoints.whatsapp_webhook import verify_webhook, handle_whatsapp_events

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed initial demo company and admin user if database is new
    try:
        from seed_data import seed_db
        seed_db()
    except Exception as e:
        print(f"Startup seed info: {e}")
        
    yield

app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan
)

# CORS - Allow all origins for seamless client-to-API communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for local uploads (only if directory exists)
if os.path.isdir(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API Router under /api/v1
app.include_router(api_router, prefix="/api/v1")

# Direct Meta Webhook endpoints at root level as well
@app.get("/webhook")
async def root_verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    return await verify_webhook(hub_mode=hub_mode, hub_verify_token=hub_verify_token, hub_challenge=hub_challenge)

@app.post("/webhook")
async def root_handle_whatsapp_events(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    return await handle_whatsapp_events(request=request, background_tasks=background_tasks, db=db)

@app.get("/")
def root():
    return {"app": settings.APP_NAME, "status": "online", "version": "1.1.0"}

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
