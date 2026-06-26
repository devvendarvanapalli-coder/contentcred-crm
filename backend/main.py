"""
ContentCred CRM — FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from scheduler import start_scheduler
from routers import leads, analytics, sequences, campaigns


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield


app = FastAPI(
    title="ContentCred CRM",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads.router)
app.include_router(analytics.router)
app.include_router(sequences.router)
app.include_router(campaigns.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ContentCred CRM"}
