"""
Gmail SMTP email sender for ContentCred cold outreach.
Uses Gmail App Password — no AWS needed.
Injects open-tracking pixel and unsubscribe footer.
"""

import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from database import settings
from models import EmailLog


def _build_html(body_text: str, tracking_id: str, creator_email: str) -> str:
    """Wrap plain-text body in minimal HTML with tracking pixel + unsubscribe."""
    paragraphs = "".join(
        f"<p style='margin:0 0 12px 0;'>{line}</p>"
        for line in body_text.strip().split("\n")
        if line.strip()
    )
    tracking_pixel = (
        f'<img src="{settings.API_BASE_URL}/track/open/{tracking_id}" '
        f'width="1" height="1" style="display:none;" />'
    )
    unsub_url = f"{settings.API_BASE_URL}/track/unsubscribe/{tracking_id}"
    unsubscribe = (
        f'<p style="margin-top:24px;font-size:11px;color:#999;">'
        f'<a href="{unsub_url}" style="color:#999;">Unsubscribe</a></p>'
    )
    return f"""
<html><body style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:600px;">
{paragraphs}
{unsubscribe}
{tracking_pixel}
</body></html>
"""


def send_email(
    to_email: str,
    subject: str,
    body_text: str,
    creator_id: int,
    step: int,
    db: Session,
) -> str | None:
    """
    Send a cold email via Gmail SMTP.
    Returns tracking_id on success, None on failure.
    """
    if not settings.GMAIL_APP_PASSWORD:
        print("[Email] No Gmail App Password configured — skipping")
        return None

    tracking_id = uuid.uuid4().hex
    html_body = _build_html(body_text, tracking_id, to_email)

    msg = MIMEMultipart("alternative")
    msg["From"]     = f"{settings.SENDER_NAME} <{settings.GMAIL_ADDRESS}>"
    msg["To"]       = to_email
    msg["Subject"]  = subject
    msg["Reply-To"] = settings.REPLY_TO_EMAIL

    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(settings.GMAIL_ADDRESS, settings.GMAIL_APP_PASSWORD)
            smtp.sendmail(settings.GMAIL_ADDRESS, to_email, msg.as_string())

        log = EmailLog(
            creator_id=creator_id,
            tracking_id=tracking_id,
            step=step,
            subject=subject,
            sent_at=datetime.now(timezone.utc),
        )
        db.add(log)
        db.commit()
        print(f"[Email] Sent step {step} to {to_email}")
        return tracking_id

    except Exception as e:
        print(f"[Email] Failed to send to {to_email}: {e}")
        return None


def _send_simple(to_email: str, subject: str, body_html: str) -> bool:
    """Send a transactional email (no tracking, no log)."""
    if not settings.GMAIL_APP_PASSWORD:
        return False
    msg = MIMEMultipart("alternative")
    msg["From"]    = f"{settings.SENDER_NAME} <{settings.GMAIL_ADDRESS}>"
    msg["To"]      = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body_html, "html"))
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(settings.GMAIL_ADDRESS, settings.GMAIL_APP_PASSWORD)
            smtp.sendmail(settings.GMAIL_ADDRESS, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[Email] Transactional send failed to {to_email}: {e}")
        return False


def send_clip_approved(
    clipper_email: str, clipper_name: str, campaign_name: str, earnings: float, url: str
) -> bool:
    subject = f"Your submission was approved — ${earnings:.2f} earned!"
    body = f"""
<html><body style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:600px;">
<p>Hi {clipper_name},</p>
<p>Great news! Your submission for <strong>{campaign_name}</strong> has been approved.</p>
<p style="font-size:24px;font-weight:bold;color:#16a34a;">+${earnings:.2f} earned</p>
<p style="color:#666;">Post: <a href="{url}">{url}</a></p>
<p>Your earnings will be included in the next payout batch. Keep posting!</p>
<p style="margin-top:24px;color:#999;font-size:12px;">ContentCred — Content Rewards</p>
</body></html>
"""
    return _send_simple(clipper_email, subject, body)


def send_clip_rejected(
    clipper_email: str, clipper_name: str, campaign_name: str, reason: str, url: str
) -> bool:
    subject = f"Your submission was not approved — {campaign_name}"
    body = f"""
<html><body style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:600px;">
<p>Hi {clipper_name},</p>
<p>Unfortunately your submission for <strong>{campaign_name}</strong> was not approved.</p>
<p style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;color:#dc2626;">
  <strong>Reason:</strong> {reason}
</p>
<p style="color:#666;">Post: <a href="{url}">{url}</a></p>
<p>You can submit other content that follows the campaign guidelines.</p>
<p style="margin-top:24px;color:#999;font-size:12px;">ContentCred — Content Rewards</p>
</body></html>
"""
    return _send_simple(clipper_email, subject, body)
