from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.api.routes import lms, data, agents, portal, auth, notifications
import app.models.all  # noqa: F401 — force model registration
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Create tables on startup (no demo profile seeding) ──
@app.on_event("startup")
def on_startup():
    logger.info("Creating database tables…")
    Base.metadata.create_all(bind=engine)
    logger.info("Database ready for real-time LMS / AMS synchronization.")


# ── Global error handler ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."},
    )


# ── Health ──
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


# ── Real-time Typing WebSocket ──
@app.websocket("/ws/typing")
async def websocket_typing_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass


# ── Register routers ──
app.include_router(auth.router)
app.include_router(lms.router)
app.include_router(data.router)
app.include_router(agents.router)
app.include_router(portal.router)
app.include_router(notifications.router)
