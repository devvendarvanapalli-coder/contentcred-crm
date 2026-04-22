"""
APScheduler jobs for ContentCred.
  - Daily scrape at SCRAPE_HOUR (default 6 AM)
  - Daily outreach at OUTREACH_HOUR (default 10 AM)
"""

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from database import SessionLocal, settings
from scraper.orchestrator import run_daily_scrape
from outreach.sequence_engine import run_daily_outreach


scheduler = AsyncIOScheduler()


async def _scrape_job():
    db = SessionLocal()
    try:
        await run_daily_scrape(db)
    finally:
        db.close()


async def _outreach_job():
    db = SessionLocal()
    try:
        await run_daily_outreach(db)
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        _scrape_job,
        CronTrigger(hour=settings.SCRAPE_HOUR, minute=0),
        id="daily_scrape",
        replace_existing=True,
    )
    scheduler.add_job(
        _outreach_job,
        CronTrigger(hour=settings.OUTREACH_HOUR, minute=0),
        id="daily_outreach",
        replace_existing=True,
    )
    scheduler.start()
    print(
        f"[Scheduler] Started. Scrape at {settings.SCRAPE_HOUR}:00, "
        f"Outreach at {settings.OUTREACH_HOUR}:00"
    )
