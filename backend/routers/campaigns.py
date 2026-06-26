"""
Clipping Campaigns API
Implements the full Whop Content Rewards feature set:
  - Campaign CRUD with budget/CPM/payout caps
  - Clipper management (admin + self-signup via public token)
  - Submission workflow: pending → approved / flagged / rejected
  - 48-hour auto-approve
  - Per-submission earnings calculation
  - Bot detection on every metric update
  - Leaderboard, analysis, and public discovery endpoints
"""

import csv
import io
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Campaign, Clipper, ClipSubmission, ViewSnapshot, PayoutBatch
from bot_detection import analyze as bot_analyze
from outreach.email_sender import send_clip_approved, send_clip_rejected
import view_fetcher

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


# ── Earnings helper ───────────────────────────────────────────────

def _calc_earnings(views: int, campaign: Campaign) -> float:
    if campaign.reward_per_1k_views <= 0 or views <= 0:
        return 0.0
    amount = (views / 1000) * campaign.reward_per_1k_views + campaign.flat_fee
    if campaign.max_payout_per_submission > 0:
        amount = min(amount, campaign.max_payout_per_submission)
    if amount < campaign.min_payout:
        return 0.0
    return round(amount, 2)


def _run_bot(clip: ClipSubmission, db: Session) -> None:
    snaps = (
        db.query(ViewSnapshot)
        .filter(ViewSnapshot.clip_id == clip.id)
        .order_by(ViewSnapshot.recorded_at.asc())
        .all()
    )
    result = bot_analyze(
        platform=clip.platform,
        views=clip.current_views,
        likes=clip.likes,
        comments=clip.comments,
        shares=clip.shares,
        snapshots=[{"views": s.views, "recorded_at": s.recorded_at} for s in snaps],
    )
    clip.bot_score = result.score
    clip.bot_flag  = result.flag
    clip.bot_reasons = json.dumps(result.reasons)


def _check_auto_approve(clip: ClipSubmission, campaign: Campaign, db: Session) -> bool:
    """Auto-approve if past deadline and bot score is not botted."""
    if clip.approval_status != "pending":
        return False
    if not clip.auto_approve_at:
        return False
    now = datetime.now(timezone.utc)
    aa = clip.auto_approve_at
    if aa.tzinfo is None:
        aa = aa.replace(tzinfo=timezone.utc)
    if now < aa:
        return False
    if clip.bot_flag == "botted":
        clip.approval_status = "flagged"
        db.commit()
        return False
    # Auto-approve
    clip.approval_status = "approved"
    clip.approved_at = now
    earnings = _calc_earnings(clip.current_views, campaign)
    clip.earnings = earnings
    clip.views_at_approval = clip.current_views
    campaign.budget_spent = round(campaign.budget_spent + earnings, 2)
    # Update clipper total earnings
    clipper = db.query(Clipper).filter(Clipper.id == clip.clipper_id).first()
    if clipper:
        clipper.total_earnings = round(clipper.total_earnings + earnings, 2)
    db.commit()
    return True


# ── Schemas ───────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str
    content_type: Optional[str] = "clipping"
    category: Optional[str] = ""
    description: Optional[str] = ""
    guidelines: Optional[str] = ""
    tutorial_video_url: Optional[str] = ""
    budget: Optional[float] = 0.0
    reward_per_1k_views: Optional[float] = 0.0
    flat_fee: Optional[float] = 0.0
    min_payout: Optional[float] = 0.0
    max_payout_per_submission: Optional[float] = 0.0
    allowed_platforms: Optional[List[str]] = ["tiktok", "instagram", "youtube"]
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    auto_approve_hours: Optional[int] = 48


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    guidelines: Optional[str] = None
    tutorial_video_url: Optional[str] = None
    status: Optional[str] = None
    min_payout: Optional[float] = None
    max_payout_per_submission: Optional[float] = None
    end_date: Optional[datetime] = None
    auto_approve_hours: Optional[int] = None


class CampaignOut(BaseModel):
    id: int
    name: str
    content_type: str
    category: str
    description: str
    guidelines: str
    tutorial_video_url: str
    status: str
    allowed_platforms: str
    budget: float
    budget_spent: float
    budget_remaining: float = 0.0
    reward_per_1k_views: float
    flat_fee: float
    min_payout: float
    max_payout_per_submission: float
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    submission_token: str
    auto_approve_hours: int
    created_at: datetime
    clipper_count: int = 0
    total_views: int = 0
    pending_count: int = 0
    approved_count: int = 0
    flagged_count: int = 0
    rejected_count: int = 0

    class Config:
        from_attributes = True


class ClipperCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    tiktok_handle: Optional[str] = ""
    instagram_handle: Optional[str] = ""
    youtube_handle: Optional[str] = ""
    twitter_handle: Optional[str] = ""
    notes: Optional[str] = ""


class ClipperUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    tiktok_handle: Optional[str] = None
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    status: Optional[str] = None
    is_banned: Optional[bool] = None
    notes: Optional[str] = None


class ClipperOut(BaseModel):
    id: int
    campaign_id: int
    name: str
    email: str
    tiktok_handle: str
    instagram_handle: str
    youtube_handle: str
    twitter_handle: str
    status: str
    is_banned: bool
    total_earnings: float
    notes: str
    created_at: datetime
    clip_count: int = 0
    total_views: int = 0
    organic_views: int = 0
    approved_clips: int = 0
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


class MetricsUpdate(BaseModel):
    current_views: int
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None


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
    approval_status: str
    rejection_reason: str
    ban_clipper: bool
    approved_at: Optional[datetime]
    auto_approve_at: Optional[datetime]
    earnings: float
    views_at_approval: int
    bot_score: int
    bot_flag: str
    bot_reasons: str
    last_checked_at: Optional[datetime]
    submitted_at: datetime
    clipper_name: str = ""
    clipper_email: str = ""

    class Config:
        from_attributes = True


class ApproveRequest(BaseModel):
    pass


class RejectRequest(BaseModel):
    reason: str
    ban_clipper: Optional[bool] = False


class FlagRequest(BaseModel):
    reason: Optional[str] = ""


class PublicSubmitRequest(BaseModel):
    name: str
    email: str
    url: str
    platform: str
    tiktok_handle: Optional[str] = ""
    instagram_handle: Optional[str] = ""
    youtube_handle: Optional[str] = ""
    title: Optional[str] = ""


# ── Helpers ───────────────────────────────────────────────────────

def _enrich_campaign(c: Campaign, db: Session) -> CampaignOut:
    clips = (
        db.query(ClipSubmission.approval_status, func.sum(ClipSubmission.current_views))
        .join(Clipper, ClipSubmission.clipper_id == Clipper.id)
        .filter(Clipper.campaign_id == c.id)
        .group_by(ClipSubmission.approval_status)
        .all()
    )
    counts = {"pending": 0, "approved": 0, "flagged": 0, "rejected": 0}
    total_views = 0
    for status, views in clips:
        counts[status] = counts.get(status, 0) + 1
        if status == "approved":
            total_views += (views or 0)

    out = CampaignOut.model_validate(c)
    out.clipper_count = len(c.clippers)
    out.total_views = total_views
    out.budget_remaining = max(0.0, round(c.budget - c.budget_spent, 2))
    out.pending_count = counts["pending"]
    out.approved_count = counts["approved"]
    out.flagged_count = counts["flagged"]
    out.rejected_count = counts["rejected"]
    return out


def _enrich_clipper(clipper: Clipper) -> ClipperOut:
    clips = clipper.clips
    out = ClipperOut.model_validate(clipper)
    out.clip_count = len(clips)
    out.total_views = sum(c.current_views for c in clips)
    out.organic_views = sum(c.current_views for c in clips if c.bot_flag in ("clean", "monitor"))
    out.approved_clips = sum(1 for c in clips if c.approval_status == "approved")
    out.flagged_clips = sum(1 for c in clips if c.approval_status == "flagged")
    return out


def _enrich_clip(clip: ClipSubmission, db: Session) -> ClipOut:
    out = ClipOut.model_validate(clip)
    clipper = db.query(Clipper).filter(Clipper.id == clip.clipper_id).first()
    if clipper:
        out.clipper_name = clipper.name
        out.clipper_email = clipper.email
    return out


# ── Campaign CRUD ─────────────────────────────────────────────────

@router.get("/", response_model=List[CampaignOut])
def list_campaigns(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Campaign).options(joinedload(Campaign.clippers))
    if status:
        q = q.filter(Campaign.status == status)
    return [_enrich_campaign(c, db) for c in q.order_by(Campaign.created_at.desc()).all()]


@router.post("/", response_model=CampaignOut)
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    platforms = payload.pop("allowed_platforms", ["tiktok", "instagram", "youtube"])
    payload["allowed_platforms"] = json.dumps(platforms)
    campaign = Campaign(**payload)
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _enrich_campaign(campaign, db)


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(Campaign).options(joinedload(Campaign.clippers)).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    return _enrich_campaign(c, db)


@router.patch("/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: int, data: CampaignUpdate, db: Session = Depends(get_db)):
    c = db.query(Campaign).options(joinedload(Campaign.clippers)).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    return _enrich_campaign(c, db)


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


# ── Clipper CRUD ──────────────────────────────────────────────────

@router.get("/{campaign_id}/clippers", response_model=List[ClipperOut])
def list_clippers(campaign_id: int, db: Session = Depends(get_db)):
    clippers = (
        db.query(Clipper)
        .filter(Clipper.campaign_id == campaign_id)
        .options(joinedload(Clipper.clips))
        .all()
    )
    return [_enrich_clipper(c) for c in clippers]


@router.post("/{campaign_id}/clippers", response_model=ClipperOut)
def add_clipper(campaign_id: int, data: ClipperCreate, db: Session = Depends(get_db)):
    if not db.query(Campaign).filter(Campaign.id == campaign_id).first():
        raise HTTPException(404, "Campaign not found")
    clipper = Clipper(campaign_id=campaign_id, **data.model_dump())
    db.add(clipper)
    db.commit()
    db.refresh(clipper)
    return _enrich_clipper(clipper)


@router.patch("/{campaign_id}/clippers/{clipper_id}", response_model=ClipperOut)
def update_clipper(campaign_id: int, clipper_id: int, data: ClipperUpdate, db: Session = Depends(get_db)):
    clipper = (
        db.query(Clipper)
        .filter(Clipper.id == clipper_id, Clipper.campaign_id == campaign_id)
        .options(joinedload(Clipper.clips))
        .first()
    )
    if not clipper:
        raise HTTPException(404, "Clipper not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(clipper, field, value)
    db.commit()
    db.refresh(clipper)
    return _enrich_clipper(clipper)


@router.delete("/{campaign_id}/clippers/{clipper_id}")
def delete_clipper(campaign_id: int, clipper_id: int, db: Session = Depends(get_db)):
    clipper = db.query(Clipper).filter(Clipper.id == clipper_id, Clipper.campaign_id == campaign_id).first()
    if not clipper:
        raise HTTPException(404, "Clipper not found")
    db.delete(clipper)
    db.commit()
    return {"ok": True}


# ── Clip submission CRUD ──────────────────────────────────────────

@router.get("/{campaign_id}/clippers/{clipper_id}/clips", response_model=List[ClipOut])
def list_clips(campaign_id: int, clipper_id: int, db: Session = Depends(get_db)):
    clips = (
        db.query(ClipSubmission)
        .filter(ClipSubmission.clipper_id == clipper_id, ClipSubmission.campaign_id == campaign_id)
        .order_by(ClipSubmission.submitted_at.desc())
        .all()
    )
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    for clip in clips:
        _check_auto_approve(clip, campaign, db)
    return [_enrich_clip(c, db) for c in clips]


@router.post("/{campaign_id}/clippers/{clipper_id}/clips", response_model=ClipOut)
def add_clip(campaign_id: int, clipper_id: int, data: ClipCreate, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    clipper = db.query(Clipper).filter(Clipper.id == clipper_id, Clipper.campaign_id == campaign_id).first()
    if not campaign or not clipper:
        raise HTTPException(404, "Campaign or clipper not found")
    if clipper.is_banned:
        raise HTTPException(403, "Clipper is banned from this campaign")

    now = datetime.now(timezone.utc)
    auto_at = now + timedelta(hours=campaign.auto_approve_hours) if campaign.auto_approve_hours > 0 else None

    clip = ClipSubmission(
        clipper_id=clipper_id,
        campaign_id=campaign_id,
        auto_approve_at=auto_at,
        last_checked_at=now if data.current_views else None,
        **data.model_dump(),
    )
    db.add(clip)
    db.flush()

    if clip.current_views:
        db.add(ViewSnapshot(clip_id=clip.id, views=clip.current_views))
        db.flush()

    _run_bot(clip, db)
    # Auto-flag if botted at submission time
    if clip.bot_flag == "botted":
        clip.approval_status = "flagged"

    db.commit()
    db.refresh(clip)
    return _enrich_clip(clip, db)


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
        raise HTTPException(404, "Clip not found")

    clip.current_views = data.current_views
    if data.likes    is not None: clip.likes    = data.likes
    if data.comments is not None: clip.comments = data.comments
    if data.shares   is not None: clip.shares   = data.shares
    clip.last_checked_at = datetime.now(timezone.utc)

    db.add(ViewSnapshot(clip_id=clip.id, views=data.current_views))
    db.flush()
    _run_bot(clip, db)

    # Re-flag if bot score crossed threshold and still pending
    if clip.bot_flag == "botted" and clip.approval_status == "pending":
        clip.approval_status = "flagged"

    db.commit()
    db.refresh(clip)
    return _enrich_clip(clip, db)


@router.delete("/{campaign_id}/clippers/{clipper_id}/clips/{clip_id}")
def delete_clip(campaign_id: int, clipper_id: int, clip_id: int, db: Session = Depends(get_db)):
    clip = db.query(ClipSubmission).filter(
        ClipSubmission.id == clip_id, ClipSubmission.clipper_id == clipper_id
    ).first()
    if not clip:
        raise HTTPException(404, "Clip not found")
    db.delete(clip)
    db.commit()
    return {"ok": True}


@router.get("/{campaign_id}/clippers/{clipper_id}/clips/{clip_id}/history")
def clip_history(campaign_id: int, clipper_id: int, clip_id: int, db: Session = Depends(get_db)):
    snaps = (
        db.query(ViewSnapshot)
        .filter(ViewSnapshot.clip_id == clip_id)
        .order_by(ViewSnapshot.recorded_at.asc())
        .all()
    )
    return [{"views": s.views, "recorded_at": s.recorded_at} for s in snaps]


# ── Approval workflow ─────────────────────────────────────────────

@router.get("/{campaign_id}/submissions", response_model=List[ClipOut])
def list_all_submissions(
    campaign_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    q = db.query(ClipSubmission).filter(ClipSubmission.campaign_id == campaign_id)
    if status:
        q = q.filter(ClipSubmission.approval_status == status)

    clips = q.order_by(ClipSubmission.submitted_at.desc()).all()

    # Run auto-approve check on pending clips
    for clip in clips:
        _check_auto_approve(clip, campaign, db)

    return [_enrich_clip(c, db) for c in clips]


@router.post("/{campaign_id}/submissions/{clip_id}/approve", response_model=ClipOut)
def approve_submission(campaign_id: int, clip_id: int, db: Session = Depends(get_db)):
    clip = db.query(ClipSubmission).filter(
        ClipSubmission.id == clip_id, ClipSubmission.campaign_id == campaign_id
    ).first()
    if not clip:
        raise HTTPException(404, "Submission not found")

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()

    now = datetime.now(timezone.utc)
    clip.approval_status = "approved"
    clip.approved_at = now
    earnings = _calc_earnings(clip.current_views, campaign)
    clip.earnings = earnings
    clip.views_at_approval = clip.current_views
    campaign.budget_spent = round(campaign.budget_spent + earnings, 2)

    clipper = db.query(Clipper).filter(Clipper.id == clip.clipper_id).first()
    if clipper:
        clipper.total_earnings = round(clipper.total_earnings + earnings, 2)

    db.commit()
    db.refresh(clip)

    if clipper and clipper.email:
        send_clip_approved(clipper.email, clipper.name, campaign.name, earnings, clip.url)

    return _enrich_clip(clip, db)


@router.post("/{campaign_id}/submissions/{clip_id}/reject", response_model=ClipOut)
def reject_submission(campaign_id: int, clip_id: int, data: RejectRequest, db: Session = Depends(get_db)):
    clip = db.query(ClipSubmission).filter(
        ClipSubmission.id == clip_id, ClipSubmission.campaign_id == campaign_id
    ).first()
    if not clip:
        raise HTTPException(404, "Submission not found")

    clip.approval_status = "rejected"
    clip.rejection_reason = data.reason
    clip.ban_clipper = data.ban_clipper or False

    clipper = db.query(Clipper).filter(Clipper.id == clip.clipper_id).first()
    if data.ban_clipper and clipper:
        clipper.is_banned = True

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()

    db.commit()
    db.refresh(clip)

    if clipper and clipper.email and campaign:
        send_clip_rejected(clipper.email, clipper.name, campaign.name, data.reason, clip.url)

    return _enrich_clip(clip, db)


@router.post("/{campaign_id}/submissions/{clip_id}/flag", response_model=ClipOut)
def flag_submission(campaign_id: int, clip_id: int, data: FlagRequest, db: Session = Depends(get_db)):
    clip = db.query(ClipSubmission).filter(
        ClipSubmission.id == clip_id, ClipSubmission.campaign_id == campaign_id
    ).first()
    if not clip:
        raise HTTPException(404, "Submission not found")

    clip.approval_status = "flagged"
    if data.reason:
        existing = json.loads(clip.bot_reasons or "[]")
        existing.insert(0, data.reason)
        clip.bot_reasons = json.dumps(existing)

    db.commit()
    db.refresh(clip)
    return _enrich_clip(clip, db)


# ── Leaderboard ───────────────────────────────────────────────────

@router.get("/{campaign_id}/leaderboard")
def leaderboard(campaign_id: int, db: Session = Depends(get_db)):
    clippers = (
        db.query(Clipper)
        .filter(Clipper.campaign_id == campaign_id)
        .options(joinedload(Clipper.clips))
        .all()
    )
    rows = []
    for idx, clipper in enumerate(clippers):
        approved = [c for c in clipper.clips if c.approval_status == "approved"]
        total_views = sum(c.views_at_approval for c in approved)
        total_earnings = clipper.total_earnings
        rows.append({
            "rank": 0,
            "clipper_id": clipper.id,
            "name": clipper.name,
            "email": clipper.email,
            "tiktok_handle": clipper.tiktok_handle,
            "instagram_handle": clipper.instagram_handle,
            "youtube_handle": clipper.youtube_handle,
            "is_banned": clipper.is_banned,
            "approved_clips": len(approved),
            "total_views": total_views,
            "total_earnings": total_earnings,
        })
    rows.sort(key=lambda r: r["total_earnings"], reverse=True)
    for i, row in enumerate(rows):
        row["rank"] = i + 1
    return rows


# ── Bot analysis ──────────────────────────────────────────────────

@router.get("/{campaign_id}/analysis")
def campaign_analysis(campaign_id: int, db: Session = Depends(get_db)):
    clips = db.query(ClipSubmission).filter(ClipSubmission.campaign_id == campaign_id).all()
    total_views = sum(c.current_views for c in clips)
    by_flag = {"clean": 0, "monitor": 0, "suspicious": 0, "botted": 0}
    views_by_flag = {"clean": 0, "monitor": 0, "suspicious": 0, "botted": 0}
    for c in clips:
        f = c.bot_flag or "clean"
        by_flag[f] = by_flag.get(f, 0) + 1
        views_by_flag[f] = views_by_flag.get(f, 0) + c.current_views

    organic = views_by_flag["clean"] + views_by_flag["monitor"]
    suspect = views_by_flag["suspicious"] + views_by_flag["botted"]
    flagged = [
        {
            "id": c.id, "url": c.url, "platform": c.platform, "clipper_id": c.clipper_id,
            "current_views": c.current_views, "likes": c.likes, "comments": c.comments,
            "shares": c.shares, "bot_score": c.bot_score, "bot_flag": c.bot_flag,
            "approval_status": c.approval_status,
            "bot_reasons": json.loads(c.bot_reasons) if c.bot_reasons else [],
        }
        for c in clips if c.bot_flag in ("suspicious", "botted")
    ]
    flagged.sort(key=lambda x: x["bot_score"], reverse=True)
    return {
        "total_clips": len(clips), "total_views": total_views,
        "organic_views": organic, "suspect_views": suspect,
        "organic_pct": round(organic / total_views * 100, 1) if total_views else 0,
        "clips_by_flag": by_flag, "views_by_flag": views_by_flag,
        "flagged_clips": flagged,
    }


# ── Public endpoints ──────────────────────────────────────────────

@router.get("/discover/list")
def discover(db: Session = Depends(get_db)):
    """Public campaign discovery — only active campaigns with remaining budget."""
    campaigns = (
        db.query(Campaign)
        .filter(Campaign.status == "active")
        .order_by(Campaign.created_at.desc())
        .all()
    )
    result = []
    for c in campaigns:
        if c.budget > 0 and c.budget_spent >= c.budget:
            continue
        platforms = json.loads(c.allowed_platforms) if c.allowed_platforms else []
        result.append({
            "id": c.id,
            "name": c.name,
            "content_type": c.content_type,
            "category": c.category,
            "description": c.description,
            "guidelines": c.guidelines,
            "tutorial_video_url": c.tutorial_video_url,
            "reward_per_1k_views": c.reward_per_1k_views,
            "flat_fee": c.flat_fee,
            "min_payout": c.min_payout,
            "max_payout_per_submission": c.max_payout_per_submission,
            "budget_remaining": max(0.0, round(c.budget - c.budget_spent, 2)),
            "allowed_platforms": platforms,
            "submission_token": c.submission_token,
            "end_date": c.end_date,
        })
    return result


@router.get("/public/{token}")
def public_campaign(token: str, db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.submission_token == token).first()
    if not c or c.status != "active":
        raise HTTPException(404, "Campaign not found or inactive")
    platforms = json.loads(c.allowed_platforms) if c.allowed_platforms else []
    return {
        "id": c.id,
        "name": c.name,
        "content_type": c.content_type,
        "category": c.category,
        "description": c.description,
        "guidelines": c.guidelines,
        "tutorial_video_url": c.tutorial_video_url,
        "reward_per_1k_views": c.reward_per_1k_views,
        "flat_fee": c.flat_fee,
        "min_payout": c.min_payout,
        "max_payout_per_submission": c.max_payout_per_submission,
        "budget_remaining": max(0.0, round(c.budget - c.budget_spent, 2)),
        "allowed_platforms": platforms,
        "end_date": c.end_date,
    }


# ── Budget top-up ─────────────────────────────────────────────────

class TopupRequest(BaseModel):
    amount: float


@router.post("/{campaign_id}/topup", response_model=CampaignOut)
def topup_budget(campaign_id: int, data: TopupRequest, db: Session = Depends(get_db)):
    c = db.query(Campaign).options(joinedload(Campaign.clippers)).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    if data.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    c.budget = round(c.budget + data.amount, 2)
    db.commit()
    db.refresh(c)
    return _enrich_campaign(c, db)


# ── Campaign clone ────────────────────────────────────────────────

@router.post("/{campaign_id}/clone", response_model=CampaignOut)
def clone_campaign(campaign_id: int, db: Session = Depends(get_db)):
    import uuid as _uuid
    src = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not src:
        raise HTTPException(404, "Campaign not found")
    clone = Campaign(
        name=f"{src.name} (Copy)",
        content_type=src.content_type,
        category=src.category,
        description=src.description,
        guidelines=src.guidelines,
        tutorial_video_url=src.tutorial_video_url,
        status="paused",
        allowed_platforms=src.allowed_platforms,
        budget=src.budget,
        budget_spent=0.0,
        reward_per_1k_views=src.reward_per_1k_views,
        flat_fee=src.flat_fee,
        min_payout=src.min_payout,
        max_payout_per_submission=src.max_payout_per_submission,
        auto_approve_hours=src.auto_approve_hours,
        submission_token=_uuid.uuid4().hex,
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return _enrich_campaign(clone, db)


# ── Payout management ─────────────────────────────────────────────

@router.get("/{campaign_id}/payout-queue")
def payout_queue(campaign_id: int, db: Session = Depends(get_db)):
    clips = (
        db.query(ClipSubmission)
        .filter(
            ClipSubmission.campaign_id == campaign_id,
            ClipSubmission.approval_status == "approved",
            ClipSubmission.payout_status == "unpaid",
            ClipSubmission.earnings > 0,
        )
        .order_by(ClipSubmission.approved_at.asc())
        .all()
    )
    rows = []
    for clip in clips:
        clipper = db.query(Clipper).filter(Clipper.id == clip.clipper_id).first()
        rows.append({
            "clip_id": clip.id,
            "clipper_id": clip.clipper_id,
            "clipper_name": clipper.name if clipper else "",
            "clipper_email": clipper.email if clipper else "",
            "url": clip.url,
            "platform": clip.platform,
            "views_at_approval": clip.views_at_approval,
            "earnings": clip.earnings,
            "approved_at": clip.approved_at,
        })
    total = round(sum(r["earnings"] for r in rows), 2)
    return {"clips": rows, "total_amount": total, "clip_count": len(rows)}


class PayoutRequest(BaseModel):
    notes: Optional[str] = ""


@router.post("/{campaign_id}/payout")
def create_payout(campaign_id: int, data: PayoutRequest, db: Session = Depends(get_db)):
    clips = (
        db.query(ClipSubmission)
        .filter(
            ClipSubmission.campaign_id == campaign_id,
            ClipSubmission.approval_status == "approved",
            ClipSubmission.payout_status == "unpaid",
            ClipSubmission.earnings > 0,
        )
        .all()
    )
    if not clips:
        raise HTTPException(400, "No unpaid approved clips found")

    total = round(sum(c.earnings for c in clips), 2)
    clipper_ids = set(c.clipper_id for c in clips)

    batch = PayoutBatch(
        campaign_id=campaign_id,
        total_amount=total,
        clip_count=len(clips),
        clipper_count=len(clipper_ids),
        notes=data.notes or "",
    )
    db.add(batch)
    db.flush()

    for clip in clips:
        clip.payout_status = "paid"
        clip.payout_batch_id = batch.id

    db.commit()
    return {
        "ok": True,
        "batch_id": batch.id,
        "total_amount": total,
        "clip_count": len(clips),
        "clipper_count": len(clipper_ids),
    }


@router.get("/{campaign_id}/payout-batches")
def list_payout_batches(campaign_id: int, db: Session = Depends(get_db)):
    batches = (
        db.query(PayoutBatch)
        .filter(PayoutBatch.campaign_id == campaign_id)
        .order_by(PayoutBatch.created_at.desc())
        .all()
    )
    return [
        {
            "id": b.id,
            "total_amount": b.total_amount,
            "clip_count": b.clip_count,
            "clipper_count": b.clipper_count,
            "status": b.status,
            "notes": b.notes,
            "created_at": b.created_at,
        }
        for b in batches
    ]


# ── CSV Export ────────────────────────────────────────────────────

@router.get("/{campaign_id}/export.csv")
def export_csv(campaign_id: int, db: Session = Depends(get_db)):
    clippers = (
        db.query(Clipper)
        .filter(Clipper.campaign_id == campaign_id)
        .options(joinedload(Clipper.clips))
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Name", "Email", "TikTok", "Instagram", "YouTube",
        "Approved Clips", "Total Views", "Total Earnings", "Payout Status", "Banned",
    ])
    for clipper in clippers:
        approved = [c for c in clipper.clips if c.approval_status == "approved"]
        total_views = sum(c.views_at_approval for c in approved)
        unpaid = sum(1 for c in approved if c.payout_status == "unpaid")
        writer.writerow([
            clipper.name,
            clipper.email,
            clipper.tiktok_handle,
            clipper.instagram_handle,
            clipper.youtube_handle,
            len(approved),
            total_views,
            f"{clipper.total_earnings:.2f}",
            "partial" if unpaid > 0 and unpaid < len(approved) else ("unpaid" if unpaid else "paid"),
            "yes" if clipper.is_banned else "no",
        ])

    output.seek(0)
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    name_slug = (campaign.name if campaign else "campaign").replace(" ", "_")
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={name_slug}_clippers.csv"},
    )


# ── View refresh (per clip and bulk) ─────────────────────────────

@router.post("/{campaign_id}/submissions/{clip_id}/fetch-views", response_model=ClipOut)
def fetch_clip_views(campaign_id: int, clip_id: int, db: Session = Depends(get_db)):
    clip = db.query(ClipSubmission).filter(
        ClipSubmission.id == clip_id, ClipSubmission.campaign_id == campaign_id
    ).first()
    if not clip:
        raise HTTPException(404, "Submission not found")

    result = view_fetcher.fetch_views(clip.platform, clip.url)
    if result is None:
        raise HTTPException(422, f"View fetching not supported for {clip.platform} or failed")

    views, eng = result
    clip.current_views = views
    if eng.get("likes"):    clip.likes    = eng["likes"]
    if eng.get("comments"): clip.comments = eng["comments"]
    if eng.get("shares"):   clip.shares   = eng["shares"]
    clip.last_checked_at = datetime.now(timezone.utc)

    db.add(ViewSnapshot(clip_id=clip.id, views=views))
    db.flush()
    _run_bot(clip, db)

    if clip.bot_flag == "botted" and clip.approval_status == "pending":
        clip.approval_status = "flagged"

    db.commit()
    db.refresh(clip)
    return _enrich_clip(clip, db)


@router.post("/{campaign_id}/refresh-views")
def refresh_all_views(campaign_id: int, db: Session = Depends(get_db)):
    """Refresh views for all approved and pending clips in this campaign."""
    clips = (
        db.query(ClipSubmission)
        .filter(
            ClipSubmission.campaign_id == campaign_id,
            ClipSubmission.approval_status.in_(["pending", "approved"]),
            ClipSubmission.platform.in_(["youtube", "tiktok"]),
        )
        .all()
    )
    updated = 0
    failed = 0
    for clip in clips:
        result = view_fetcher.fetch_views(clip.platform, clip.url)
        if result is None:
            failed += 1
            continue
        views, eng = result
        clip.current_views = views
        if eng.get("likes"):    clip.likes    = eng["likes"]
        if eng.get("comments"): clip.comments = eng["comments"]
        clip.last_checked_at = datetime.now(timezone.utc)
        db.add(ViewSnapshot(clip_id=clip.id, views=views))
        db.flush()
        _run_bot(clip, db)
        if clip.bot_flag == "botted" and clip.approval_status == "pending":
            clip.approval_status = "flagged"
        updated += 1
    db.commit()
    return {"ok": True, "updated": updated, "failed": failed, "total": len(clips)}


@router.post("/public/{token}/submit")
def public_submit(token: str, data: PublicSubmitRequest, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.submission_token == token).first()
    if not campaign or campaign.status != "active":
        raise HTTPException(404, "Campaign not found or inactive")

    if campaign.budget > 0 and campaign.budget_spent >= campaign.budget:
        raise HTTPException(400, "Campaign budget has been exhausted")

    # Find or create clipper by email
    clipper = db.query(Clipper).filter(
        Clipper.campaign_id == campaign.id, Clipper.email == data.email
    ).first()

    if clipper and clipper.is_banned:
        raise HTTPException(403, "You have been banned from this campaign")

    if not clipper:
        clipper = Clipper(
            campaign_id=campaign.id,
            name=data.name,
            email=data.email,
            tiktok_handle=data.tiktok_handle or "",
            instagram_handle=data.instagram_handle or "",
            youtube_handle=data.youtube_handle or "",
        )
        db.add(clipper)
        db.flush()

    now = datetime.now(timezone.utc)
    auto_at = now + timedelta(hours=campaign.auto_approve_hours) if campaign.auto_approve_hours > 0 else None

    clip = ClipSubmission(
        clipper_id=clipper.id,
        campaign_id=campaign.id,
        url=data.url,
        platform=data.platform,
        title=data.title or "",
        auto_approve_at=auto_at,
    )
    db.add(clip)
    db.flush()

    _run_bot(clip, db)
    if clip.bot_flag == "botted":
        clip.approval_status = "flagged"

    db.commit()
    return {
        "ok": True,
        "submission_id": clip.id,
        "clipper_id": clipper.id,
        "status": clip.approval_status,
        "auto_approve_at": auto_at,
        "message": (
            "Submission received and will be reviewed within "
            f"{campaign.auto_approve_hours} hours."
            if campaign.auto_approve_hours else
            "Submission received and is pending manual review."
        ),
    }
