"""
ContentCred sequence engine.
Runs daily outreach: enrolls new creators, advances active sequences.

Channels:
  email     — 5 steps on days [0, 3, 7, 11, 14]
  instagram — 4 steps on days [0, 4, 8, 14]
"""

import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from models import Creator, SequenceEnrollment, EmailLog
from database import settings
from outreach.templates import (
    SEQUENCE_DAYS, DM_SEQUENCE_DAYS,
    render_email, render_dm,
)
from outreach.email_sender import send_email
from outreach.instagram_dm import send_instagram_dm


# ─────────────────────────────────────────────────────────────────
# Enroll new creators
# ─────────────────────────────────────────────────────────────────

def auto_enroll_new_creators(db: Session) -> int:
    """Enroll all 'New' status creators that have no active sequence."""
    enrolled = 0
    new_creators = db.query(Creator).filter(Creator.status == "New").all()

    for creator in new_creators:
        existing = (
            db.query(SequenceEnrollment)
            .filter(SequenceEnrollment.creator_id == creator.id)
            .first()
        )
        if existing:
            continue

        now = datetime.now(timezone.utc)

        # Always enroll in email if they have an email address
        if creator.email:
            email_enroll = SequenceEnrollment(
                creator_id=creator.id,
                channel="email",
                status="active",
                current_step=0,
                next_send_at=now,
            )
            db.add(email_enroll)

        # Enroll in Instagram DM if they have a handle
        if creator.instagram_handle:
            ig_enroll = SequenceEnrollment(
                creator_id=creator.id,
                channel="instagram",
                status="active",
                current_step=0,
                next_send_at=now,
            )
            db.add(ig_enroll)

        creator.status = "Contacted"
        enrolled += 1

    db.commit()
    return enrolled


# ─────────────────────────────────────────────────────────────────
# Process email sequences
# ─────────────────────────────────────────────────────────────────

def process_email_sequences(db: Session) -> int:
    """Send pending email steps. Returns count sent."""
    now = datetime.now(timezone.utc)
    sent = 0
    daily_limit = settings.DAILY_EMAIL_LIMIT

    pending = (
        db.query(SequenceEnrollment)
        .filter(
            SequenceEnrollment.channel == "email",
            SequenceEnrollment.status == "active",
            SequenceEnrollment.next_send_at <= now,
        )
        .limit(daily_limit)
        .all()
    )

    for enrollment in pending:
        if sent >= daily_limit:
            break

        creator = db.query(Creator).filter(Creator.id == enrollment.creator_id).first()
        if not creator or not creator.email:
            enrollment.status = "completed"
            db.commit()
            continue

        # Check if already replied → pause
        replied = (
            db.query(EmailLog)
            .filter(
                EmailLog.creator_id == creator.id,
                EmailLog.replied == True,
            )
            .first()
        )
        if replied:
            enrollment.status = "paused"
            db.commit()
            continue

        step = enrollment.current_step
        rendered = render_email(
            persona=creator.persona or "video_creator",
            step=step,
            creator=creator.__dict__,
            sender_name=settings.SENDER_NAME,
            calendly=settings.CALENDLY_LINK,
        )

        tracking_id = send_email(
            to_email=creator.email,
            subject=rendered["subject"],
            body_text=rendered["body"],
            creator_id=creator.id,
            step=step,
            db=db,
        )

        if tracking_id:
            sent += 1
            next_step = step + 1
            if next_step >= len(SEQUENCE_DAYS):
                enrollment.status = "completed"
            else:
                enrollment.current_step = next_step
                days_gap = SEQUENCE_DAYS[next_step] - SEQUENCE_DAYS[step]
                enrollment.next_send_at = now + timedelta(days=days_gap)

            db.commit()

    return sent


# ─────────────────────────────────────────────────────────────────
# Process Instagram DM sequences
# ─────────────────────────────────────────────────────────────────

async def process_instagram_sequences(db: Session) -> int:
    """Send pending Instagram DM steps. Returns count sent."""
    now = datetime.now(timezone.utc)
    sent = 0
    daily_limit = settings.DAILY_INSTAGRAM_DM_LIMIT

    pending = (
        db.query(SequenceEnrollment)
        .filter(
            SequenceEnrollment.channel == "instagram",
            SequenceEnrollment.status == "active",
            SequenceEnrollment.next_send_at <= now,
        )
        .limit(daily_limit)
        .all()
    )

    for enrollment in pending:
        if sent >= daily_limit:
            break

        creator = db.query(Creator).filter(Creator.id == enrollment.creator_id).first()
        if not creator or not creator.instagram_handle:
            enrollment.status = "completed"
            db.commit()
            continue

        step = enrollment.current_step
        message = render_dm(
            persona=creator.persona or "video_creator",
            step=step,
            creator=creator.__dict__,
            sender_name=settings.SENDER_NAME,
            calendly=settings.CALENDLY_LINK,
        )

        success = await send_instagram_dm(
            handle=creator.instagram_handle,
            message=message,
            creator_id=creator.id,
            step=step,
            db=db,
        )

        if success:
            sent += 1
            next_step = step + 1
            if next_step >= len(DM_SEQUENCE_DAYS):
                enrollment.status = "completed"
            else:
                enrollment.current_step = next_step
                days_gap = DM_SEQUENCE_DAYS[next_step] - DM_SEQUENCE_DAYS[step]
                enrollment.next_send_at = now + timedelta(days=days_gap)

            db.commit()

        # Small delay between DMs to avoid rate-limiting
        await asyncio.sleep(30)

    return sent


# ─────────────────────────────────────────────────────────────────
# Master daily outreach runner
# ─────────────────────────────────────────────────────────────────

async def run_daily_outreach(db: Session) -> dict:
    """
    Called by the scheduler every day at OUTREACH_HOUR.
    1. Enroll new creators
    2. Send email steps
    3. Send Instagram DM steps
    """
    print("[Outreach] Starting daily outreach...")

    enrolled   = auto_enroll_new_creators(db)
    emails_sent = process_email_sequences(db)
    dms_sent    = await process_instagram_sequences(db)

    summary = {
        "enrolled":    enrolled,
        "emails_sent": emails_sent,
        "dms_sent":    dms_sent,
    }
    print(f"[Outreach] Done: {summary}")
    return summary
