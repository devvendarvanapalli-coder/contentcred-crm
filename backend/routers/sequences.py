"""
Sequence management API.
Lets you manually trigger outreach, pause/resume enrollments.
"""

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db
from models import SequenceEnrollment
from outreach.sequence_engine import run_daily_outreach
from scraper.orchestrator import run_daily_scrape

router = APIRouter(prefix="/sequences", tags=["sequences"])


@router.post("/trigger-outreach")
async def trigger_outreach(db: Session = Depends(get_db)):
    """Manually fire the daily outreach job."""
    result = await run_daily_outreach(db)
    return result


@router.post("/trigger-scrape")
async def trigger_scrape(db: Session = Depends(get_db)):
    """Manually fire the daily scrape job."""
    result = await run_daily_scrape(db)
    return result


@router.get("/enrollments")
def list_enrollments(db: Session = Depends(get_db)):
    rows = db.query(SequenceEnrollment).order_by(SequenceEnrollment.enrolled_at.desc()).limit(200).all()
    return [
        {
            "id":           r.id,
            "creator_id":   r.creator_id,
            "channel":      r.channel,
            "status":       r.status,
            "current_step": r.current_step,
            "next_send_at": r.next_send_at,
            "enrolled_at":  r.enrolled_at,
        }
        for r in rows
    ]


@router.post("/enrollments/{enrollment_id}/pause")
def pause_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    enr = db.query(SequenceEnrollment).filter(SequenceEnrollment.id == enrollment_id).first()
    if enr:
        enr.status = "paused"
        db.commit()
    return {"ok": True}


@router.post("/enrollments/{enrollment_id}/resume")
def resume_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    enr = db.query(SequenceEnrollment).filter(SequenceEnrollment.id == enrollment_id).first()
    if enr:
        enr.status = "active"
        db.commit()
    return {"ok": True}
