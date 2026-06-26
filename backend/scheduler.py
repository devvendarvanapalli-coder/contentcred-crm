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


async def _view_refresh_job():
    """Refresh views for all pending/approved clips every 6 hours."""
    from models import ClipSubmission, Campaign, ViewSnapshot
    from datetime import datetime, timezone
    import view_fetcher
    from bot_detection import analyze as bot_analyze
    import json

    db = SessionLocal()
    try:
        clips = (
            db.query(ClipSubmission)
            .filter(
                ClipSubmission.approval_status.in_(["pending", "approved"]),
                ClipSubmission.platform.in_(["youtube", "tiktok"]),
            )
            .all()
        )
        updated = 0
        for clip in clips:
            result = view_fetcher.fetch_views(clip.platform, clip.url)
            if result is None:
                continue
            views, eng = result
            clip.current_views = views
            if eng.get("likes"):    clip.likes    = eng["likes"]
            if eng.get("comments"): clip.comments = eng["comments"]
            clip.last_checked_at = datetime.now(timezone.utc)
            db.add(ViewSnapshot(clip_id=clip.id, views=views))
            db.flush()

            snaps = db.query(ViewSnapshot).filter(ViewSnapshot.clip_id == clip.id).order_by(ViewSnapshot.recorded_at.asc()).all()
            res = bot_analyze(
                platform=clip.platform, views=clip.current_views,
                likes=clip.likes, comments=clip.comments, shares=clip.shares,
                snapshots=[{"views": s.views, "recorded_at": s.recorded_at} for s in snaps],
            )
            clip.bot_score = res.score
            clip.bot_flag  = res.flag
            clip.bot_reasons = json.dumps(res.reasons)
            if clip.bot_flag == "botted" and clip.approval_status == "pending":
                clip.approval_status = "flagged"
            updated += 1

        db.commit()
        print(f"[Scheduler] View refresh complete: {updated}/{len(clips)} clips updated")
    except Exception as e:
        print(f"[Scheduler] View refresh error: {e}")
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
    scheduler.add_job(
        _view_refresh_job,
        CronTrigger(hour="*/6", minute=0),
        id="view_refresh",
        replace_existing=True,
    )
    scheduler.start()
    print(
        f"[Scheduler] Started. Scrape at {settings.SCRAPE_HOUR}:00, "
        f"Outreach at {settings.OUTREACH_HOUR}:00, View refresh every 6h"
    )
