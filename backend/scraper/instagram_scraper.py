"""
Instagram scraper using Playwright (stealth).
Targets creators with 50K–2M followers via hashtag + explore pages.
"""

import asyncio
import json
import re
import random
from playwright.async_api import async_playwright
from database import settings

TARGET_HASHTAGS = [
    "contentcreator", "musicartist", "personalbranding",
    "youtuber", "indieartist", "podcasthost",
    "motivationalspeaker", "lifestyleblogger", "fitnessmotivation",
    "fashionblogger", "travelcreator", "financetips",
]

MIN_FOLLOWERS = 50_000
MAX_FOLLOWERS = 2_000_000


def _parse_follower_count(text: str) -> int:
    """Convert '1.2M', '450K', '23456' to int."""
    text = text.strip().upper().replace(",", "")
    try:
        if "M" in text:
            return int(float(text.replace("M", "")) * 1_000_000)
        elif "K" in text:
            return int(float(text.replace("K", "")) * 1_000)
        else:
            return int(text)
    except ValueError:
        return 0


def _extract_email_from_bio(bio: str) -> str:
    match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", bio)
    return match.group(0) if match else ""


async def scrape_creators(count: int = 300) -> list[dict]:
    """
    Scrape Instagram creator profiles via hashtag explore.
    Returns list of dicts with creator info.
    """
    if not settings.INSTAGRAM_USERNAME or not settings.INSTAGRAM_PASSWORD:
        print("[Instagram] No credentials — skipping")
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
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1366, "height": 768},
        )
        page = await context.new_page()

        # ── Login ─────────────────────────────────────────────
        try:
            await page.goto("https://www.instagram.com/accounts/login/", timeout=30000)
            await page.wait_for_selector('input[name="username"]', timeout=15000)
            await page.fill('input[name="username"]', settings.INSTAGRAM_USERNAME)
            await page.fill('input[name="password"]', settings.INSTAGRAM_PASSWORD)
            await page.click('button[type="submit"]')
            await page.wait_for_load_state("networkidle", timeout=20000)
            await asyncio.sleep(3)
        except Exception as e:
            print(f"[Instagram] Login failed: {e}")
            await browser.close()
            return []

        for tag in TARGET_HASHTAGS:
            if len(results) >= count:
                break

            try:
                await page.goto(f"https://www.instagram.com/explore/tags/{tag}/", timeout=30000)
                await asyncio.sleep(random.uniform(3, 6))

                # Collect profile links from the grid
                links = await page.eval_on_selector_all(
                    'a[href*="/p/"]',
                    'els => els.map(e => e.href)',
                )
                post_links = list(set(links))[:20]

                for post_url in post_links:
                    if len(results) >= count:
                        break

                    try:
                        await page.goto(post_url, timeout=25000)
                        await asyncio.sleep(random.uniform(2, 4))

                        # Extract the profile link from the post
                        profile_link = await page.eval_on_selector(
                            'a[href^="/"][role="link"]',
                            'el => el.href',
                        )
                        handle = profile_link.rstrip("/").split("/")[-1]
                        if not handle or handle in seen_handles:
                            continue

                        # Visit profile
                        await page.goto(f"https://www.instagram.com/{handle}/", timeout=25000)
                        await asyncio.sleep(random.uniform(2, 4))

                        # Extract follower count and bio
                        stats_text = await page.inner_text("header section") or ""
                        follower_match = re.search(
                            r'([\d,.]+[KkMm]?)\s*[Ff]ollowers?', stats_text
                        )
                        followers = 0
                        if follower_match:
                            followers = _parse_follower_count(follower_match.group(1))

                        if not (MIN_FOLLOWERS <= followers <= MAX_FOLLOWERS):
                            continue

                        bio = ""
                        try:
                            bio = await page.inner_text("header div.-vDIg") or ""
                        except Exception:
                            pass

                        email = _extract_email_from_bio(bio)
                        name = ""
                        try:
                            name = await page.inner_text("header h1") or ""
                        except Exception:
                            pass

                        results.append({
                            "full_name":           name.strip(),
                            "email":               email,
                            "persona":             "personal_brand",
                            "instagram_handle":    handle,
                            "instagram_followers": followers,
                            "niche":               tag.replace("_", " ").title(),
                            "primary_platform":    "instagram",
                            "source":              "Instagram",
                        })
                        seen_handles.add(handle)

                    except Exception as e:
                        print(f"[Instagram] Error on post {post_url}: {e}")
                        continue

            except Exception as e:
                print(f"[Instagram] Error on tag #{tag}: {e}")
                await asyncio.sleep(5)

        await browser.close()

    print(f"[Instagram] Scraped {len(results)} creators")
    return results
