"""
Proxy Manager for Domain Searcher.
@developer: Handles proxy rotation from a list and verifies proxy health.
"""

import asyncio
import httpx
import random
from core.logger import setup_logger

logger = setup_logger("proxy_manager")

class ProxyManager:
    def __init__(self, proxy_list: list[str] = None):
        """
        Args:
            proxy_list: List of proxy URLs (http://user:pass@host:port)
        """
        self.proxies = proxy_list or []
        self._current_index = 0

    @classmethod
    def from_file(cls, file_path: str):
        """Load proxies from a text file (one per line)."""
        try:
            with open(file_path, "r") as f:
                proxies = [line.strip() for line in f if line.strip()]
            logger.info("📡 Loaded %d proxies from %s", len(proxies), file_path)
            return cls(proxies)
        except Exception as e:
            logger.error("❌ Failed to load proxies: %s", e)
            return cls([])

    def get_next(self) -> str | None:
        """Get the next proxy in the list (round-robin)."""
        if not self.proxies:
            return None
        
        proxy = self.proxies[self._current_index]
        self._current_index = (self._current_index + 1) % len(self.proxies)
        return proxy

    def get_random(self) -> str | None:
        """Get a random proxy from the list."""
        if not self.proxies:
            return None
        return random.choice(self.proxies)

    async def verify_proxy(self, proxy_url: str, test_url: str = "https://www.google.com", timeout: int = 10) -> bool:
        """Check if a proxy is working."""
        try:
            async with httpx.AsyncClient(proxies={"all://": proxy_url}, timeout=timeout) as client:
                resp = await client.get(test_url)
                return resp.status_code == 200
        except Exception as e:
            logger.debug("   ⚠️ Proxy check failed for %s: %s", proxy_url, e)
            return False

    async def get_healthy_proxy(self, retries: int = 3) -> str | None:
        """Attempt to find a working proxy from the list."""
        if not self.proxies:
            return None
            
        # Shuffle for randomness
        available_proxies = list(self.proxies)
        random.shuffle(available_proxies)
        
        for proxy in available_proxies[:retries*2]: # Limit checks
            logger.info("📡 Checking proxy: %s", proxy)
            if await self.verify_proxy(proxy):
                logger.info("   ✅ Proxy is healthy")
                return proxy
        
        logger.warning("❌ No healthy proxies found after %d attempts", retries)
        return None
