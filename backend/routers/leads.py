"""
Creator (lead) CRUD API.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import Creator

router = APIRouter(prefix="/creators", tags=["creators"])


# ── Schemas ──────────────────────────────────────────────────────

class CreatorOut(BaseModel):
    id: int
    full_name: str
    email: str
    persona: str
    youtube_channel: str
    youtube_handle: str
    spotify_profile: str
    instagram_handle: str
    tiktok_handle: str
    twitter_handle: str
    website: str
    youtube_subs: int
    monthly_views: int
    spotify_monthly: int
    instagram_followers: int
    tiktok_followers: int
    niche: str
    primary_platform: str
    source: str
    status: str
    notes: str
    created_at: datetime

    class Config:
        from_attributes = True


class CreatorUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    email: Optional[str] = None
    persona: Optional[str] = None


# ── Routes ───────────────────────────────────────────────────────

@router.get("/", response_model=list[CreatorOut])
def list_creators(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    persona: Optional[str] = None,
    platform: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Creator)
    if status:
        q = q.filter(Creator.status == status)
    if persona:
        q = q.filter(Creator.persona == persona)
    if platform:
        q = q.filter(Creator.primary_platform == platform)
    if search:
        q = q.filter(
            or_(
                Creator.full_name.ilike(f"%{search}%"),
                Creator.niche.ilike(f"%{search}%"),
                Creator.instagram_handle.ilike(f"%{search}%"),
                Creator.youtube_handle.ilike(f"%{search}%"),
            )
        )
    total = q.count()
    creators = q.offset((page - 1) * per_page).limit(per_page).all()
    return creators


@router.get("/{creator_id}", response_model=CreatorOut)
def get_creator(creator_id: int, db: Session = Depends(get_db)):
    creator = db.query(Creator).filter(Creator.id == creator_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    return creator


@router.patch("/{creator_id}", response_model=CreatorOut)
def update_creator(creator_id: int, data: CreatorUpdate, db: Session = Depends(get_db)):
    creator = db.query(Creator).filter(Creator.id == creator_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(creator, field, value)
    db.commit()
    db.refresh(creator)
    return creator


@router.delete("/{creator_id}")
def delete_creator(creator_id: int, db: Session = Depends(get_db)):
    creator = db.query(Creator).filter(Creator.id == creator_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    db.delete(creator)
    db.commit()
    return {"ok": True}
