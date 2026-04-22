"""
TikTok scraper using Playwright + session cookie.
Finds creators with 50K–2M followers via hashtag explore.
"""

import asyncio
import re
import random
from playwright.async_api import async_playwright
from database import settings

TARGET_HASHTAGS = [
    "musictiktok", "contentcreator", "personalbranding",
    "hiphop", "indieartist", "motivationalcontent",
    "selfimprovement", "lifestyletiktok", "businesstips",
]

MIN_FOLLOWERS = 50_000
MAX_FOLLOWERS = 2_000_000


def _parse_count(text: str) -> int:
    text = text.strip().upper().replace(",", "")
    try:
        if "M" in text:
            return int(float(text.replace("M", "")) * 1_000_000)
        elif "K" in text:
            return int(float(text.replace("K", "")) * 1_000)
        return int(text)
    except ValueError:
        return 0


def _extract_email(bio: str) -> str:
    match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", bio)
    return match.group(0) if match else ""


async def scrape_creators(count: int = 100) -> list[dict]:
    """
    Scrape TikTok creator profiles.
    Requires TIKTOK_SESSION_ID from browser cookies.
    """
    if not settings.TIKTOK_SESSION_ID:
        print("[TikTok] No session ID — skipping")
        return []

    results: list[dict] = []
    seen_handles: set[str] = set()

    proxy_args = {}
    if settings.PROXY_URL:
        proxy_args = {"proxy": {"server": settings.PROXY_URL}}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, **proxy_args)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
            ),
        )

        # Inject session cookie
        await context.add_cookies([{
            "name": "sessionid",
            "value": settings.TIKTOK_SESSION_ID,
            "domain": ".tiktok.com",
            "path": "/",
        }])

        page = await context.new_page()

        for tag in TARGET_HASHTAGS:
            if len(results) >= count:
                break

            try:
                await page.goto(f"https://www.tiktok.com/tag/{tag}", timeout=30000)
                await asyncio.sleep(random.uniform(3, 6))

                # Collect video links
                video_links = await page.eval_on_selector_all(
                    'a[href*="/@"]',
                    'els => [...new Set(els.map(e => e.href))]',
                )

                # Extract unique handles from video links
                handles = []
                for link in video_links:
                    m = re.search(r"/@([^/?]+)", link)
                    if m:
                        h = m.group(1)
                        if h not in seen_handles:
                            handles.append(h)

                for handle in handles[:15]:
                    if len(results) >= count:
                        break
                    try:
                        await page.goto(f"https://www.tiktok.com/@{handle}", timeout=25000)
                        await asyncio.sleep(random.uniform(2, 4))

                        # Try to get follower count
                        page_text = await page.inner_text("body") or ""
                        follower_match = re.search(
                            r'([\d.]+[KkMm]?)\s*[Ff]ollowers?', page_text
                        )
                        followers = 0
                        if follower_match:
                            followers = _parse_count(follower_match.group(1))

                        if not (MIN_FOLLOWERS <= followers <= MAX_FOLLOWERS):
                            continue

                        bio_match = re.search(r'"signature":"([^"]*)"', page_text)
                        bio = bio_match.group(1) if bio_match else ""
                        email = _extract_email(bio)

                        name_match = re.search(r'"nickname":"([^"]*)"', page_text)
                        name = name_match.group(1) if name_match else handle

                        results.append({
                            "full_name":        name,
                            "email":            email,
                            "persona":          "video_creator",
                            "tiktok_handle":    handle,
                            "tiktok_followers": followers,
                            "niche":            tag.replace("_", " ").title(),
                            "primary_platform": "tiktok",
                            "source":           "TikTok",
                        })
                        seen_handles.add(handle)

                    except Exception as e:
                        print(f"[TikTok] Error on @{handle}: {e}")
                        continue

            except Exception as e:
                print(f"[TikTok] Error on #{tag}: {e}")
                await asyncio.sleep(5)

        await browser.close()

    print(f"[TikTok] Scraped {len(results)} creators")
    return results
