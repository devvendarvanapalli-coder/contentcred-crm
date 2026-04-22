"""
Email guesser for creators who don't publicly list their email.
Tries common patterns against known domain, validates via SMTP ping.
"""

import re
import smtplib
import socket
import dns.resolver


def _guess_patterns(name: str, domain: str) -> list[str]:
    """Generate candidate email addresses from name + domain."""
    name = name.strip().lower()
    parts = re.sub(r"[^a-z\s]", "", name).split()
    if not parts:
        return []

    first = parts[0]
    last = parts[-1] if len(parts) > 1 else ""

    candidates = [f"contact@{domain}", f"hello@{domain}", f"info@{domain}"]
    if first:
        candidates += [f"{first}@{domain}"]
    if first and last:
        candidates += [
            f"{first}.{last}@{domain}",
            f"{first}{last}@{domain}",
            f"{first[0]}{last}@{domain}",
        ]

    return candidates


def _extract_domain(website: str) -> str:
    """Get bare domain from URL."""
    website = re.sub(r"https?://", "", website).split("/")[0]
    return website.replace("www.", "")


def _mx_exists(domain: str) -> bool:
    """Check if domain has MX records."""
    try:
        dns.resolver.resolve(domain, "MX")
        return True
    except Exception:
        return False


def _smtp_verify(email: str, domain: str) -> bool:
    """
    Attempt SMTP RCPT TO verification.
    Many providers block this — treat True as high confidence only.
    """
    try:
        records = dns.resolver.resolve(domain, "MX")
        mx = sorted(records, key=lambda r: r.preference)[0].exchange.to_text().rstrip(".")
        with smtplib.SMTP(mx, 25, timeout=5) as smtp:
            smtp.ehlo("verify.local")
            smtp.mail("verify@verify.local")
            code, _ = smtp.rcpt(email)
            return code == 250
    except Exception:
        return False


def find_best_email(name: str, website: str) -> str:
    """
    Try to find a working email for the creator.
    Returns best guess or empty string.
    """
    if not name or not website:
        return ""

    domain = _extract_domain(website)
    if not domain or not _mx_exists(domain):
        return ""

    candidates = _guess_patterns(name, domain)
    for email in candidates:
        if _smtp_verify(email, domain):
            return email

    # Fall back to returning the first candidate without verification
    return candidates[0] if candidates else ""
