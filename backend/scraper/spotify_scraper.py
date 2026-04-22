"""
Spotify Web API scraper.
Finds musicians with 10K–2M monthly listeners.
"""

import asyncio
import aiohttp
import base64
from database import settings

TARGET_GENRES = [
    "hip-hop", "pop", "r-n-b", "indie", "electronic",
    "latin", "afrobeats", "soul", "trap", "lo-fi",
]

MIN_LISTENERS = 10_000
MAX_LISTENERS = 2_000_000


async def _get_access_token(session: aiohttp.ClientSession) -> str:
    """Get Spotify OAuth token via client credentials flow."""
    creds = base64.b64encode(
        f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}".encode()
    ).decode()
    async with session.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {creds}"},
        data={"grant_type": "client_credentials"},
    ) as resp:
        data = await resp.json()
        return data.get("access_token", "")


async def _search_artists(
    session: aiohttp.ClientSession, token: str, genre: str, offset: int = 0
) -> list[dict]:
    """Search Spotify artists by genre."""
    async with session.get(
        "https://api.spotify.com/v1/search",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "q": f"genre:{genre}",
            "type": "artist",
            "limit": 50,
            "offset": offset,
        },
    ) as resp:
        if resp.status != 200:
            return []
        data = await resp.json()
        return data.get("artists", {}).get("items", [])


async def scrape_creators(count: int = 200) -> list[dict]:
    """
    Scrape Spotify for musicians.
    Returns list of dicts with creator info.
    """
    if not settings.SPOTIFY_CLIENT_ID or not settings.SPOTIFY_CLIENT_SECRET:
        print("[Spotify] No API credentials — skipping")
        return []

    results: list[dict] = []
    seen_ids: set[str] = set()

    async with aiohttp.ClientSession() as session:
        token = await _get_access_token(session)
        if not token:
            print("[Spotify] Failed to get access token")
            return []

        for genre in TARGET_GENRES:
            if len(results) >= count:
                break

            for offset in [0, 50, 100]:
                if len(results) >= count:
                    break
                try:
                    artists = await _search_artists(session, token, genre, offset)
                    for artist in artists:
                        if len(results) >= count:
                            break

                        aid = artist.get("id", "")
                        if aid in seen_ids:
                            continue

                        followers = artist.get("followers", {}).get("total", 0)
                        # Spotify doesn't expose monthly listeners in search; use followers as proxy
                        if not (MIN_LISTENERS <= followers <= MAX_LISTENERS):
                            continue

                        genres = ", ".join(artist.get("genres", [])[:3])
                        results.append({
                            "full_name":        artist.get("name", ""),
                            "email":            "",   # Spotify doesn't expose emails
                            "persona":          "musician",
                            "spotify_profile":  artist.get("external_urls", {}).get("spotify", ""),
                            "spotify_monthly":  followers,  # best proxy we have
                            "niche":            genres or genre.title(),
                            "primary_platform": "spotify",
                            "source":           "Spotify",
                        })
                        seen_ids.add(aid)

                except Exception as e:
                    print(f"[Spotify] Error for genre '{genre}' offset {offset}: {e}")
                    await asyncio.sleep(1)

    print(f"[Spotify] Scraped {len(results)} creators")
    return results
