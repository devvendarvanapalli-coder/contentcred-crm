"""
Clipping Campaigns API — campaigns, clippers, and submission tracking.
"""

import re
import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from database import get_db
from models import Campaign, Clipper, ClipSubmission

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


# ── Schemas ──────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str
    description: str = ""
    source_video_url: str = ""
    reward_per_1k_views: float = 0.0
    status: str = "active"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source_video_url: Optional[str] = None
    reward_per_1k_views: Optional[float] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class CampaignOut(BaseModel):
    id: int
    name: str
    description: str
    source_video_url: str
    reward_per_1k_views: float
    status: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime
    total_views: int = 0
    total_submissions: int = 0
    total_clippers: int = 0

    class Config:
        from_attributes = True


class ClipperCreate(BaseModel):
    name: str
    email: str = ""
    tiktok_handle: str = ""
    youtube_handle: str = ""
    instagram_handle: str = ""
    notes: str = ""


class ClipperOut(BaseModel):
    id: int
    name: str
    email: str
    tiktok_handle: str
    youtube_handle: str
    instagram_handle: str
    notes: str
    created_at: datetime

    class Config:
        from_attributes = True


class SubmissionCreate(BaseModel):
    clipper_id: int
    post_url: str
    platform: str  # tiktok | youtube | instagram
    views: int = 0


class SubmissionUpdate(BaseModel):
    views: Optional[int] = None
    likes: Optional[int] = None
    status: Optional[str] = None


class SubmissionOut(BaseModel):
    id: int
    campaign_id: int
    clipper_id: int
    post_url: str
    platform: str
    views: int
    likes: int
    status: str
    last_checked_at: Optional[datetime]
    submitted_at: datetime
    clipper_name: str = ""
    clipper_email: str = ""
    estimated_earnings: float = 0.0

    class Config:
        from_attributes = True


# ── Helpers ──────────────────────────────────────────────────────

def _detect_platform(url: str) -> str:
    url = url.lower()
    if "tiktok.com" in url:
        return "tiktok"
    if "youtube.com" in url or "youtu.be" in url:
        return "youtube"
    if "instagram.com" in url:
        return "instagram"
    return "other"


def _enrich_submission(sub: ClipSubmission, reward_per_1k: float) -> dict:
    d = {
        "id": sub.id,
        "campaign_id": sub.campaign_id,
        "clipper_id": sub.clipper_id,
        "post_url": sub.post_url,
        "platform": sub.platform,
        "views": sub.views,
        "likes": sub.likes,
        "status": sub.status,
        "last_checked_at": sub.last_checked_at,
        "submitted_at": sub.submitted_at,
        "clipper_name": sub.clipper.name if sub.clipper else "",
        "clipper_email": sub.clipper.email if sub.clipper else "",
        "estimated_earnings": round((sub.views / 1000) * reward_per_1k, 2),
    }
    return d


def _enrich_campaign(campaign: Campaign) -> dict:
    subs = campaign.submissions
    total_views = sum(s.views for s in subs)
    total_clippers = len({s.clipper_id for s in subs})
    return {
        "id": campaign.id,
        "name": campaign.name,
        "description": campaign.description,
        "source_video_url": campaign.source_video_url,
        "reward_per_1k_views": campaign.reward_per_1k_views,
        "status": campaign.status,
        "start_date": campaign.start_date,
        "end_date": campaign.end_date,
        "created_at": campaign.created_at,
        "total_views": total_views,
        "total_submissions": len(subs),
        "total_clippers": total_clippers,
    }


async def _fetch_views_from_url(post_url: str) -> dict:
    """
    Attempt to retrieve view/like counts for a clip post.
    Uses oEmbed or public API endpoints where available.
    Falls back gracefully — caller handles None.
    """
    platform = _detect_platform(post_url)
    try:
        if platform == "youtube":
            # Extract video ID from URL
            match = re.search(r"(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})", post_url)
            if match:
                vid_id = match.group(1)
                async with httpx.AsyncClient(timeout=10) as client:
                    r = await client.get(
                        "https://www.youtube.com/oembed",
                        params={"url": f"https://youtu.be/{vid_id}", "format": "json"},
                    )
                    if r.status_code == 200:
                        # oEmbed doesn't return views; return None to indicate manual update needed
                        return {}
        # TikTok and Instagram require auth tokens — skip for now
    except Exception:
        pass
    return {}


# ── Campaign Routes ───────────────────────────────────────────────

@router.get("/", response_model=list[CampaignOut])
def list_campaigns(db: Session = Depends(get_db)):
    campaigns = (
        db.query(Campaign)
        .options(joinedload(Campaign.submissions).joinedload(ClipSubmission.clipper))
        .order_by(Campaign.created_at.desc())
        .all()
    )
    return [_enrich_campaign(c) for c in campaigns]


@router.post("/", response_model=CampaignOut, status_code=201)
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db)):
    campaign = Campaign(**data.dict())
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _enrich_campaign(campaign)


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = (
        db.query(Campaign)
        .options(joinedload(Campaign.submissions).joinedload(ClipSubmission.clipper))
        .filter(Campaign.id == campaign_id)
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _enrich_campaign(campaign)


@router.patch("/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: int, data: CampaignUpdate, db: Session = Depends(get_db)):
    campaign = (
        db.query(Campaign)
        .options(joinedload(Campaign.submissions).joinedload(ClipSubmission.clipper))
        .filter(Campaign.id == campaign_id)
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(campaign, field, value)
    db.commit()
    db.refresh(campaign)
    return _enrich_campaign(campaign)


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"ok": True}


# ── Submission Routes ─────────────────────────────────────────────

@router.get("/{campaign_id}/submissions", response_model=list[SubmissionOut])
def list_submissions(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    subs = (
        db.query(ClipSubmission)
        .options(joinedload(ClipSubmission.clipper))
        .filter(ClipSubmission.campaign_id == campaign_id)
        .order_by(ClipSubmission.views.desc())
        .all()
    )
    return [_enrich_submission(s, campaign.reward_per_1k_views) for s in subs]


@router.post("/{campaign_id}/submissions", response_model=SubmissionOut, status_code=201)
def add_submission(campaign_id: int, data: SubmissionCreate, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    clipper = db.query(Clipper).filter(Clipper.id == data.clipper_id).first()
    if not clipper:
        raise HTTPException(status_code=404, detail="Clipper not found")

    platform = data.platform or _detect_platform(data.post_url)
    sub = ClipSubmission(
        campaign_id=campaign_id,
        clipper_id=data.clipper_id,
        post_url=data.post_url,
        platform=platform,
        views=data.views,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    sub = (
        db.query(ClipSubmission)
        .options(joinedload(ClipSubmission.clipper))
        .filter(ClipSubmission.id == sub.id)
        .first()
    )
    return _enrich_submission(sub, campaign.reward_per_1k_views)


@router.patch("/{campaign_id}/submissions/{submission_id}", response_model=SubmissionOut)
def update_submission(
    campaign_id: int,
    submission_id: int,
    data: SubmissionUpdate,
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    sub = (
        db.query(ClipSubmission)
        .options(joinedload(ClipSubmission.clipper))
        .filter(ClipSubmission.id == submission_id, ClipSubmission.campaign_id == campaign_id)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(sub, field, value)
    if data.views is not None:
        sub.last_checked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sub)
    return _enrich_submission(sub, campaign.reward_per_1k_views)


@router.delete("/{campaign_id}/submissions/{submission_id}")
def delete_submission(campaign_id: int, submission_id: int, db: Session = Depends(get_db)):
    sub = (
        db.query(ClipSubmission)
        .filter(ClipSubmission.id == submission_id, ClipSubmission.campaign_id == campaign_id)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    db.delete(sub)
    db.commit()
    return {"ok": True}


@router.post("/{campaign_id}/submissions/{submission_id}/refresh-views", response_model=SubmissionOut)
async def refresh_views(campaign_id: int, submission_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    sub = (
        db.query(ClipSubmission)
        .options(joinedload(ClipSubmission.clipper))
        .filter(ClipSubmission.id == submission_id, ClipSubmission.campaign_id == campaign_id)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    data = await _fetch_views_from_url(sub.post_url)
    if data.get("views") is not None:
        sub.views = data["views"]
    if data.get("likes") is not None:
        sub.likes = data["likes"]
    sub.last_checked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sub)
    return _enrich_submission(sub, campaign.reward_per_1k_views)


# ── Clipper Routes ────────────────────────────────────────────────

@router.get("/clippers/all", response_model=list[ClipperOut])
def list_clippers(db: Session = Depends(get_db)):
    return db.query(Clipper).order_by(Clipper.created_at.desc()).all()


@router.post("/clippers", response_model=ClipperOut, status_code=201)
def create_clipper(data: ClipperCreate, db: Session = Depends(get_db)):
    clipper = Clipper(**data.dict())
    db.add(clipper)
    db.commit()
    db.refresh(clipper)
    return clipper


@router.patch("/clippers/{clipper_id}", response_model=ClipperOut)
def update_clipper(clipper_id: int, data: ClipperCreate, db: Session = Depends(get_db)):
    clipper = db.query(Clipper).filter(Clipper.id == clipper_id).first()
    if not clipper:
        raise HTTPException(status_code=404, detail="Clipper not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(clipper, field, value)
    db.commit()
    db.refresh(clipper)
    return clipper


@router.delete("/clippers/{clipper_id}")
def delete_clipper(clipper_id: int, db: Session = Depends(get_db)):
    clipper = db.query(Clipper).filter(Clipper.id == clipper_id).first()
    if not clipper:
        raise HTTPException(status_code=404, detail="Clipper not found")
    db.delete(clipper)
    db.commit()
    return {"ok": True}
