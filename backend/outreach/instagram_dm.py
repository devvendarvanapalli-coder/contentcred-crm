"""
Instagram DM sender using Playwright.
Sends DMs to creators via their Instagram handle.
Rate-limited to DAILY_INSTAGRAM_DM_LIMIT per day.
"""

import asyncio
import random
from datetime import datetime, timezone
from playwright.async_api import async_playwright
from sqlalchemy.orm import Session

from database import settings
from models import DmLog


_LOGGED_IN = False
_BROWSER = None
_PAGE = None


async def _ensure_logged_in():
    """Login to Instagram once and keep session alive."""
    global _LOGGED_IN, _BROWSER, _PAGE

    if _LOGGED_IN and _PAGE:
        return _PAGE

    async with async_playwright() as p:
        _BROWSER = await p.chromium.launch(headless=True)
        context = await _BROWSER.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
        )
        _PAGE = await context.new_page()

        await _PAGE.goto("https://www.instagram.com/accounts/login/", timeout=30000)
        await _PAGE.wait_for_selector('input[name="username"]', timeout=15000)
        await _PAGE.fill('input[name="username"]', settings.INSTAGRAM_USERNAME)
        await _PAGE.fill('input[name="password"]', settings.INSTAGRAM_PASSWORD)
        await _PAGE.click('button[type="submit"]')
        await _PAGE.wait_for_load_state("networkidle", timeout=20000)
        await asyncio.sleep(3)
        _LOGGED_IN = True
        return _PAGE


async def send_instagram_dm(
    handle: str,
    message: str,
    creator_id: int,
    step: int,
    db: Session,
) -> bool:
    """
    Send an Instagram DM to @handle.
    Returns True on success.
    """
    if not settings.INSTAGRAM_USERNAME or not settings.INSTAGRAM_PASSWORD:
        print("[IG DM] No Instagram credentials — skipping")
        return False

    try:
        page = await _ensure_logged_in()

        # Navigate to DM composer for this user
        await page.goto(
            f"https://www.instagram.com/direct/new/",
            timeout=25000,
        )
        await asyncio.sleep(random.uniform(2, 4))

        # Search for the handle in the recipient box
        await page.click('input[placeholder="Search..."]')
        await page.type('input[placeholder="Search..."]', handle, delay=80)
        await asyncio.sleep(2)

        # Click first matching result
        result = await page.query_selector(
            f'div[role="button"]:has-text("{handle}")'
        )
        if not result:
            print(f"[IG DM] Could not find user @{handle} in search")
            return False

        await result.click()
        await asyncio.sleep(1)

        # Click "Next" / "Chat"
        next_btn = await page.query_selector('button:has-text("Next")')
        if next_btn:
            await next_btn.click()
        await asyncio.sleep(2)

        # Type and send message
        msg_box = await page.query_selector('div[role="textbox"]')
        if not msg_box:
            print(f"[IG DM] Message box not found for @{handle}")
            return False

        await msg_box.click()
        await msg_box.type(message, delay=60)
        await asyncio.sleep(1)
        await page.keyboard.press("Enter")
        await asyncio.sleep(random.uniform(2, 4))

        # Log to DB
        log = DmLog(
            creator_id=creator_id,
            platform="instagram",
            step=step,
            message_preview=message[:300],
            sent_at=datetime.now(timezone.utc),
        )
        db.add(log)
        db.commit()

        print(f"[IG DM] Sent step {step} to @{handle}")
        return True

    except Exception as e:
        print(f"[IG DM] Failed to DM @{handle}: {e}")
        return False
