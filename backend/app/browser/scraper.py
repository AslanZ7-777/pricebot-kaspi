import asyncio
import logging
import random
import re
import time
from decimal import Decimal, InvalidOperation
from dataclasses import dataclass, field
from playwright.async_api import BrowserContext, Page
from app.config import get_settings

logger = logging.getLogger(__name__)

OMARKET_BASE = "https://omarket.kz"


class SessionExpiredError(Exception):
    pass


class BotDetectedError(Exception):
    pass


class SelectorNotFoundError(Exception):
    pass


@dataclass
class CompetitorData:
    seller: str
    price: Decimal
    in_stock: bool


@dataclass
class ScrapedData:
    our_price: Decimal | None
    competitors: list[CompetitorData] = field(default_factory=list)
    product_name: str | None = None
    sku_id: str | None = None
    duration_ms: int = 0


def parse_price(text: str) -> Decimal | None:
    if not text:
        return None
    cleaned = re.sub(r"[^\d.,]", "", text.strip())
    cleaned = cleaned.replace(",", ".")
    cleaned = re.sub(r"\.(?=.*\.)", "", cleaned)
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


async def _check_page_health(page: Page) -> None:
    if "/login" in page.url or "/auth" in page.url:
        raise SessionExpiredError(f"Redirected to login: {page.url}")

    if await page.locator(".cf-error-title, #challenge-running, .cf-browser-verification").count() > 0:
        raise BotDetectedError("Cloudflare challenge detected")

    status = await page.evaluate("document.readyState")
    if status not in ("complete", "interactive"):
        await page.wait_for_load_state("domcontentloaded", timeout=10000)


async def scrape_product(context: BrowserContext, product_url: str) -> ScrapedData:
    settings = get_settings()
    sel = settings.selector_config
    start = time.monotonic()

    page = await context.new_page()
    try:
        await page.goto(product_url, wait_until="domcontentloaded", timeout=30000)
        await _check_page_health(page)

        # Extract product name
        product_name = None
        name_el = page.locator(sel["product_name"])
        if await name_el.count() > 0:
            product_name = (await name_el.first.inner_text()).strip()

        # Extract our price
        our_price = None
        our_price_el = page.locator(sel["our_price"])
        if await our_price_el.count() > 0:
            price_text = await our_price_el.first.inner_text()
            our_price = parse_price(price_text)
        else:
            logger.warning(f"Our price selector not found on {product_url} — selector: {sel['our_price']}")

        # Extract competitors
        competitors: list[CompetitorData] = []
        competitor_items = await page.locator(sel["competitor_block"]).all()

        for item in competitor_items:
            try:
                price_text = await item.locator(sel["competitor_price"]).first.inner_text()
                price = parse_price(price_text)
                if price is None:
                    continue

                seller = ""
                seller_el = item.locator(sel["competitor_seller"])
                if await seller_el.count() > 0:
                    seller = (await seller_el.first.inner_text()).strip()

                item_text = (await item.inner_text()).lower()
                in_stock = "нет в наличии" not in item_text and "нет на складе" not in item_text

                competitors.append(CompetitorData(seller=seller, price=price, in_stock=in_stock))
            except Exception as e:
                logger.debug(f"Failed to parse competitor item: {e}")

        # Human-like delay
        await asyncio.sleep(random.uniform(1.5, 3.5))

        duration_ms = int((time.monotonic() - start) * 1000)
        return ScrapedData(
            our_price=our_price,
            competitors=competitors,
            product_name=product_name,
            duration_ms=duration_ms,
        )

    except (SessionExpiredError, BotDetectedError):
        raise
    except Exception as e:
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.error(f"scrape_product failed for {product_url}: {e}")
        raise
    finally:
        await page.close()


def get_min_competitor_price(scraped: ScrapedData) -> Decimal | None:
    in_stock_prices = [c.price for c in scraped.competitors if c.in_stock]
    if not in_stock_prices:
        all_prices = [c.price for c in scraped.competitors]
        return min(all_prices) if all_prices else None
    return min(in_stock_prices)
