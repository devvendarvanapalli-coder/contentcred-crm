"""
Clipping Campaigns API — campaigns, clippers, clip submissions, view tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import Campaign, Clipper, ClipSubmission, ViewSnapshot

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

    class Config:
        from_attributes = True


class ClipCreate(BaseModel):
    url: str
    platform: Optional[str] = "tiktok"
    title: Optional[str] = ""
    current_views: Optional[int] = 0


class ClipUpdate(BaseModel):
    url: Optional[str] = None
    title: Optional[str] = None
    current_views: Optional[int] = None


class ClipOut(BaseModel):
    id: int
    clipper_id: int
    campaign_id: int
    url: str
    platform: str
    title: str
    current_views: int
    last_checked_at: Optional[datetime]
    submitted_at: datetime

    class Config:
        from_attributes = True


class ViewUpdate(BaseModel):
    current_views: int


# ── Campaign routes ───────────────────────────────────────────────

@router.get("/", response_model=List[CampaignOut])
def list_campaigns(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Campaign)
    if status:
        q = q.filter(Campaign.status == status)
    campaigns = q.order_by(Campaign.created_at.desc()).all()

    result = []
    for c in campaigns:
        total_views = (
            db.query(func.sum(ClipSubmission.current_views))
            .join(Clipper, ClipSubmission.clipper_id == Clipper.id)
            .filter(Clipper.campaign_id == c.id)
            .scalar() or 0
        )
        out = CampaignOut.model_validate(c)
        out.clipper_count = len(c.clippers)
        out.total_views = total_views
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
    return out


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    total_views = (
        db.query(func.sum(ClipSubmission.current_views))
        .join(Clipper, ClipSubmission.clipper_id == Clipper.id)
        .filter(Clipper.campaign_id == campaign_id)
        .scalar() or 0
    )
    out = CampaignOut.model_validate(campaign)
    out.clipper_count = len(campaign.clippers)
    out.total_views = total_views
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
    total_views = (
        db.query(func.sum(ClipSubmission.current_views))
        .join(Clipper, ClipSubmission.clipper_id == Clipper.id)
        .filter(Clipper.campaign_id == campaign_id)
        .scalar() or 0
    )
    out = CampaignOut.model_validate(campaign)
    out.clipper_count = len(campaign.clippers)
    out.total_views = total_views
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
    result = []
    for clipper in clippers:
        out = ClipperOut.model_validate(clipper)
        out.clip_count = len(clipper.clips)
        out.total_views = sum(c.current_views for c in clipper.clips)
        result.append(out)
    return result


@router.post("/{campaign_id}/clippers", response_model=ClipperOut)
def add_clipper(campaign_id: int, data: ClipperCreate, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    clipper = Clipper(campaign_id=campaign_id, **data.model_dump())
    db.add(clipper)
    db.commit()
    db.refresh(clipper)
    out = ClipperOut.model_validate(clipper)
    out.clip_count = 0
    out.total_views = 0
    return out


@router.patch("/{campaign_id}/clippers/{clipper_id}", response_model=ClipperOut)
def update_clipper(campaign_id: int, clipper_id: int, data: ClipperUpdate, db: Session = Depends(get_db)):
    clipper = db.query(Clipper).filter(
        Clipper.id == clipper_id, Clipper.campaign_id == campaign_id
    ).first()
    if not clipper:
        raise HTTPException(status_code=404, detail="Clipper not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(clipper, field, value)
    db.commit()
    db.refresh(clipper)
    out = ClipperOut.model_validate(clipper)
    out.clip_count = len(clipper.clips)
    out.total_views = sum(c.current_views for c in clipper.clips)
    return out


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
    db.commit()
    db.refresh(clip)
    if clip.current_views:
        snap = ViewSnapshot(clip_id=clip.id, views=clip.current_views)
        db.add(snap)
        db.commit()
    return clip


@router.patch("/{campaign_id}/clippers/{clipper_id}/clips/{clip_id}", response_model=ClipOut)
def update_clip_views(
    campaign_id: int, clipper_id: int, clip_id: int,
    data: ViewUpdate, db: Session = Depends(get_db)
):
    clip = db.query(ClipSubmission).filter(
        ClipSubmission.id == clip_id,
        ClipSubmission.clipper_id == clipper_id,
        ClipSubmission.campaign_id == campaign_id,
    ).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    clip.current_views = data.current_views
    clip.last_checked_at = datetime.now(timezone.utc)
    snap = ViewSnapshot(clip_id=clip.id, views=data.current_views)
    db.add(snap)
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


# ── Campaign-level clips feed (all clippers) ──────────────────────

@router.get("/{campaign_id}/clips", response_model=List[ClipOut])
def all_campaign_clips(campaign_id: int, db: Session = Depends(get_db)):
    return (
        db.query(ClipSubmission)
        .filter(ClipSubmission.campaign_id == campaign_id)
        .order_by(ClipSubmission.current_views.desc())
        .all()
    )
