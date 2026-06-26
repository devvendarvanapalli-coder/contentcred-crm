"""
View fetcher for clip submissions.
- YouTube: uses Data API v3 (requires YOUTUBE_API_KEY in settings)
- TikTok: scrapes embed page for view count
- Instagram / Twitter: returns None (manual entry only)
"""

import re
import requests
from typing import Optional, Tuple

from database import settings


def _extract_youtube_id(url: str) -> Optional[str]:
    patterns = [
        r"youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
        r"youtu\.be/([a-zA-Z0-9_-]{11})",
        r"youtube\.com/shorts/([a-zA-Z0-9_-]{11})",
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None


def _fetch_youtube(url: str) -> Optional[Tuple[int, dict]]:
    video_id = _extract_youtube_id(url)
    if not video_id:
        return None
    api_key = getattr(settings, "YOUTUBE_API_KEY", "")
    if not api_key:
        return None
    try:
        r = requests.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={"part": "statistics", "id": video_id, "key": api_key},
            timeout=10,
        )
        r.raise_for_status()
        items = r.json().get("items", [])
        if not items:
            return None
        stats = items[0].get("statistics", {})
        views    = int(stats.get("viewCount", 0))
        likes    = int(stats.get("likeCount", 0))
        comments = int(stats.get("commentCount", 0))
        return views, {"likes": likes, "comments": comments, "shares": 0}
    except Exception as e:
        print(f"[ViewFetcher] YouTube error for {url}: {e}")
        return None


def _fetch_tiktok(url: str) -> Optional[Tuple[int, dict]]:
    """Best-effort TikTok scrape via interactionCount in page HTML."""
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
            )
        }
        r = requests.get(url, headers=headers, timeout=12, allow_redirects=True)
        m = re.search(r'"interactionCount"\s*:\s*"?(\d+)"?', r.text)
        if m:
            return int(m.group(1)), {"likes": 0, "comments": 0, "shares": 0}
        # Fallback: look for play count in JSON blobs
        m2 = re.search(r'"playCount"\s*:\s*(\d+)', r.text)
        if m2:
            return int(m2.group(1)), {"likes": 0, "comments": 0, "shares": 0}
        return None
    except Exception as e:
        print(f"[ViewFetcher] TikTok error for {url}: {e}")
        return None


def fetch_views(platform: str, url: str) -> Optional[Tuple[int, dict]]:
    """
    Fetch live view count for a clip.
    Returns (views, {likes, comments, shares}) or None if unsupported/failed.
    """
    if platform == "youtube":
        return _fetch_youtube(url)
    elif platform == "tiktok":
        return _fetch_tiktok(url)
    # Instagram and Twitter/X require authenticated scraping — skip for now
    return None
