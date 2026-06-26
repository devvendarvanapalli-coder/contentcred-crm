"""
Bot detection engine for clip submissions.

Scores 0–100 (higher = more suspicious / botted).
Uses per-platform engagement baselines and velocity analysis.
"""

from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime, timezone


# ── Platform baselines ────────────────────────────────────────────
# (like_rate, comment_rate, share_rate) as % of views — healthy minimums
PLATFORM_BASELINES = {
    "tiktok": {
        "min_like_rate":    0.03,   # 3 % of views
        "min_comment_rate": 0.002,  # 0.2 %
        "min_share_rate":   0.005,  # 0.5 %
        "min_er":           0.03,   # total engagement / views
        "bot_er_threshold": 0.005,  # below this = likely botted
        "spike_multiplier": 10,     # 10× growth in one interval = suspicious
    },
    "instagram": {
        "min_like_rate":    0.015,
        "min_comment_rate": 0.001,
        "min_share_rate":   0.002,
        "min_er":           0.015,
        "bot_er_threshold": 0.003,
        "spike_multiplier": 8,
    },
    "youtube": {
        "min_like_rate":    0.01,
        "min_comment_rate": 0.001,
        "min_share_rate":   0.0005,
        "min_er":           0.008,
        "bot_er_threshold": 0.002,
        "spike_multiplier": 12,
    },
}

DEFAULT_BASELINE = PLATFORM_BASELINES["tiktok"]


@dataclass
class BotAnalysisResult:
    score: int                          # 0–100
    flag: str                           # clean | monitor | suspicious | botted
    reasons: List[str] = field(default_factory=list)


def _baseline(platform: str) -> dict:
    return PLATFORM_BASELINES.get(platform.lower(), DEFAULT_BASELINE)


def _engagement_rate(views: int, likes: int, comments: int, shares: int) -> float:
    if views == 0:
        return 0.0
    return (likes + comments + shares) / views


def _velocity_score(snapshots: List[dict]) -> int:
    """
    Returns 0–40 penalty based on how spike-y the view growth is.
    snapshots = [{"views": int, "recorded_at": datetime}, ...]
    """
    if len(snapshots) < 2:
        return 0

    sorted_snaps = sorted(snapshots, key=lambda s: s["recorded_at"])
    max_ratio = 0.0

    for i in range(1, len(sorted_snaps)):
        prev = sorted_snaps[i - 1]["views"]
        curr = sorted_snaps[i]["views"]
        delta_views = curr - prev

        # Time elapsed in hours
        dt = sorted_snaps[i]["recorded_at"] - sorted_snaps[i - 1]["recorded_at"]
        hours = dt.total_seconds() / 3600 or 1

        if prev > 0:
            ratio = delta_views / prev
        elif delta_views > 50_000:
            # First snapshot already massive with no baseline
            ratio = 5.0
        else:
            ratio = 0.0

        # Normalise by time — fast spikes are more suspicious
        velocity_factor = ratio / max(hours, 0.5)
        max_ratio = max(max_ratio, velocity_factor)

    # Map to 0–40 penalty
    if max_ratio < 1:
        return 0
    elif max_ratio < 3:
        return 10
    elif max_ratio < 8:
        return 20
    elif max_ratio < 20:
        return 30
    else:
        return 40


def analyze(
    platform: str,
    views: int,
    likes: int,
    comments: int,
    shares: int,
    snapshots: Optional[List[dict]] = None,
) -> BotAnalysisResult:
    """
    Core scoring function. Returns BotAnalysisResult.
    """
    bl = _baseline(platform)
    reasons: List[str] = []
    score = 0

    if views == 0:
        return BotAnalysisResult(score=0, flag="clean", reasons=["No views yet"])

    er = _engagement_rate(views, likes, comments, shares)
    like_rate = likes / views if views else 0
    comment_rate = comments / views if views else 0

    # ── Engagement rate check (0–40 pts) ─────────────────────────
    if er < bl["bot_er_threshold"]:
        score += 40
        reasons.append(
            f"Engagement rate {er*100:.2f}% is critically low for {platform} "
            f"(expected ≥{bl['min_er']*100:.1f}%)"
        )
    elif er < bl["min_er"]:
        penalty = int(40 * (1 - er / bl["min_er"]))
        score += penalty
        reasons.append(
            f"Low engagement rate {er*100:.2f}% for {platform} "
            f"(healthy ≥{bl['min_er']*100:.1f}%)"
        )

    # ── Like rate check (0–20 pts) ────────────────────────────────
    if likes == 0 and views > 1000:
        score += 20
        reasons.append("Zero likes on a clip with >1K views — extremely unusual")
    elif like_rate < bl["min_like_rate"] / 2:
        score += 15
        reasons.append(
            f"Like rate {like_rate*100:.2f}% well below {platform} baseline "
            f"({bl['min_like_rate']*100:.1f}%)"
        )
    elif like_rate < bl["min_like_rate"]:
        score += 8
        reasons.append(f"Like rate {like_rate*100:.2f}% below {platform} baseline")

    # ── Comment check (0–10 pts) ──────────────────────────────────
    if comments == 0 and views > 5000:
        score += 10
        reasons.append("Zero comments on a clip with >5K views")
    elif comment_rate < bl["min_comment_rate"] / 3 and views > 10_000:
        score += 6
        reasons.append(f"Comment rate {comment_rate*100:.3f}% unusually low")

    # ── Velocity spike check (0–30 pts) ──────────────────────────
    if snapshots:
        vel_penalty = _velocity_score(snapshots)
        if vel_penalty:
            score += vel_penalty
            reasons.append(
                f"Suspicious view velocity detected — "
                f"{vel_penalty} point spike penalty"
            )

    score = min(score, 100)

    if score <= 20:
        flag = "clean"
    elif score <= 45:
        flag = "monitor"
    elif score <= 70:
        flag = "suspicious"
    else:
        flag = "botted"

    if not reasons:
        reasons.append("All signals within normal range")

    return BotAnalysisResult(score=score, flag=flag, reasons=reasons)
