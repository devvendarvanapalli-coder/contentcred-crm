"""
ContentCred daily scrape orchestrator.
Combines YouTube (400) + Spotify (200) + Instagram (300) + TikTok (100) = 1,000 creators/day.
Deduplicates, enriches, and inserts into DB.
"""

import asyncio
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from models import Creator, ScraperRun
from database import settings
from scraper import youtube_scraper, spotify_scraper, instagram_scraper, tiktok_scraper
from scraper.email_finder import find_best_email


def _is_duplicate(db: Session, handle: str, email: str) -> bool:
    """Return True if creator already exists by Instagram handle or email."""
    if email:
        if db.query(Creator).filter(Creator.email == email).first():
            return True
    if handle:
        if db.query(Creator).filter(Creator.instagram_handle.ilike(handle)).first():
            return True
    return False


def _dedupe_by_handle(creators: list[dict]) -> list[dict]:
    """Remove in-memory duplicates before hitting DB."""
    seen = set()
    out = []
    for c in creators:
        key = (
            c.get("instagram_handle", "").lower()
            or c.get("youtube_handle", "").lower()
            or c.get("tiktok_handle", "").lower()
            or c.get("spotify_profile", "").lower()
            or c.get("full_name", "").lower()
        )
        if key and key not in seen:
            seen.add(key)
            out.append(c)
    return out


async def run_daily_scrape(db: Session, target: int = None) -> dict:
    if target is None:
        target = settings.DAILY_SCRAPE_TARGET

    run = ScraperRun(started_at=datetime.now(timezone.utc), status="running")
    db.add(run)
    db.commit()
    db.refresh(run)

    all_creators: list[dict] = []
    source_counts = {"youtube": 0, "spotify": 0, "instagram": 0, "tiktok": 0}

    try:
        # ── Source 1: YouTube (400) ───────────────────────────
        print("[Orchestrator] Scraping YouTube...")
        try:
            yt = await youtube_scraper.scrape_creators(count=400)
            all_creators.extend(yt)
            source_counts["youtube"] = len(yt)
            print(f"[Orchestrator] YouTube: {len(yt)} creators")
        except Exception as e:
            print(f"[Orchestrator] YouTube failed: {e}")

        # ── Source 2: Spotify (200) ───────────────────────────
        print("[Orchestrator] Scraping Spotify...")
        try:
            sp = await spotify_scraper.scrape_creators(count=200)
            all_creators.extend(sp)
            source_counts["spotify"] = len(sp)
            print(f"[Orchestrator] Spotify: {len(sp)} creators")
        except Exception as e:
            print(f"[Orchestrator] Spotify failed: {e}")

        # ── Source 3: Instagram (300) ─────────────────────────
        print("[Orchestrator] Scraping Instagram...")
        try:
            ig = await instagram_scraper.scrape_creators(count=300)
            all_creators.extend(ig)
            source_counts["instagram"] = len(ig)
            print(f"[Orchestrator] Instagram: {len(ig)} creators")
        except Exception as e:
            print(f"[Orchestrator] Instagram failed: {e}")

        # ── Source 4: TikTok (100) ────────────────────────────
        print("[Orchestrator] Scraping TikTok...")
        try:
            tt = await tiktok_scraper.scrape_creators(count=100)
            all_creators.extend(tt)
            source_counts["tiktok"] = len(tt)
            print(f"[Orchestrator] TikTok: {len(tt)} creators")
        except Exception as e:
            print(f"[Orchestrator] TikTok failed: {e}")

        # ── In-memory deduplication ───────────────────────────
        all_creators = _dedupe_by_handle(all_creators)

        # ── Enrich: try to find email if missing ──────────────
        for c in all_creators:
            if not c.get("email") and c.get("full_name") and c.get("website"):
                guessed = find_best_email(c["full_name"], c["website"])
                if guessed:
                    c["email"] = guessed

        # ── Deduplicate against DB & insert ───────────────────
        inserted = 0
        for data in all_creators:
            if inserted >= target:
                break

            handle = (
                data.get("instagram_handle", "")
                or data.get("youtube_handle", "")
                or data.get("tiktok_handle", "")
                or ""
            ).strip()
            email = data.get("email", "").strip()

            if not data.get("full_name") and not handle:
                continue
            if _is_duplicate(db, handle, email):
                continue

            creator = Creator(
                full_name            = data.get("full_name", ""),
                email                = email,
                persona              = data.get("persona", "video_creator"),
                youtube_channel      = data.get("youtube_channel", ""),
                youtube_handle       = data.get("youtube_handle", ""),
                spotify_profile      = data.get("spotify_profile", ""),
                instagram_handle     = handle if data.get("source") == "Instagram" else data.get("instagram_handle", ""),
                tiktok_handle        = data.get("tiktok_handle", ""),
                youtube_subs         = data.get("youtube_subs", 0),
                monthly_views        = data.get("monthly_views", 0),
                spotify_monthly      = data.get("spotify_monthly", 0),
                instagram_followers  = data.get("instagram_followers", 0),
                tiktok_followers     = data.get("tiktok_followers", 0),
                niche                = data.get("niche", ""),
                primary_platform     = data.get("primary_platform", ""),
                source               = data.get("source", "Scraper"),
                status               = "New",
            )
            db.add(creator)
            inserted += 1

        db.commit()

        run.status = "completed"
        run.creators_found = len(all_creators)
        run.creators_added = inserted
        run.source_breakdown = json.dumps(source_counts)
        run.completed_at = datetime.now(timezone.utc)
        db.commit()

        print(f"[Orchestrator] Done. {inserted} creators added.")
        return {"creators_added": inserted, "source_breakdown": source_counts}

    except Exception as e:
        run.status = "failed"
        run.error_message = str(e)
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        print(f"[Orchestrator] FAILED: {e}")
        raise
