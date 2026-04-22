"""
ContentCred email + Instagram DM templates.

3 Creator Personas:
  - musician          → tone: casual + emotional
  - video_creator     → tone: direct + hype
  - personal_brand    → tone: professional + ROI-focused

5-step email sequence: Day 0, 3, 7, 11, 14
4-step Instagram DM sequence: Day 0, 4, 8, 14

Placeholders:
  {name}         - creator's first name (or "there")
  {niche}        - their niche (e.g. "Hip-Hop", "Finance")
  {platform}     - their main platform (e.g. "YouTube", "Spotify")
  {followers}    - formatted follower/listener count
  {calendly}     - Calendly booking link
  {sender_name}  - your name (Devvendar)
"""

SEQUENCE_DAYS = [0, 3, 7, 11, 14]

# ─────────────────────────────────────────────────────────────────
# MUSICIAN TEMPLATES (casual + emotional)
# ─────────────────────────────────────────────────────────────────

MUSICIAN_EMAIL = [
    # Step 0 – Day 0
    {
        "subject": "your music deserves more eyes, {name}",
        "body": """\
Hey {name},

Came across your {platform} profile and honestly your sound is impressive. {niche} artists at your level are exactly who we work with at ContentCred.

We clip your best moments — live sets, drops, behind-the-scenes — and push them across Instagram Reels, TikTok, and YouTube Shorts organically. No ads. Just your content in front of the right people.

Artists we've worked with have hit 50K–200K views per clip in the first month.

Would love to show you what this looks like for your style. 15 minutes?

{calendly}

— {sender_name}
ContentCred
""",
    },
    # Step 1 – Day 3
    {
        "subject": "Re: your music deserves more eyes",
        "body": """\
Hey {name},

Just circling back — I know you're probably buried in creating, so keeping this short.

The core idea: we take 60-second cuts from your existing tracks and videos and distribute them across short-form platforms. Your existing {followers} audience becomes the launchpad — the algorithm does the rest.

One artist we work with went from 80K to 340K Spotify listeners in 6 weeks with zero paid promo. Just smart clipping.

Worthwhile for a quick chat? {calendly}

— {sender_name}
""",
    },
    # Step 2 – Day 7
    {
        "subject": "quick question, {name}",
        "body": """\
{name},

One question: are you happy with how fast your audience is growing right now?

Most {niche} artists tell us the same thing — the content is good, the numbers aren't growing fast enough. Organic growth on short-form is where that changes.

We handle everything — editing, captioning, posting cadence, hashtag research. You just keep making music.

Here's 15 minutes if you want the full picture: {calendly}

— {sender_name}, ContentCred
""",
    },
    # Step 3 – Day 11
    {
        "subject": "this is probably useful for you, {name}",
        "body": """\
Hey {name},

Sharing a quick breakdown of what a typical ContentCred campaign looks like for a {niche} artist:

Week 1  — Audit your best content, build clip library (10–15 clips)
Week 2  — Post across IG Reels, TikTok, YouTube Shorts with optimised hooks
Week 3+ — Monitor performance, double down on what's landing, A/B test new cuts

Average result by end of month: 2–5x increase in organic impressions.

If your budget is around $5K/month for growth, this is where I'd put it. Let me know if you want to talk through it.

{calendly}

— {sender_name}
""",
    },
    # Step 4 – Day 14
    {
        "subject": "last one from me, {name}",
        "body": """\
{name},

Last message — I don't like clogging inboxes.

If growing your audience organically on short-form is something you're thinking about for the next 90 days, I'd love to be the one who makes that happen for you.

If the timing is off, no worries at all. Feel free to bookmark this and reach out whenever it makes sense.

{calendly}

All the best,
{sender_name}
ContentCred
""",
    },
]


# ─────────────────────────────────────────────────────────────────
# VIDEO CREATOR TEMPLATES (direct + hype)
# ─────────────────────────────────────────────────────────────────

VIDEO_CREATOR_EMAIL = [
    # Step 0 – Day 0
    {
        "subject": "{name}, your long-form content is a short-form goldmine",
        "body": """\
Hey {name},

Found your {platform} channel while looking through {niche} creators — strong content, strong hook game.

Here's the thing most {niche} creators are leaving on the table: every video you post is 5–10 short-form clips waiting to happen. We at ContentCred do exactly that — we clip, caption, and distribute your content across Reels, Shorts, and TikTok.

Result? Your existing videos keep driving new viewers months after the upload.

Got 15 minutes to see how this works with your content specifically?

{calendly}

— {sender_name}, ContentCred
""",
    },
    # Step 1 – Day 3
    {
        "subject": "Re: short-form from your long-form",
        "body": """\
Hey {name},

Sent you something a few days ago — just wanted to make sure it didn't get lost.

Quick context on ContentCred: we're a content distribution agency. You make the long-form content, we turn it into a short-form pipeline that runs on autopilot.

You focus on your main channel. We handle the 6 other places your content should be showing up.

This work? 15 min call: {calendly}

— {sender_name}
""",
    },
    # Step 2 – Day 7
    {
        "subject": "the algorithm is literally rewarding this right now",
        "body": """\
{name},

Short-form algorithm is still in a huge growth window in 2025 — especially for {niche} content. Creators who are repurposing consistently are growing 3–10x faster than those who aren't.

We've run this for creators across YouTube, Spotify, and Instagram. The formula works regardless of niche.

Happy to walk you through exactly what we'd do with YOUR content — no generic pitch, specific to your channel.

15 minutes: {calendly}

— {sender_name}, ContentCred
""",
    },
    # Step 3 – Day 11
    {
        "subject": "{name} — what does your growth look like rn?",
        "body": """\
{name},

Not gonna overthink this one.

If your channel growth has plateaued or you feel like you're working hard but not growing fast enough — short-form distribution is usually the missing piece.

We take care of everything post-upload. Editing, platform-specific optimization, posting schedule. You just keep doing what you're already doing.

Campaign starts at $5K/month. Typically 2–4x ROI on audience growth by month's end.

Worth 15 minutes? {calendly}

{sender_name}
""",
    },
    # Step 4 – Day 14
    {
        "subject": "closing the loop, {name}",
        "body": """\
{name},

Last email from me — promise.

If short-form distribution ever becomes a priority, ContentCred is the team I'd want in your corner. We're selective with who we work with and I think your channel would be a great fit.

You can book directly here whenever: {calendly}

No pressure. Keep creating.

— {sender_name}
ContentCred
""",
    },
]


# ─────────────────────────────────────────────────────────────────
# PERSONAL BRAND TEMPLATES (professional + ROI-focused)
# ─────────────────────────────────────────────────────────────────

PERSONAL_BRAND_EMAIL = [
    # Step 0 – Day 0
    {
        "subject": "content distribution for personal brands — ContentCred",
        "body": """\
Hi {name},

I came across your work in the {niche} space and wanted to reach out directly.

ContentCred helps personal brands distribute content organically across Instagram Reels, TikTok, and YouTube Shorts. We clip, edit, and post — consistently and systematically — so your message reaches the widest possible audience without paid ads.

For founders and thought leaders with {followers} followers, this tends to unlock a significant second audience that would have never found you otherwise.

Would you be open to a 15-minute call to see if this is a fit?

{calendly}

Best,
{sender_name}
ContentCred | contentcred.com
""",
    },
    # Step 1 – Day 3
    {
        "subject": "Re: content distribution for {name}'s brand",
        "body": """\
Hi {name},

Following up on my last message — I'll be brief.

ContentCred's process:
1. Audit your existing content library
2. Build a monthly clip pipeline (15–20 short-form pieces)
3. Distribute across IG Reels, TikTok, YouTube Shorts
4. Report on reach, impressions, follower growth weekly

Most clients see 2–5x organic reach within the first 30 days.

Happy to share more specifics on a quick call: {calendly}

— {sender_name}
""",
    },
    # Step 2 – Day 7
    {
        "subject": "one question for you, {name}",
        "body": """\
{name},

One straightforward question: how much of your content is being repurposed right now?

Most personal brands we speak to post once or twice a week on their primary platform and leave 80% of the reach potential on the table.

Short-form content on Reels and Shorts is the highest-ROI organic channel in 2025 for personal brands in the {niche} space. We've seen {niche}-adjacent creators grow their inbound leads by 3x with consistent short-form distribution.

I'd love to show you the playbook. 15 minutes: {calendly}

{sender_name} | ContentCred
""",
    },
    # Step 3 – Day 11
    {
        "subject": "what a ContentCred campaign looks like for you",
        "body": """\
Hi {name},

Let me be specific about what working together would look like:

Month 1: Onboarding + content audit + 15 clips distributed across 3 platforms
Month 2: Optimisation based on data — double down on top-performing formats
Month 3: Full pipeline running — 20+ pieces/month, automated reporting

Investment: starting at $5,000/month
Expected outcome: 2–5x growth in organic impressions, measurable increase in profile visits and inbound interest

If this sounds interesting, 15 minutes is all we need: {calendly}

— {sender_name}, ContentCred
""",
    },
    # Step 4 – Day 14
    {
        "subject": "final note, {name}",
        "body": """\
{name},

This is my last follow-up — I respect your time.

If content distribution ever becomes a strategic priority for your personal brand, I'd be glad to reconnect. You can book a call here at any point: {calendly}

Wishing you continued success with your {niche} work.

Best,
{sender_name}
ContentCred
""",
    },
]


# ─────────────────────────────────────────────────────────────────
# INSTAGRAM DM TEMPLATES (all personas, 4 steps)
# ─────────────────────────────────────────────────────────────────

INSTAGRAM_DM = [
    # Step 0 – Day 0 (first contact, super short)
    {
        "musician": "Hey {name}! Love the {niche} content. Quick question — are you pushing this to Reels/TikTok too? We help artists clip and distribute — curious what your setup looks like.",
        "video_creator": "Hey {name}! Your {platform} content is solid. Do you repurpose it for short-form? We do that for creators — clips from your existing videos pushed everywhere. Just curious if it's something you think about.",
        "personal_brand": "Hi {name} — your content in the {niche} space is really good. Do you have a short-form distribution strategy? That's what we help personal brands build. Happy to share more if you're curious.",
    },
    # Step 1 – Day 4
    {
        "musician": "Hey! Following up — ContentCred does organic short-form distribution for {niche} artists. No ads, just your clips reaching new audiences. Worth a quick chat? {calendly}",
        "video_creator": "Following up on my last message, {name}. We clip {platform} videos into Reels + Shorts — your content keeps growing after upload. Want to see how it works? {calendly}",
        "personal_brand": "{name}, just following up! We work with personal brands in {niche} to build organic reach through short-form. 15-min call: {calendly}",
    },
    # Step 2 – Day 8
    {
        "musician": "{name} — one more shot! We've helped {niche} artists 2-3x their organic reach in 30 days with smart clipping. Campaign starts at $5K. Interested? {calendly}",
        "video_creator": "Hey {name}! Still think your content is a perfect fit for what we do. Short-form pipeline, organic growth, no paid ads. $5K/month. Worth 15 mins: {calendly}",
        "personal_brand": "Hi {name}, last nudge! ContentCred distributes your content across 3 platforms on autopilot. Great for personal brands in {niche}. Book here: {calendly}",
    },
    # Step 3 – Day 14 (soft close)
    {
        "musician": "Hey {name}! Last message — if growing your audience organically ever becomes a priority, we're here. {calendly}. All the best with the music!",
        "video_creator": "{name} — last one! If short-form distribution ever makes sense for your channel, reach out anytime. {calendly}. Keep creating!",
        "personal_brand": "{name} — wrapping up my outreach. If content distribution becomes a priority for your brand, I'd love to reconnect. {calendly}. Best of luck!",
    },
]

DM_SEQUENCE_DAYS = [0, 4, 8, 14]


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def get_email_template(persona: str, step: int) -> dict:
    """
    Return {subject, body} for given persona and step index (0-4).
    Falls back to video_creator if persona unknown.
    """
    mapping = {
        "musician":       MUSICIAN_EMAIL,
        "video_creator":  VIDEO_CREATOR_EMAIL,
        "personal_brand": PERSONAL_BRAND_EMAIL,
    }
    templates = mapping.get(persona, VIDEO_CREATOR_EMAIL)
    if step >= len(templates):
        return templates[-1]
    return templates[step]


def get_dm_template(persona: str, step: int) -> str:
    """Return DM text for given persona and step index (0-3)."""
    mapping = {
        "musician":       "musician",
        "video_creator":  "video_creator",
        "personal_brand": "personal_brand",
    }
    key = mapping.get(persona, "video_creator")
    if step >= len(INSTAGRAM_DM):
        return INSTAGRAM_DM[-1][key]
    return INSTAGRAM_DM[step][key]


def render_email(persona: str, step: int, creator: dict, sender_name: str, calendly: str) -> dict:
    """Return rendered {subject, body, text_body} for given creator."""
    tmpl = get_email_template(persona, step)
    name = (creator.get("full_name") or "there").split()[0].title()

    followers_raw = (
        creator.get("youtube_subs")
        or creator.get("spotify_monthly")
        or creator.get("instagram_followers")
        or creator.get("tiktok_followers")
        or 0
    )
    if followers_raw >= 1_000_000:
        followers_str = f"{followers_raw/1_000_000:.1f}M"
    elif followers_raw >= 1_000:
        followers_str = f"{followers_raw//1_000}K"
    else:
        followers_str = str(followers_raw)

    platform_map = {
        "youtube":   "YouTube",
        "spotify":   "Spotify",
        "instagram": "Instagram",
        "tiktok":    "TikTok",
    }
    platform = platform_map.get(creator.get("primary_platform", ""), "platform")

    ctx = {
        "name":        name,
        "niche":       creator.get("niche", "your niche"),
        "platform":    platform,
        "followers":   followers_str,
        "calendly":    calendly,
        "sender_name": sender_name,
    }

    subject = tmpl["subject"].format(**ctx)
    body    = tmpl["body"].format(**ctx)
    return {"subject": subject, "body": body}


def render_dm(persona: str, step: int, creator: dict, sender_name: str, calendly: str) -> str:
    """Return rendered DM string for given creator."""
    tmpl = get_dm_template(persona, step)
    name = (creator.get("full_name") or "there").split()[0].title()
    platform_map = {
        "youtube":   "YouTube",
        "spotify":   "Spotify",
        "instagram": "Instagram",
        "tiktok":    "TikTok",
    }
    platform = platform_map.get(creator.get("primary_platform", ""), "your platform")
    return tmpl.format(
        name=name,
        niche=creator.get("niche", "your niche"),
        platform=platform,
        calendly=calendly,
        sender_name=sender_name,
    )
