"""
YouTube Data API v3 scraper.
Finds creators with 50K–5M subscribers in target niches.
Returns up to `count` creator dicts per call.
"""

import asyncio
import aiohttp
from database import settings

TARGET_NICHES = [
    "hip hop", "music", "r&b", "pop music", "indie music",
    "personal finance", "entrepreneurship", "self improvement",
    "travel vlog", "lifestyle", "fitness", "fashion",
    "gaming", "tech review", "motivational",
]

MIN_SUBS = 50_000
MAX_SUBS = 5_000_000


async def _search_channel(session: aiohttp.ClientSession, query: str, max_results: int = 50) -> list[dict]:
    """Search YouTube channels by keyword."""
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "type": "channel",
        "q": query,
        "maxResults": max_results,
        "key": settings.YOUTUBE_API_KEY,
    }
    async with session.get(url, params=params) as resp:
        if resp.status != 200:
            return []
        data = await resp.json()
        return data.get("items", [])


async def _get_channel_stats(session: aiohttp.ClientSession, channel_ids: list[str]) -> dict:
    """Batch-fetch statistics for up to 50 channel IDs at once."""
    if not channel_ids:
        return {}
    url = "https://www.googleapis.com/youtube/v3/channels"
    params = {
        "part": "statistics,snippet,brandingSettings",
        "id": ",".join(channel_ids),
        "key": settings.YOUTUBE_API_KEY,
    }
    async with session.get(url, params=params) as resp:
        if resp.status != 200:
            return {}
        data = await resp.json()
        return {item["id"]: item for item in data.get("items", [])}


def _extract_email(channel_item: dict) -> str:
    """Try to find email in channel description."""
    desc = channel_item.get("snippet", {}).get("description", "")
    import re
    match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", desc)
    return match.group(0) if match else ""


async def scrape_creators(count: int = 400) -> list[dict]:
    """
    Scrape YouTube for creators.
    Returns list of dicts with creator info.
    """
    if not settings.YOUTUBE_API_KEY:
        print("[YouTube] No API key — skipping")
        return []

    results: list[dict] = []
    seen_ids: set[str] = set()

    async with aiohttp.ClientSession() as session:
        for niche in TARGET_NICHES:
            if len(results) >= count:
                break

            try:
                items = await _search_channel(session, niche, max_results=50)
                channel_ids = [
                    i["snippet"]["channelId"] for i in items
                    if i["snippet"].get("channelId") and i["snippet"]["channelId"] not in seen_ids
                ]

                # Batch stat lookup (max 50 per call)
                stats_map = await _get_channel_stats(session, channel_ids[:50])

                for cid in channel_ids:
                    if len(results) >= count:
                        break
                    if cid in seen_ids:
                        continue

                    ch = stats_map.get(cid, {})
                    if not ch:
                        continue

                    subs = int(ch.get("statistics", {}).get("subscriberCount", 0))
                    if not (MIN_SUBS <= subs <= MAX_SUBS):
                        continue

                    snippet = ch.get("snippet", {})
                    email = _extract_email(ch)

                    results.append({
                        "full_name":        snippet.get("title", ""),
                        "email":            email,
                        "persona":          "video_creator",
                        "youtube_channel":  f"https://www.youtube.com/channel/{cid}",
                        "youtube_handle":   snippet.get("customUrl", ""),
                        "youtube_subs":     subs,
                        "monthly_views":    int(ch.get("statistics", {}).get("viewCount", 0)),
                        "niche":            niche.title(),
                        "primary_platform": "youtube",
                        "source":           "YouTube",
                    })
                    seen_ids.add(cid)

            except Exception as e:
                print(f"[YouTube] Error for niche '{niche}': {e}")
                await asyncio.sleep(2)

    print(f"[YouTube] Scraped {len(results)} creators")
    return results
