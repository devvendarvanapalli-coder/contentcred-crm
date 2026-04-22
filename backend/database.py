from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://contentcred:contentcred123@db:5432/contentcred_crm"
    )

    # YouTube Data API v3
    YOUTUBE_API_KEY: str = ""

    # Spotify API
    SPOTIFY_CLIENT_ID: str = ""
    SPOTIFY_CLIENT_SECRET: str = ""

    # Instagram scraper / DM bot
    INSTAGRAM_USERNAME: str = ""
    INSTAGRAM_PASSWORD: str = ""

    # TikTok session cookie
    TIKTOK_SESSION_ID: str = ""

    # Gmail SMTP for cold outreach
    GMAIL_ADDRESS: str = "devvendarvanapalli@gmail.com"
    GMAIL_APP_PASSWORD: str = ""

    # Sender identity
    SENDER_NAME: str = "Devvendar"
    REPLY_TO_EMAIL: str = "devvendarvanapalli@gmail.com"

    # Calendly
    CALENDLY_LINK: str = (
        "https://calendly.com/contentcred-strategy/content-distribution-strategy-call"
    )

    # Outreach limits
    DAILY_EMAIL_LIMIT: int = 200
    DAILY_INSTAGRAM_DM_LIMIT: int = 50

    # Scraper
    DAILY_SCRAPE_TARGET: int = 1000
    SCRAPE_HOUR: int = 6
    OUTREACH_HOUR: int = 10

    # Public URL for tracking pixel
    API_BASE_URL: str = "http://localhost:8001"

    # Proxy (optional)
    PROXY_URL: str = ""

    class Config:
        env_file = ".env"


settings = Settings()

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
