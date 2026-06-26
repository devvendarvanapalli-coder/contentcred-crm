"""
Public-facing endpoints for clippers to look up their own submission status.
No authentication required — clipper looks up by email.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Clipper, ClipSubmission, Campaign

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/status")
def clipper_status(email: str, db: Session = Depends(get_db)):
    """Look up all submissions for a clipper email across all campaigns."""
    if not email or "@" not in email:
        raise HTTPException(400, "Valid email required")

    clippers = (
        db.query(Clipper)
        .filter(Clipper.email == email.strip().lower())
        .options(joinedload(Clipper.clips))
        .all()
    )

    if not clippers:
        return {"email": email, "submissions": [], "total_earnings": 0.0, "campaigns": []}

    submissions = []
    seen_campaigns = {}
    total_earnings = 0.0

    for clipper in clippers:
        campaign = db.query(Campaign).filter(Campaign.id == clipper.campaign_id).first()
        if not campaign:
            continue
        if campaign.id not in seen_campaigns:
            seen_campaigns[campaign.id] = campaign.name

        for clip in sorted(clipper.clips, key=lambda c: c.submitted_at, reverse=True):
            submissions.append({
                "submission_id": clip.id,
                "campaign_id": campaign.id,
                "campaign_name": campaign.name,
                "url": clip.url,
                "platform": clip.platform,
                "title": clip.title,
                "current_views": clip.current_views,
                "approval_status": clip.approval_status,
                "earnings": clip.earnings,
                "payout_status": clip.payout_status,
                "bot_flag": clip.bot_flag,
                "submitted_at": clip.submitted_at,
                "approved_at": clip.approved_at,
            })
            if clip.approval_status == "approved":
                total_earnings += clip.earnings

    return {
        "email": email,
        "total_earnings": round(total_earnings, 2),
        "campaigns": [{"id": cid, "name": name} for cid, name in seen_campaigns.items()],
        "submissions": submissions,
    }
