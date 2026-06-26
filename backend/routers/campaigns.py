"""
Clipping Campaigns API — campaigns, clippers, clip submissions, view tracking, bot detection.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import Campaign, Clipper, ClipSubmission, ViewSnapshot
from bot_detection import analyze as bot_analyze

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


# ── Schemas ──────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    platform: Optional[str] = "any"
    reward_per_1k_views: Optional[float] = 0.0
    target_views: Optional[int] = 0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    platform: Optional[str] = None
    reward_per_1k_views: Optional[float] = None
    target_views: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class CampaignOut(BaseModel):
    id: int
    name: str
    description: str
    status: str
    platform: str
    reward_per_1k_views: float
    target_views: int
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime
    clipper_count: int = 0
    total_views: int = 0
    flagged_clips: int = 0

    class Config:
        from_attributes = True


class ClipperCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    tiktok_handle: Optional[str] = ""
    instagram_handle: Optional[str] = ""
    youtube_handle: Optional[str] = ""
    notes: Optional[str] = ""


class ClipperUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    tiktok_handle: Optional[str] = None
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ClipperOut(BaseModel):
    id: int
    campaign_id: int
    name: str
    email: str
    tiktok_handle: str
    instagram_handle: str
    youtube_handle: str
    status: str
    notes: str
    created_at: datetime
    clip_count: int = 0
    total_views: int = 0
    organic_views: int = 0
    flagged_clips: int = 0

    class Config:
        from_attributes = True


class ClipCreate(BaseModel):
    url: str
    platform: Optional[str] = "tiktok"
    title: Optional[str] = ""
    current_views: Optional[int] = 0
    likes: Optional[int] = 0
    comments: Optional[int] = 0
    shares: Optional[int] = 0


class ClipOut(BaseModel):
    id: int
    clipper_id: int
    campaign_id: int
    url: str
    platform: str
    title: str
    current_views: int
    likes: int
    comments: int
    shares: int
    bot_score: int
    bot_flag: str
    bot_reasons: str
    last_checked_at: Optional[datetime]
    submitted_at: datetime

    class Config:
        from_attributes = True


class MetricsUpdate(BaseModel):
    current_views: int
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None


# ── Helpers ───────────────────────────────────────────────────────

def _total_views_for_campaign(db: Session, campaign_id: int) -> int:
    return (
        db.query(func.sum(ClipSubmission.current_views))
        .join(Clipper, ClipSubmission.clipper_id == Clipper.id)
        .filter(Clipper.campaign_id == campaign_id)
        .scalar() or 0
    )


def _flagged_count_for_campaign(db: Session, campaign_id: int) -> int:
    return (
        db.query(func.count(ClipSubmission.id))
        .join(Clipper, ClipSubmission.clipper_id == Clipper.id)
        .filter(
            Clipper.campaign_id == campaign_id,
            ClipSubmission.bot_flag.in_(["suspicious", "botted"]),
        )
        .scalar() or 0
    )


def _run_bot_analysis(clip: ClipSubmission, db: Session) -> None:
    snaps = (
        db.query(ViewSnapshot)
        .filter(ViewSnapshot.clip_id == clip.id)
        .order_by(ViewSnapshot.recorded_at.asc())
        .all()
    )
    snapshot_dicts = [{"views": s.views, "recorded_at": s.recorded_at} for s in snaps]

    result = bot_analyze(
        platform=clip.platform,
        views=clip.current_views,
        likes=clip.likes,
        comments=clip.comments,
        shares=clip.shares,
        snapshots=snapshot_dicts,
    )
    clip.bot_score = result.score
    clip.bot_flag = result.flag
    clip.bot_reasons = json.dumps(result.reasons)


def _clipper_out(clipper: Clipper) -> ClipperOut:
    clips = clipper.clips
    organic = sum(c.current_views for c in clips if c.bot_flag in ("clean", "monitor"))
    flagged = sum(1 for c in clips if c.bot_flag in ("suspicious", "botted"))
    out = ClipperOut.model_validate(clipper)
    out.clip_count = len(clips)
    out.total_views = sum(c.current_views for c in clips)
    out.organic_views = organic
    out.flagged_clips = flagged
    return out


# ── Campaign routes ───────────────────────────────────────────────

@router.get("/", response_model=List[CampaignOut])
def list_campaigns(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Campaign)
    if status:
        q = q.filter(Campaign.status == status)
    campaigns = q.order_by(Campaign.created_at.desc()).all()

    result = []
    for c in campaigns:
        out = CampaignOut.model_validate(c)
        out.clipper_count = len(c.clippers)
        out.total_views = _total_views_for_campaign(db, c.id)
        out.flagged_clips = _flagged_count_for_campaign(db, c.id)
        result.append(out)
    return result


@router.post("/", response_model=CampaignOut)
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db)):
    campaign = Campaign(**data.model_dump())
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    out = CampaignOut.model_validate(campaign)
    out.clipper_count = 0
    out.total_views = 0
    out.flagged_clips = 0
    return out


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).options(joinedload(Campaign.clippers)).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    out = CampaignOut.model_validate(campaign)
    out.clipper_count = len(campaign.clippers)
    out.total_views = _total_views_for_campaign(db, campaign_id)
    out.flagged_clips = _flagged_count_for_campaign(db, campaign_id)
    return out


@router.patch("/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: int, data: CampaignUpdate, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(campaign, field, value)
    db.commit()
    db.refresh(campaign)
    out = CampaignOut.model_validate(campaign)
    out.clipper_count = len(campaign.clippers)
    out.total_views = _total_views_for_campaign(db, campaign_id)
    out.flagged_clips = _flagged_count_for_campaign(db, campaign_id)
    return out


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"ok": True}


# ── Clipper routes ────────────────────────────────────────────────

@router.get("/{campaign_id}/clippers", response_model=List[ClipperOut])
def list_clippers(campaign_id: int, db: Session = Depends(get_db)):
    clippers = (
        db.query(Clipper)
        .filter(Clipper.campaign_id == campaign_id)
        .options(joinedload(Clipper.clips))
        .all()
    )
    return [_clipper_out(c) for c in clippers]


@router.post("/{campaign_id}/clippers", response_model=ClipperOut)
def add_clipper(campaign_id: int, data: ClipperCreate, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    clipper = Clipper(campaign_id=campaign_id, **data.model_dump())
    db.add(clipper)
    db.commit()
    db.refresh(clipper)
    return _clipper_out(clipper)


@router.patch("/{campaign_id}/clippers/{clipper_id}", response_model=ClipperOut)
def update_clipper(campaign_id: int, clipper_id: int, data: ClipperUpdate, db: Session = Depends(get_db)):
    clipper = (
        db.query(Clipper)
        .filter(Clipper.id == clipper_id, Clipper.campaign_id == campaign_id)
        .options(joinedload(Clipper.clips))
        .first()
    )
    if not clipper:
        raise HTTPException(status_code=404, detail="Clipper not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(clipper, field, value)
    db.commit()
    db.refresh(clipper)
    return _clipper_out(clipper)


@router.delete("/{campaign_id}/clippers/{clipper_id}")
def delete_clipper(campaign_id: int, clipper_id: int, db: Session = Depends(get_db)):
    clipper = db.query(Clipper).filter(
        Clipper.id == clipper_id, Clipper.campaign_id == campaign_id
    ).first()
    if not clipper:
        raise HTTPException(status_code=404, detail="Clipper not found")
    db.delete(clipper)
    db.commit()
    return {"ok": True}


# ── Clip submission routes ────────────────────────────────────────

@router.get("/{campaign_id}/clippers/{clipper_id}/clips", response_model=List[ClipOut])
def list_clips(campaign_id: int, clipper_id: int, db: Session = Depends(get_db)):
    return (
        db.query(ClipSubmission)
        .filter(ClipSubmission.clipper_id == clipper_id, ClipSubmission.campaign_id == campaign_id)
        .order_by(ClipSubmission.submitted_at.desc())
        .all()
    )


@router.post("/{campaign_id}/clippers/{clipper_id}/clips", response_model=ClipOut)
def add_clip(campaign_id: int, clipper_id: int, data: ClipCreate, db: Session = Depends(get_db)):
    clipper = db.query(Clipper).filter(
        Clipper.id == clipper_id, Clipper.campaign_id == campaign_id
    ).first()
    if not clipper:
        raise HTTPException(status_code=404, detail="Clipper not found")

    clip = ClipSubmission(
        clipper_id=clipper_id,
        campaign_id=campaign_id,
        last_checked_at=datetime.now(timezone.utc) if data.current_views else None,
        **data.model_dump(),
    )
    db.add(clip)
    db.flush()  # get clip.id

    if clip.current_views:
        snap = ViewSnapshot(clip_id=clip.id, views=clip.current_views)
        db.add(snap)
        db.flush()

    _run_bot_analysis(clip, db)
    db.commit()
    db.refresh(clip)
    return clip


@router.patch("/{campaign_id}/clippers/{clipper_id}/clips/{clip_id}", response_model=ClipOut)
def update_clip_metrics(
    campaign_id: int, clipper_id: int, clip_id: int,
    data: MetricsUpdate, db: Session = Depends(get_db),
):
    clip = db.query(ClipSubmission).filter(
        ClipSubmission.id == clip_id,
        ClipSubmission.clipper_id == clipper_id,
        ClipSubmission.campaign_id == campaign_id,
    ).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    clip.current_views = data.current_views
    if data.likes is not None:
        clip.likes = data.likes
    if data.comments is not None:
        clip.comments = data.comments
    if data.shares is not None:
        clip.shares = data.shares
    clip.last_checked_at = datetime.now(timezone.utc)

    snap = ViewSnapshot(clip_id=clip.id, views=data.current_views)
    db.add(snap)
    db.flush()

    _run_bot_analysis(clip, db)
    db.commit()
    db.refresh(clip)
    return clip


@router.delete("/{campaign_id}/clippers/{clipper_id}/clips/{clip_id}")
def delete_clip(campaign_id: int, clipper_id: int, clip_id: int, db: Session = Depends(get_db)):
    clip = db.query(ClipSubmission).filter(
        ClipSubmission.id == clip_id,
        ClipSubmission.clipper_id == clipper_id,
    ).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    db.delete(clip)
    db.commit()
    return {"ok": True}


@router.get("/{campaign_id}/clippers/{clipper_id}/clips/{clip_id}/history")
def clip_view_history(campaign_id: int, clipper_id: int, clip_id: int, db: Session = Depends(get_db)):
    snaps = (
        db.query(ViewSnapshot)
        .filter(ViewSnapshot.clip_id == clip_id)
        .order_by(ViewSnapshot.recorded_at.asc())
        .all()
    )
    return [{"views": s.views, "recorded_at": s.recorded_at} for s in snaps]


# ── Campaign-wide analysis ────────────────────────────────────────

@router.get("/{campaign_id}/clips", response_model=List[ClipOut])
def all_campaign_clips(
    campaign_id: int,
    flag: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(ClipSubmission).filter(ClipSubmission.campaign_id == campaign_id)
    if flag:
        q = q.filter(ClipSubmission.bot_flag == flag)
    return q.order_by(ClipSubmission.current_views.desc()).all()


@router.get("/{campaign_id}/analysis")
def campaign_analysis(campaign_id: int, db: Session = Depends(get_db)):
    """Summary of organic vs botted views across the whole campaign."""
    clips = (
        db.query(ClipSubmission)
        .filter(ClipSubmission.campaign_id == campaign_id)
        .all()
    )

    total_views = sum(c.current_views for c in clips)
    by_flag = {"clean": 0, "monitor": 0, "suspicious": 0, "botted": 0}
    views_by_flag = {"clean": 0, "monitor": 0, "suspicious": 0, "botted": 0}

    for c in clips:
        flag = c.bot_flag or "clean"
        by_flag[flag] = by_flag.get(flag, 0) + 1
        views_by_flag[flag] = views_by_flag.get(flag, 0) + c.current_views

    organic_views = views_by_flag["clean"] + views_by_flag["monitor"]
    suspect_views = views_by_flag["suspicious"] + views_by_flag["botted"]

    flagged_clips = [
        {
            "id": c.id,
            "url": c.url,
            "platform": c.platform,
            "clipper_id": c.clipper_id,
            "current_views": c.current_views,
            "likes": c.likes,
            "comments": c.comments,
            "shares": c.shares,
            "bot_score": c.bot_score,
            "bot_flag": c.bot_flag,
            "bot_reasons": json.loads(c.bot_reasons) if c.bot_reasons else [],
        }
        for c in clips
        if c.bot_flag in ("suspicious", "botted")
    ]
    flagged_clips.sort(key=lambda x: x["bot_score"], reverse=True)

    return {
        "total_clips": len(clips),
        "total_views": total_views,
        "organic_views": organic_views,
        "suspect_views": suspect_views,
        "organic_pct": round(organic_views / total_views * 100, 1) if total_views else 0,
        "clips_by_flag": by_flag,
        "views_by_flag": views_by_flag,
        "flagged_clips": flagged_clips,
    }
