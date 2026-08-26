import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import all SQLAlchemy models FIRST to register relationships with Base
import app.models
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router

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

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"app": settings.APP_NAME, "status": "online", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
