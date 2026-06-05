import asyncio
import logging
from contextlib import asynccontextmanager
from playwright.async_api import async_playwright, Browser, BrowserContext, Playwright
from app.browser.stealth import apply_stealth, get_launch_args, random_user_agent, random_viewport
from app.config import get_settings

logger = logging.getLogger(__name__)

_playwright: Playwright | None = None
_browser: Browser | None = None
_contexts: list[BrowserContext] = []
_semaphore: asyncio.Semaphore | None = None
_lock = asyncio.Lock()


async def init_pool() -> None:
    global _playwright, _browser, _contexts, _semaphore
    settings = get_settings()
    pool_size = settings.browser_pool_size

    _playwright = await async_playwright().start()
    _browser = await _playwright.chromium.launch(
        headless=settings.browser_headless,
        args=get_launch_args(),
    )

    _contexts = []
    for _ in range(pool_size):
        ctx = await _browser.new_context(
            user_agent=random_user_agent(),
            viewport=random_viewport(),
            locale="ru-RU",
            timezone_id="Asia/Almaty",
            extra_http_headers={
                "Accept-Language": "ru-RU,ru;q=0.9,kk-KZ;q=0.8,en-US;q=0.7",
            },
        )
        await apply_stealth(ctx)
        _contexts.append(ctx)

    _semaphore = asyncio.Semaphore(pool_size)
    logger.info(f"Browser pool initialised with {pool_size} contexts")


async def close_pool() -> None:
    global _playwright, _browser, _contexts
    for ctx in _contexts:
        try:
            await ctx.close()
        except Exception:
            pass
    if _browser:
        await _browser.close()
    if _playwright:
        await _playwright.stop()
    _contexts = []
    logger.info("Browser pool closed")


@asynccontextmanager
async def acquire_context():
    global _semaphore, _contexts, _lock
    if _semaphore is None:
        raise RuntimeError("Browser pool is not initialised. Call init_pool() first.")

    await _semaphore.acquire()
    async with _lock:
        ctx = _contexts.pop(0)
    try:
        yield ctx
    finally:
        async with _lock:
            _contexts.append(ctx)
        _semaphore.release()
