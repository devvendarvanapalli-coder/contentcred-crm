"""
ContentCred CRM — SQLAlchemy models
Tracks creators across YouTube, Spotify, Instagram, and TikTok.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    Text, Float, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base


class Creator(Base):
    """One row per unique creator / prospect."""
    __tablename__ = "creators"

    id               = Column(Integer, primary_key=True, index=True)

    # Identity
    full_name        = Column(String(200), default="")
    email            = Column(String(200), default="", index=True)
    persona          = Column(String(50), default="")     # musician | video_creator | personal_brand

    # Platform handles
    youtube_channel  = Column(String(300), default="")
    youtube_handle   = Column(String(100), default="")
    spotify_profile  = Column(String(300), default="")
    instagram_handle = Column(String(100), default="")
    tiktok_handle    = Column(String(100), default="")
    twitter_handle   = Column(String(100), default="")
    website          = Column(String(300), default="")

    # Audience metrics (refreshed on each scrape hit)
    youtube_subs     = Column(Integer, default=0)
    monthly_views    = Column(Integer, default=0)
    spotify_monthly  = Column(Integer, default=0)   # monthly listeners
    instagram_followers = Column(Integer, default=0)
    tiktok_followers = Column(Integer, default=0)

    # Content info
    niche            = Column(String(200), default="")    # e.g. "Hip-Hop", "Finance", "Travel"
    content_type     = Column(String(100), default="")    # e.g. "Short-form", "Long-form", "Podcast"
    primary_platform = Column(String(50), default="")     # youtube | spotify | instagram | tiktok
    posting_frequency = Column(String(50), default="")

    # Scraper metadata
    source           = Column(String(50), default="")     # YouTube | Spotify | Instagram | TikTok
    scraped_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # CRM state
    status           = Column(String(50), default="New")
    # New → Contacted → Replied → Interested → Not Interested → Closed
    notes            = Column(Text, default="")

    created_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    enrollments      = relationship("SequenceEnrollment", back_populates="creator")
    email_logs       = relationship("EmailLog", back_populates="creator")
    dm_logs          = relationship("DmLog", back_populates="creator")


class ScraperRun(Base):
    """Tracks each daily scrape job."""
    __tablename__ = "scraper_runs"

    id               = Column(Integer, primary_key=True, index=True)
    started_at       = Column(DateTime)
    completed_at     = Column(DateTime, nullable=True)
    status           = Column(String(20), default="running")  # running | completed | failed
    creators_found   = Column(Integer, default=0)
    creators_added   = Column(Integer, default=0)
    source_breakdown = Column(Text, default="{}")             # JSON string
    error_message    = Column(Text, nullable=True)


class SequenceEnrollment(Base):
    """Tracks where each creator is in the outreach sequence."""
    __tablename__ = "sequence_enrollments"

    id               = Column(Integer, primary_key=True, index=True)
    creator_id       = Column(Integer, ForeignKey("creators.id"), index=True)

    channel          = Column(String(20), default="email")    # email | instagram
    status           = Column(String(20), default="active")
    # active | paused | completed | unsubscribed | replied

    current_step     = Column(Integer, default=0)             # 0-based step index
    next_send_at     = Column(DateTime, nullable=True)

    enrolled_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))

    creator          = relationship("Creator", back_populates="enrollments")


class EmailLog(Base):
    """Per-email tracking record."""
    __tablename__ = "email_logs"

    id               = Column(Integer, primary_key=True, index=True)
    creator_id       = Column(Integer, ForeignKey("creators.id"), index=True)
    tracking_id      = Column(String(64), unique=True, index=True)

    step             = Column(Integer, default=0)
    subject          = Column(String(500), default="")
    sent_at          = Column(DateTime, nullable=True)

    opened           = Column(Boolean, default=False)
    opened_at        = Column(DateTime, nullable=True)
    open_count       = Column(Integer, default=0)

    replied          = Column(Boolean, default=False)
    replied_at       = Column(DateTime, nullable=True)

    bounced          = Column(Boolean, default=False)
    unsubscribed     = Column(Boolean, default=False)

    creator          = relationship("Creator", back_populates="email_logs")


class DmLog(Base):
    """Per-DM tracking record (Instagram / TikTok)."""
    __tablename__ = "dm_logs"

    id               = Column(Integer, primary_key=True, index=True)
    creator_id       = Column(Integer, ForeignKey("creators.id"), index=True)

    platform         = Column(String(20), default="instagram")
    step             = Column(Integer, default=0)
    message_preview  = Column(String(300), default="")
    sent_at          = Column(DateTime, nullable=True)

    seen             = Column(Boolean, default=False)
    replied          = Column(Boolean, default=False)
    replied_at       = Column(DateTime, nullable=True)

    creator          = relationship("Creator", back_populates="dm_logs")


# ── Clipping Campaigns ────────────────────────────────────────────

class Campaign(Base):
    """A clipping campaign — clippers post clips and earn rewards per view."""
    __tablename__ = "campaigns"

    id                  = Column(Integer, primary_key=True, index=True)
    name                = Column(String(200), default="")
    description         = Column(Text, default="")
    status              = Column(String(20), default="active")   # active | paused | ended
    platform            = Column(String(20), default="tiktok")   # tiktok | instagram | youtube | any
    reward_per_1k_views = Column(Float, default=0.0)             # USD per 1 000 views
    target_views        = Column(Integer, default=0)
    start_date          = Column(DateTime, nullable=True)
    end_date            = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at          = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                                 onupdate=lambda: datetime.now(timezone.utc))

    clippers            = relationship("Clipper", back_populates="campaign", cascade="all, delete-orphan")


class Clipper(Base):
    """A person participating in a campaign — submits clips from their accounts."""
    __tablename__ = "clippers"

    id                  = Column(Integer, primary_key=True, index=True)
    campaign_id         = Column(Integer, ForeignKey("campaigns.id"), index=True)

    name                = Column(String(200), default="")
    email               = Column(String(200), default="")
    tiktok_handle       = Column(String(100), default="")
    instagram_handle    = Column(String(100), default="")
    youtube_handle      = Column(String(100), default="")
    status              = Column(String(20), default="active")   # active | inactive | banned

    notes               = Column(Text, default="")
    created_at          = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    campaign            = relationship("Campaign", back_populates="clippers")
    clips               = relationship("ClipSubmission", back_populates="clipper", cascade="all, delete-orphan")


class ClipSubmission(Base):
    """A single clip URL submitted by a clipper for a campaign."""
    __tablename__ = "clip_submissions"

    id                  = Column(Integer, primary_key=True, index=True)
    clipper_id          = Column(Integer, ForeignKey("clippers.id"), index=True)
    campaign_id         = Column(Integer, ForeignKey("campaigns.id"), index=True)

    url                 = Column(String(500), default="")
    platform            = Column(String(20), default="tiktok")   # tiktok | instagram | youtube
    title               = Column(String(300), default="")

    current_views       = Column(Integer, default=0)
    last_checked_at     = Column(DateTime, nullable=True)
    submitted_at        = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    clipper             = relationship("Clipper", back_populates="clips")
    snapshots           = relationship("ViewSnapshot", back_populates="clip", cascade="all, delete-orphan")


class ViewSnapshot(Base):
    """Point-in-time view count snapshot for a clip."""
    __tablename__ = "view_snapshots"

    id                  = Column(Integer, primary_key=True, index=True)
    clip_id             = Column(Integer, ForeignKey("clip_submissions.id"), index=True)
    views               = Column(Integer, default=0)
    recorded_at         = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    clip                = relationship("ClipSubmission", back_populates="snapshots")
