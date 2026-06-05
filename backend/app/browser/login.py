import logging
from playwright.async_api import BrowserContext
from app.config import get_settings

logger = logging.getLogger(__name__)

OMARKET_BASE = "https://omarket.kz"
AUTH_URL = "https://auth.omarket.kz"
LOGIN_URL = f"{AUTH_URL}/login"

# Verified against real auth.omarket.kz/login DOM (2026-06-05)
USERNAME_SELECTOR = "#login"
PASSWORD_SELECTOR = "#password"
# First "Войти" button (type=button, orange) — index 7 in full button list
SUBMIT_SELECTOR = 'button[type="button"]:has-text("Войти")'
ERROR_SELECTOR = ".alert, .error, [class*='error'], [class*='alert']"

# Indicators that we're on the authenticated seller area
AUTH_INDICATORS = [
    # post-auth redirect away from auth.omarket.kz
    "seller.omarket.kz",
    "omarket.kz/seller",
    "omarket.kz/cabinet",
    "omarket.kz/dashboard",
    "omarket.kz/profile",
    "omarket.kz/lk",
]


async def is_logged_in(context: BrowserContext) -> bool:
    page = await context.new_page()
    try:
        await page.goto(OMARKET_BASE, wait_until="domcontentloaded", timeout=30000)
        url = page.url
        # If we end up on auth.omarket.kz, we're not logged in
        if AUTH_URL in url:
            return False
        # Look for user account elements
        for sel in [".user-account", ".header-user", "[data-testid='user-menu']",
                    ".lk-link", ".profile-menu", "a[href*='/profile']", "a[href*='/cabinet']"]:
            if await page.locator(sel).count() > 0:
                return True
        return False
    except Exception as e:
        logger.warning(f"is_logged_in check failed: {e}")
        return False
    finally:
        await page.close()


async def login(context: BrowserContext) -> bool:
    settings = get_settings()
    if not settings.omarket_login or not settings.omarket_password:
        logger.error("Omarket credentials not configured in .env")
        return False

    page = await context.new_page()
    try:
        logger.info(f"Navigating to login page: {LOGIN_URL}")
        await page.goto(LOGIN_URL, wait_until="networkidle", timeout=30000)

        # Already on authenticated page?
        if AUTH_URL not in page.url:
            logger.info(f"Already authenticated — URL: {page.url}")
            return True

        # Wait for login form to be visible
        await page.wait_for_selector(USERNAME_SELECTOR, state="visible", timeout=10000)

        # Fill credentials
        await page.locator(USERNAME_SELECTOR).fill(settings.omarket_login)
        await page.locator(PASSWORD_SELECTOR).fill(settings.omarket_password)

        # Small human-like pause before submitting
        await page.wait_for_timeout(500)

        # Click the first "Войти" button (login with password tab)
        await page.locator(SUBMIT_SELECTOR).first.click()

        # Wait for navigation away from the auth page
        try:
            await page.wait_for_function(
                f"() => !window.location.href.includes('{AUTH_URL}')",
                timeout=20000,
            )
            logger.info(f"Login successful — redirected to: {page.url}")
            return True
        except Exception:
            pass

        # Check if we're still on the login page with an error
        if AUTH_URL in page.url:
            error_els = page.locator(ERROR_SELECTOR)
            if await error_els.count() > 0:
                error_text = await error_els.first.inner_text()
                logger.error(f"Login failed — error on page: {error_text}")
            else:
                logger.error(f"Login failed — still on auth page: {page.url}")
            return False

        logger.info(f"Login result unclear — URL: {page.url}")
        return True

    except Exception as e:
        logger.error(f"Login exception: {e}")
        return False
    finally:
        await page.close()


async def login_with_ecp(context: BrowserContext, ecp_file_path: str, ecp_password: str) -> bool:
    """Future support for ECP (Electronic Digital Signature) login."""
    page = await context.new_page()
    try:
        await page.goto(LOGIN_URL, wait_until="networkidle", timeout=30000)
        ecp_tab = page.locator("button:has-text('ЭЦП'), .ecp-login, [data-auth='ecp']")
        if await ecp_tab.count() == 0:
            logger.error("ECP tab/button not found on page")
            return False

        await ecp_tab.first.click()
        await page.wait_for_timeout(500)

        async with page.expect_file_chooser(timeout=10000) as fc_info:
            await page.locator("button:has-text('Выберите сертификат')").first.click()
        file_chooser = await fc_info.value
        await file_chooser.set_files(ecp_file_path)

        ecp_pass_input = page.locator("input[type='password']")
        await ecp_pass_input.fill(ecp_password)
        await page.locator(SUBMIT_SELECTOR).last.click()

        await page.wait_for_function(
            f"() => !window.location.href.includes('{AUTH_URL}')",
            timeout=20000,
        )
        return True
    except Exception as e:
        logger.error(f"ECP login failed: {e}")
        return False
    finally:
        await page.close()
