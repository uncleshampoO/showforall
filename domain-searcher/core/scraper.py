"""
Playwright-based scraper for expireddomains.net (Deleted .com section).
@developer: Core automation engine with stealth and session persistence.
@analyst: This module handles auth, navigation, filtering, and data extraction.
"""

import asyncio
import json
import random
import sys
from pathlib import Path
from typing import AsyncGenerator

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from core.filters import is_clean_domain
from core.logger import setup_logger
from core.models import Account, engine
from core.proxy_manager import ProxyManager
from sqlmodel import Session, select

logger = setup_logger("scraper")

from playwright_stealth import stealth

async def apply_stealth(page: Page):
    """Inject stealth scripts using playwright_stealth to avoid bot detection."""
    await stealth(page)

# --- Constants ---
BASE_URL = "https://member.expireddomains.net"
LOGIN_URL = f"{BASE_URL}/login/"
DELETED_COM_URL = f"{BASE_URL}/domains/expiredcom/"
AUTH_STATE_FILE = Path(__file__).resolve().parent.parent / "auth.json"
MIN_AGE_YEARS = 5


class DomainScraper:
    """
    Autonomous scraper for expireddomains.net.
    Uses Playwright with stealth to bypass bot detection.
    Persists sessions via storage_state (auth.json).
    """

    def __init__(self, username: str = None, password: str = None, headless: bool = True):
        self.username = username
        self.password = password
        self.headless = headless
        self.proxy: str | None = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._page: Page | None = None
        self._pw = None
        self.proxy_manager: ProxyManager | None = None
        self.current_proxy: str | None = None
        self.current_account: Account | None = None
        self.storage_state: dict | None = None
        self.on_stealth_action = None # Optional callback: func(action_name: str)

    async def _human_wait(self, base: float = 2.0, sigma: float = 1.0, action: str = "Thinking..."):
        """Asymmetric natural delay based on Gaussian distribution."""
        if self.on_stealth_action:
            self.on_stealth_action(action)
        delay = max(0.5, random.gauss(base, sigma))
        logger.debug("⏳ Human wait: %.2fs", delay)
        await asyncio.sleep(delay)

    async def _jitter_move(self):
        """Micro-movements of the mouse to simulate human jitter."""
        if not self._page: return
        if self.on_stealth_action:
            self.on_stealth_action("Micro-movements (jitter)...")
        try:
            # Current mouse position isn't easily retrievable in Playwright
            # So we move to a relative offset if possible, or just a random small move
            for _ in range(random.randint(1, 4)):
                x_offset = random.randint(-3, 3)
                y_offset = random.randint(-3, 3)
                # Jitter around current (unknown) position by moving to a random valid screen cord
                # if we have a target element
                await self._page.mouse.move(
                    random.randint(0, 100), 
                    random.randint(0, 100), 
                    steps=5
                )
        except Exception:
            pass

    async def _quivering_scroll(self, target_y: int):
        """Scroll to target with natural 'quivering' (over-scroll and back)."""
        if not self._page: return
        current_y = 0 # Assume start from top if not tracked
        step = 100
        while current_y < target_y:
            next_step = min(step, target_y - current_y)
            # Add small random jitter to step
            next_step += random.randint(-15, 15)
            await self._page.mouse.wheel(0, next_step)
            current_y += next_step
            await asyncio.sleep(random.uniform(0.05, 0.2))
            
            # 10% chance to scroll back a little
            if random.random() < 0.1:
                back = random.randint(20, 50)
                await self._page.mouse.wheel(0, -back)
                current_y -= back
                await asyncio.sleep(0.1)

    async def _random_delay(self, min_s: float = 1.0, max_s: float = 3.5):
        """Legacy wrapper for natural delay."""
        await self._human_wait(base=(min_s + max_s)/2, sigma=(max_s - min_s)/3)

    async def start(self):
        """Launch browser and initialize context using DB account pool."""
        self._pw = await async_playwright().start()
        
        # 1. Get an account if not explicitly provided
        if self.username and self.password:
            # Create a temporary in-memory account object
            self.current_account = Account(username=self.username, password=self.password, email="", status="active")
        elif not self.username:
            await self._refresh_account_from_pool()
            
        if not self.current_account:
            logger.warning("⚠️ No active accounts in pool and no credentials provided. Starting in guest mode.")
                
        # Initialize proxy manager if not set
        if not self.proxy_manager:
            import os
            proxies_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "proxies.txt")
            if os.path.exists(proxies_file):
                 self.proxy_manager = ProxyManager.from_file(proxies_file)
            else:
                 env_proxy = os.getenv("PROXY_URL")
                 self.proxy_manager = ProxyManager([env_proxy] if env_proxy else [])
            
            # Select proxy
            self.current_proxy = await self.proxy_manager.get_healthy_proxy(retries=1)
        
        # 2. Browser launch args
        launch_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-infobars",
            "--window-position=0,0",
            "--ignore-certificate-errors",
            "--ignore-certificate-errors-spki-list",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
        ]

        self._browser = await self._pw.chromium.launch(
            headless=self.headless,
            args=launch_args,
        )

        # 3. Context configuration
        context_kwargs = {
            "viewport": {"width": 1366, "height": 768},
            "user_agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            "device_scale_factor": 1,
            "has_touch": False,
            "is_mobile": False,
            "java_script_enabled": True,
        }

        if self.current_proxy:
            context_kwargs["proxy"] = {"server": self.current_proxy}
        elif self.proxy:
            context_kwargs["proxy"] = {"server": self.proxy}

        # Use storage state if explicitly provided (e.g. from Chrome extension via API)
        if self.storage_state:
            logger.info("♻️  Using injected session")
            context_kwargs["storage_state"] = self.storage_state
        # Use storage state from DB if available
        elif self.current_account and self.current_account.storage_state_json != "{}":
            logger.info("♻️  Using session for account: %s", self.current_account.username)
            context_kwargs["storage_state"] = self.current_account.storage_state
        elif AUTH_STATE_FILE.exists():
            logger.info("♻️  Legacy reuse: auth.json")
            context_kwargs["storage_state"] = str(AUTH_STATE_FILE)

        self._context = await self._browser.new_context(**context_kwargs)
        self._page = await self._context.new_page()
        await apply_stealth(self._page)
        logger.info("✅ Browser started for %s", self.current_account.username if self.current_account else "guest")
        return True

    async def _refresh_account_from_pool(self):
        """Fetch the least recently used active account from DB."""
        with Session(engine) as session:
            statement = select(Account).where(Account.status == "active").order_by(Account.last_used)
            results = session.exec(statement)
            self.current_account = results.first()
            if self.current_account:
                logger.info("📡 Selected account from pool: %s", self.current_account.username)

    async def _save_session_to_db(self):
        """Save current browser storage state to the database."""
        if not self._context or not self.current_account:
            return
        
        try:
            state = await self._context.storage_state()
            with Session(engine) as session:
                db_acc = session.get(Account, self.current_account.id)
                if db_acc:
                    db_acc.storage_state = state
                    db_acc.last_used = datetime.utcnow()
                    session.add(db_acc)
                    session.commit()
                    logger.debug("💾 Session saved to DB for %s", db_acc.username)
        except Exception as e:
            logger.error("❌ Failed to save session: %s", e)

    async def login(self) -> bool:
        """
        Authenticate or verify session. Saves state on success.
        """
        page = self._page
        assert page is not None, "Call start() first"

        if not self.current_account:
            logger.warning("⚠️ Starting in Guest Mode (No current account)")
            return False

        logger.info("🕵️ Verifying session for %s...", self.current_account.username)
        try:
            await page.goto(f"{BASE_URL}/", wait_until="networkidle", timeout=30000)
            await self._jitter_move()
            await self._human_wait(1, 0.5)
        except Exception as e:
            logger.warning("🕒 Nav error: %s", e)
        
        # Check if already logged in by looking for logout link
        if await page.query_selector('a[href*="logout"]'):
            logger.info("✅ Session persistent!")
            await self._save_session_to_db()
            return True

        # If not logged in and we have credentials, TPA (Try Per Account) login
        # However, for 'Stealth' we prefer manual login once or semi-auto
        # Let's try once if we have password
        if self.current_account.password:
            logger.info("🔑 Attempting auto-login for %s...", self.current_account.username)
            try:
                await page.goto(LOGIN_URL, wait_until="networkidle")
                await self._human_wait(1, 0.5)
                
                logger.info("⌨️ Typing username...")
                await page.locator('input[name="username"]').click()
                await self._human_wait(0.2, 0.1)
                await page.locator('input[name="username"]').press_sequentially(self.current_account.username, delay=random.randint(60, 150))
                
                await self._human_wait(0.5, 0.2)
                
                logger.info("⌨️ Typing password...")
                await page.locator('input[name="password"]').click()
                await self._human_wait(0.2, 0.1)
                await page.locator('input[name="password"]').press_sequentially(self.current_account.password, delay=random.randint(60, 150))
                
                await self._human_wait(1.5, 0.5)
                await page.locator('button[type="submit"], input[type="submit"]').click()
                await page.wait_for_load_state("networkidle")
                
                if await page.query_selector('a[href*="logout"]'):
                    logger.info("🎉 Login SUCCESS!")
                    await self._save_session_to_db()
                    return True
            except Exception as e:
                logger.error("❌ Login failed: %s", e)
        
        return False

    async def check_ban_and_rotate(self) -> bool:
        """Enhanced health check: detect bans vs logouts."""
        if not self._page: return False
        
        curr_url = self._page.url
        content = (await self._page.content()).lower()
        
        ban_indicators = ["ip address is blocked", "too many requests", "access denied", "robot"]
        
        if any(p in content for p in ban_indicators):
            logger.warning("🚨 BAN DETECTED for %s", self.current_account.username if self.current_account else "IP")
            if self.current_account:
                with Session(engine) as session:
                    db_acc = session.get(Account, self.current_account.id)
                    if db_acc:
                        db_acc.status = "banned"
                        session.add(db_acc)
                        session.commit()
            return True
            
        if "/login/" in curr_url or "login" in content and "logout" not in content:
            logger.warning("🔑 Session expired / Logout for %s", self.current_account.username if self.current_account else "guest")
            if self.current_account:
                with Session(engine) as session:
                    db_acc = session.get(Account, self.current_account.id)
                    if db_acc:
                        db_acc.status = "needs_relogin"
                        session.add(db_acc)
                        session.commit()
            return True
            
        return False


    async def fetch_candidates(
        self,
        target_count: int = 10,
        start_page: int = 2,
        max_pages: int = 2,
    ) -> AsyncGenerator[dict, None]:
        """
        Navigate to Deleted .com, apply filters, and yield domain candidates.
        Uses SIE (Stealth Interaction Engine) for human imitation.
        """
        page = self._page
        assert page is not None, "Call start() first"

        # 1. Natural Navigation: Start at Home, wait, then go to Section
        logger.info("🌐 Human Flow: Visiting home page first...")
        await page.goto(f"{BASE_URL}/", wait_until="networkidle")
        await self._jitter_move()
        await self._human_wait(base=4, sigma=1.5, action="Reading homepage...")

        logger.info("📍 Human Flow: Navigating to Deleted .com via click...")
        try:
            # We want to click the tab instead of jumping via direct URL
            domain_tab = page.locator("a[href='/domains/expiredcom/'], a:has-text('Deleted Domains'), a:has-text('Deleted .com')").first
            await domain_tab.wait_for(timeout=5000)
            await domain_tab.click()
            await page.wait_for_load_state("networkidle")
        except Exception as e:
            logger.warning("Could not find Deleted tab by click, falling back to natural goto... %s", e)
            await page.goto(DELETED_COM_URL, wait_until="networkidle", referer=page.url)
            
        await self._simulate_human_interaction(page)
        
        # Debug: capture state before filters to verify auth
        await page.screenshot(path="debug_before_filters.png")
        await self._human_wait(base=3, sigma=1, action="Analyzing domain list...")

        # Apply filters: .com, age >= 5
        try:
            show_filter = await page.query_selector('a:has-text("Show Filter"), a.showfilter, button:has-text("Filter")')
            if show_filter:
                logger.info("🔘 Human Flow: Clicking 'Show Filter'...")
                await show_filter.click()
                await self._human_wait(base=1.5, sigma=0.5, action="Opening filters...")

            # Try to set minimum age filter
            age_set = False
            age_select = await page.query_selector('select#fwhoisage, select[name="fwhoisage"]')
            if age_select:
                logger.info("📅 Human Flow: Setting age filter...")
                await age_select.select_option(label="2010 (16 Years)") # Very safe
                age_set = True
            else:
                for age_name in ["fage", "f_aby", "f_aby_min"]:
                    age_input = await page.query_selector(f'input[name="{age_name}"]')
                    if age_input:
                        await age_input.click()
                        await self._human_wait(0.2, 0.1)
                        await page.locator(f'input[name="{age_name}"]').press_sequentially(str(MIN_AGE_YEARS), delay=random.randint(50, 150))
                        age_set = True
                        break

            apply_btn = await page.query_selector('input[name="button_submit"], button[type="submit"]')
            if apply_btn:
                logger.info("🚀 Human Flow: Submitting filters...")
                await self._human_wait(1, 0.5)
                await apply_btn.click()
                await page.wait_for_load_state("networkidle")
                await self._simulate_human_interaction(page)
                await self._human_wait(base=2, sigma=0.8, action="Waiting for filtered results...")
            elif age_set:
                await self._human_wait(0.5, 0.2)
                await page.keyboard.press("Enter")
                await page.wait_for_load_state("networkidle")
                await self._human_wait(base=2, sigma=0.8)

            base_filtered_url = page.url.split("#")[0]

        except Exception as e:
            logger.warning("⚠️ Filter step issues: %s. Continuing...", e)

        logger.info("📊 Human Flow: Sorting by BL (Backlinks) descending...")
        try:
            # expireddomains usually uses `&s=bl` in the href of the column header for sorting
            bl_sort_link = page.locator("th.field_bl a, a[href*='s=bl']").first
            if await bl_sort_link.count() > 0:
                await self._human_wait(1.5, 0.5, action="Sorting by BL...")
                await bl_sort_link.click()
                await page.wait_for_load_state("networkidle")
                await self._simulate_human_interaction(page)
        except Exception as e:
            logger.warning("Error clicking BL sort: %s", e)

        current_page_on_site = 1
        logger.info("🚶‍♂️ Human Flow: Navigating to start page %d via clicks...", start_page)
        while current_page_on_site < start_page:
            try:
                next_link = page.locator("a.next").first
                if await next_link.count() > 0:
                    await self._human_wait(2, 0.5, action=f"Going to page {current_page_on_site + 1}...")
                    await next_link.click()
                    await page.wait_for_load_state("networkidle")
                    await self._simulate_human_interaction(page)
                    current_page_on_site += 1
                else:
                    logger.warning("No 'Next' link found to reach start page.")
                    break
            except Exception as e:
                logger.error("Error navigating: %s", e)
                break

        found_count = 0
        for page_num in range(start_page, start_page + max_pages):
            if found_count >= target_count:
                break

            logger.info("📄 Scraping page %d...", page_num)
            
            if (page_num - start_page) > 0 and (page_num - start_page) % 3 == 0:
                logger.info("☕ Taking a big break...")
                await self._human_wait(base=45, sigma=10, action="Taking a coffee break...")

            try:
                # Use standard 'Next' clicks for subsequent pages
                if page_num > start_page:
                    logger.info("📄 Clicking 'Next' page ...")
                    next_link = page.locator("a.next").first
                    if await next_link.count() > 0:
                        await self._human_wait(1.5, 0.5, action="Going to next page...")
                        await next_link.click()
                        await page.wait_for_load_state("networkidle")
                    else:
                        logger.warning("No 'Next' link found for scraping.")
                        break
                        
                await self._simulate_human_interaction(page)
                
                # Wait for the listing table specifically
                try:
                    await page.wait_for_selector("table#listing", timeout=10000)
                except Exception:
                    logger.warning("   🕒 Timeout waiting for table#listing on page %d", page_num)
                
                rows = await page.query_selector_all("table#listing tr")
                for row in rows:
                    if found_count >= target_count:
                        break

                    try:
                        name_cell = await row.query_selector("a.namelinks")
                        if not name_cell: continue
                        
                        domain_name = (await name_cell.inner_text()).strip().lower()
                        
                        bl_cell = await row.query_selector("td.field_bl")
                        bl_value = 0
                        if bl_cell:
                            bl_text = (await bl_cell.inner_text()).strip().replace(",", "")
                            bl_value = int(bl_text) if bl_text.isdigit() else 0

                        age_cell = await row.query_selector("td.field_abirth")
                        age_value = 0
                        if age_cell:
                            age_text = (await age_cell.inner_text()).strip()
                            if age_text.isdigit():
                                birth_year = int(age_text)
                                age_value = 2026 - birth_year

                        if not is_clean_domain(domain_name): continue
                        if age_value > 0 and age_value < MIN_AGE_YEARS: continue

                        candidate = {
                            "name": domain_name,
                            "bl": bl_value,
                            "age_years": age_value,
                            "source_page": page_num,
                            "status": "pending",
                        }
                        found_count += 1
                        yield candidate

                    except Exception as e:
                        continue

            except Exception as e:
                logger.error("❌ Failed to load page %d: %s", page_num, e)
                continue

            # Parse domain table rows
            rows = await page.query_selector_all("table#listing tr")

            if not rows:
                debug_path = Path(__file__).resolve().parent.parent / f"search_fail_p{page_num}.png"
                await page.screenshot(path=str(debug_path))
                logger.warning("   ⚠️ No rows found on page %d. Screenshot saved to %s", page_num, debug_path)
                # Log a bit of HTML to see what's up
                content = await page.content()
                logger.debug("   📄 Content snippet: %s...", content[:500].replace('\n', ' '))

            logger.info("   Found %d rows on page %d", len(rows), page_num)

            for row in rows:
                if found_count >= target_count:
                    break

                try:
                    # Extract domain name
                    name_cell = await row.query_selector("a.namelinks")
                    if not name_cell:
                        continue

                    domain_name = (await name_cell.inner_text()).strip().lower()

                    # Extract BL (backlinks)
                    bl_cell = await row.query_selector("td.field_bl")
                    bl_value = 0
                    if bl_cell:
                        bl_text = (await bl_cell.inner_text()).strip().replace(",", "")
                        bl_value = int(bl_text) if bl_text.isdigit() else 0

                    # Extract age (Whois Birth Year)
                    age_cell = await row.query_selector("td.field_abirth")
                    age_value = 0
                    if age_cell:
                        age_text = (await age_cell.inner_text()).strip()
                        if age_text.isdigit():
                            birth_year = int(age_text)
                            if 1980 <= birth_year <= 2026:
                                age_value = 2026 - birth_year
                        elif "Page Content" in age_text: # Handle potential placeholders
                            age_value = 0

                    # Apply local stop-word filter
                    if not is_clean_domain(domain_name):
                        logger.debug("   🚫 Filtered out (stop-word): %s", domain_name)
                        continue

                    # Age check (double-verify)
                    if age_value > 0 and age_value < MIN_AGE_YEARS:
                        logger.debug("   🚫 Filtered out (too young): %s (%d years)", domain_name, age_value)
                        continue

                    candidate = {
                        "name": domain_name,
                        "bl": bl_value,
                        "age_years": age_value,
                        "source_page": page_num,
                        "status": "pending",
                    }
                    found_count += 1
                    logger.info("   ✅ [%d/%d] %s (BL: %d, Age: %d)", found_count, target_count, domain_name, bl_value, age_value)
                    yield candidate

                except Exception as e:
                    logger.debug("   ⚠️ Error parsing row: %s", e)
                    continue

        logger.info("🏁 Human Flow: Scraping complete.")

    async def _simulate_human_interaction(self, page: Page):
        """High-fidelity human behavior simulation."""
        try:
            # 1. Jittery/Natural Scroll
            scroll_depth = random.randint(300, 800)
            await self._quivering_scroll(scroll_depth)
            
            # 2. Mouse Jitter during "reading"
            await self._human_wait(base=3, sigma=1)
            await self._jitter_move()
            
            # 3. Random small scroll back Up
            if random.random() < 0.4:
                await self._quivering_scroll(-random.randint(50, 150))
                
        except Exception as e:
            logger.debug("⚠️ STEALTH: Human interaction simulation failed: %s", e)

    async def rotate_proxy(self):
        """Switch to a new proxy if manager is available."""
        if self.proxy_manager:
            new_proxy = await self.proxy_manager.get_healthy_proxy(retries=1)
            if new_proxy and new_proxy != self.current_proxy:
                self.current_proxy = new_proxy
                self.proxy = new_proxy
                logger.info("🔄 Rotated to new proxy: %s", new_proxy)
                # Proxy changes require a browser restart
                await self.close()
                await self.start()
                return True
            else:
                logger.warning("🔄 Tried to rotate proxy but no valid new proxy found.")
                return False
        return False

    async def close(self):
        """Clean up browser resources."""
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()
        logger.info("🔒 Browser closed")
