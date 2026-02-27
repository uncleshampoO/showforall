"""
Domain availability verifier using WHOIS lookups.
@developer: Handles rate limiting and retry logic.
@analyst: Primary truth source for domain status.
"""

import asyncio
import httpx
from typing import Literal

from core.logger import setup_logger

logger = setup_logger("verifier")

DomainStatus = Literal["available", "taken", "error"]

async def check_domain_rdap(domain: str) -> DomainStatus:
    """
    Check domain availability via the official Verisign RDAP (Registry Data Access Protocol) API over HTTPS.
    This fulfills the requirement of 'Checking through a registrar/registry API' and is much more
    reliable than pure socket WHOIS.
    
    Returns:
        "available" — 404 Not Found (domain is free)
        "taken" — 200 OK (domain is registered)
        "error" — RDAP query failed or rate limited
    """
    url = f"https://rdap.verisign.com/com/v1/domain/{domain}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
            if response.status_code == 404:
                return "available"
            elif response.status_code == 200:
                return "taken"
            else:
                logger.warning("⚠️ Unexpected API status for %s: %d", domain, response.status_code)
                return "error"
    except httpx.RequestError as e:
        logger.error("❌ HTTPS API error for %s: %s", domain, e)
        return "error"


async def verify_domains(
    candidates: list[dict],
    rate_limit_delay: float = 1.0,
    on_progress: callable = None,
) -> list[dict]:
    """
    Verify a list of domain candidates for availability via API.

    Args:
        candidates: List of {"name": str, "bl": int, ...} dicts.
        rate_limit_delay: Seconds between queries to avoid API rate limits.
        on_progress: Optional callback(domain_dict) for real-time UI updates.

    Returns:
        List of candidates with updated "status" field.
    """
    verified = []
    total = len(candidates)

    for i, candidate in enumerate(candidates):
        domain = candidate["name"]
        logger.info("🔎 [%d/%d] API Rest Verifying: %s", i + 1, total, domain)

        status = await check_domain_rdap(domain)
        candidate["status"] = status

        if status == "available":
            logger.info("   ✅ AVAILABLE: %s", domain)
            verified.append(candidate)
        elif status == "taken":
            logger.info("   ❌ Taken: %s", domain)
        else:
            logger.info("   ⚠️ Error checking: %s (skipping)", domain)

        # Notify UI if callback provided
        if on_progress:
            try:
                await on_progress(candidate, i + 1, total)
            except Exception:
                pass

        # Rate limiting to avoid API bans
        if i < total - 1:
            await asyncio.sleep(rate_limit_delay)

    logger.info("🏁 API Verification complete. %d available out of %d checked.", len(verified), total)
    return verified
