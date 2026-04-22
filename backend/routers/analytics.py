"""
Analytics + email/DM tracking endpoints.
Includes tracking pixel for email opens and unsubscribe handler.
"""

import struct
import zlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from fastapi.responses import Response, HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Creator, EmailLog, DmLog, SequenceEnrollment, ScraperRun

router = APIRouter(tags=["analytics"])


# ── Tracking pixel ───────────────────────────────────────────────

def _make_1x1_gif() -> bytes:
    """Minimal 1×1 transparent GIF."""
    return (
        b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff"
        b"\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,"
        b"\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
    )


@router.get("/track/open/{tracking_id}")
def track_open(tracking_id: str, db: Session = Depends(get_db)):
    log = db.query(EmailLog).filter(EmailLog.tracking_id == tracking_id).first()
    if log:
        log.opened = True
        log.open_count += 1
        if not log.opened_at:
            log.opened_at = datetime.now(timezone.utc)
        db.commit()
    return Response(content=_make_1x1_gif(), media_type="image/gif")


@router.get("/track/unsubscribe/{tracking_id}", response_class=HTMLResponse)
def track_unsubscribe(tracking_id: str, db: Session = Depends(get_db)):
    log = db.query(EmailLog).filter(EmailLog.tracking_id == tracking_id).first()
    if log:
        log.unsubscribed = True
        db.commit()
        # Pause all sequences for this creator
        db.query(SequenceEnrollment).filter(
            SequenceEnrollment.creator_id == log.creator_id
        ).update({"status": "unsubscribed"})
        db.commit()

    return """
    <html><body style="font-family:Arial;text-align:center;padding:60px;">
    <h2>You've been unsubscribed.</h2>
    <p>You won't receive any more emails from ContentCred.</p>
    </body></html>
    """


# ── Dashboard stats ──────────────────────────────────────────────

@router.get("/analytics/overview")
def analytics_overview(db: Session = Depends(get_db)):
    total_creators  = db.query(Creator).count()
    total_contacted = db.query(Creator).filter(Creator.status != "New").count()
    total_replied   = db.query(Creator).filter(Creator.status == "Replied").count()
    total_interested = db.query(Creator).filter(Creator.status == "Interested").count()

    emails_sent   = db.query(EmailLog).count()
    emails_opened = db.query(EmailLog).filter(EmailLog.opened == True).count()
    emails_replied = db.query(EmailLog).filter(EmailLog.replied == True).count()
    emails_bounced = db.query(EmailLog).filter(EmailLog.bounced == True).count()

    dms_sent    = db.query(DmLog).count()
    dms_replied = db.query(DmLog).filter(DmLog.replied == True).count()

    open_rate  = round(emails_opened / emails_sent * 100, 1) if emails_sent else 0
    reply_rate = round(emails_replied / emails_sent * 100, 1) if emails_sent else 0
    dm_reply_rate = round(dms_replied / dms_sent * 100, 1) if dms_sent else 0

    return {
        "creators": {
            "total":      total_creators,
            "contacted":  total_contacted,
            "replied":    total_replied,
            "interested": total_interested,
        },
        "email": {
            "sent":      emails_sent,
            "opened":    emails_opened,
            "replied":   emails_replied,
            "bounced":   emails_bounced,
            "open_rate": open_rate,
            "reply_rate": reply_rate,
        },
        "instagram_dm": {
            "sent":       dms_sent,
            "replied":    dms_replied,
            "reply_rate": dm_reply_rate,
        },
    }


@router.get("/analytics/by-persona")
def analytics_by_persona(db: Session = Depends(get_db)):
    rows = (
        db.query(Creator.persona, func.count(Creator.id))
        .group_by(Creator.persona)
        .all()
    )
    return [{"persona": r[0], "count": r[1]} for r in rows]


@router.get("/analytics/by-platform")
def analytics_by_platform(db: Session = Depends(get_db)):
    rows = (
        db.query(Creator.primary_platform, func.count(Creator.id))
        .group_by(Creator.primary_platform)
        .all()
    )
    return [{"platform": r[0], "count": r[1]} for r in rows]


@router.get("/analytics/scraper-runs")
def scraper_runs(limit: int = 10, db: Session = Depends(get_db)):
    runs = (
        db.query(ScraperRun)
        .order_by(ScraperRun.started_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":              r.id,
            "started_at":      r.started_at,
            "completed_at":    r.completed_at,
            "status":          r.status,
            "creators_found":  r.creators_found,
            "creators_added":  r.creators_added,
            "source_breakdown": r.source_breakdown,
        }
        for r in runs
    ]
