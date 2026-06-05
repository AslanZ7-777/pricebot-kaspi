import asyncio
import logging
import os
from decimal import Decimal
from datetime import datetime, timezone
from playwright.async_api import BrowserContext
from app.browser.scraper import SessionExpiredError, BotDetectedError, parse_price
from app.config import get_settings

logger = logging.getLogger(__name__)

# Selectors for the price edit form — update these after inspecting live Omarket seller panel
EDIT_URL_SUFFIX = "/edit"
PRICE_EDIT_TRIGGER = ".edit-price-btn, button:has-text('Изменить цену'), .price-edit"
PRICE_INPUT_SELECTOR = "input[name='price'], #price-input, .price-field input"
SAVE_BUTTON_SELECTOR = "button[type='submit'].save, .btn-save-price, button:has-text('Сохранить')"
SUCCESS_INDICATOR = ".alert-success, .success-toast, .price-updated-success"


class PriceUpdateError(Exception):
    pass


async def update_price(context: BrowserContext, product_url: str, new_price: Decimal) -> bool:
    settings = get_settings()
    page = await context.new_page()

    try:
        # Try the edit page directly first
        edit_url = product_url.rstrip("/") + EDIT_URL_SUFFIX
        await page.goto(edit_url, wait_until="domcontentloaded", timeout=30000)

        if "/login" in page.url:
            raise SessionExpiredError("Redirected to login during price update")

        # If edit page returned 404 or no form, try the product page and look for edit button
        price_input = page.locator(PRICE_INPUT_SELECTOR)
        if await price_input.count() == 0:
            await page.goto(product_url, wait_until="domcontentloaded", timeout=30000)
            trigger = page.locator(PRICE_EDIT_TRIGGER)
            if await trigger.count() > 0:
                await trigger.first.click()
                await page.wait_for_selector(PRICE_INPUT_SELECTOR, timeout=8000)
            else:
                raise PriceUpdateError(f"Cannot find price edit form on {product_url}")

        price_input = page.locator(PRICE_INPUT_SELECTOR).first
        await price_input.triple_click()
        await page.keyboard.press("Control+a")
        await price_input.type(str(int(new_price)), delay=60)

        await asyncio.sleep(0.3)

        save_btn = page.locator(SAVE_BUTTON_SELECTOR).first
        await save_btn.click()

        # Wait for success indicator
        try:
            await page.wait_for_selector(SUCCESS_INDICATOR, timeout=8000)
            logger.info(f"Price updated successfully to {new_price} on {product_url}")
            return True
        except Exception:
            # Verify by reading the input value back
            actual_value = await price_input.input_value()
            actual_price = parse_price(actual_value)
            if actual_price and abs(actual_price - new_price) < Decimal("1"):
                logger.info(f"Price update verified via field value: {actual_price}")
                return True

            # Take a screenshot for debugging
            _save_debug_screenshot(page, product_url)
            raise PriceUpdateError(f"Price update unconfirmed. Expected {new_price}, field shows '{actual_value}'")

    except (SessionExpiredError, BotDetectedError, PriceUpdateError):
        raise
    except Exception as e:
        _save_debug_screenshot(page, product_url)
        raise PriceUpdateError(f"Unexpected error during price update: {e}") from e
    finally:
        await page.close()


def _save_debug_screenshot(page, product_url: str) -> None:
    try:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe_url = product_url.replace("/", "_").replace(":", "")[-50:]
        path = os.path.join("logs", "screenshots", f"update_fail_{safe_url}_{timestamp}.png")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        asyncio.create_task(page.screenshot(path=path))
    except Exception:
        pass
