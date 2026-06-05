import asyncio
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from worker.celery_app import app
from app.db.session import AsyncSessionLocal
from app.db.models.product import Product, ProductConfig
from app.db.models.price_snapshot import PriceSnapshot
from app.db.models.price_change import PriceChange
from app.browser.browser_pool import acquire_context
from app.browser.scraper import scrape_product, get_min_competitor_price, SessionExpiredError, BotDetectedError
from app.browser.price_updater import update_price, PriceUpdateError
from app.services.price_engine import calculate_reprice, RepriceDecision
from app.services import notification_service
from sqlalchemy import select

logger = logging.getLogger(__name__)


def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@app.task(
    bind=True,
    name="worker.tasks.scan_product.scan_product",
    max_retries=3,
    default_retry_delay=30,
    queue="monitoring",
)
def scan_product(self, product_id: str):
    return run_async(_scan_product_async(self, product_id))


async def _scan_product_async(task, product_id_str: str):
    product_id = uuid.UUID(product_id_str)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            logger.error(f"Product {product_id} not found")
            return

        config_result = await db.execute(
            select(ProductConfig).where(ProductConfig.product_id == product_id)
        )
        config = config_result.scalar_one_or_none()
        if not config:
            logger.error(f"Config for product {product_id} not found")
            return

        snapshot = PriceSnapshot(product_id=product_id)
        db.add(snapshot)

        try:
            async with acquire_context() as ctx:
                scraped = await scrape_product(ctx, product.omarket_url)

            # Update product name if found
            if scraped.product_name and not product.name:
                product.name = scraped.product_name

            min_price = get_min_competitor_price(scraped)
            snapshot.our_price = scraped.our_price
            snapshot.min_competitor_price = min_price
            snapshot.competitor_count = len(scraped.competitors)
            snapshot.scan_duration_ms = scraped.duration_ms
            snapshot.raw_competitors = [
                {"seller": c.seller, "price": float(c.price), "in_stock": c.in_stock}
                for c in scraped.competitors
            ]

            await db.flush()

            # Repricing decision
            if config.auto_reprice and scraped.our_price is not None:
                result = calculate_reprice(
                    our_price=scraped.our_price,
                    min_competitor_price=min_price,
                    step=Decimal(str(config.step)),
                    floor_price=Decimal(str(config.floor_price)),
                )

                if result.decision == RepriceDecision.UPDATE and result.new_price:
                    change = PriceChange(
                        product_id=product_id,
                        snapshot_id=snapshot.id,
                        old_price=scraped.our_price,
                        new_price=result.new_price,
                        reason="auto_reprice",
                        status="pending",
                    )
                    db.add(change)
                    await db.flush()

                    try:
                        async with acquire_context() as ctx:
                            success = await update_price(ctx, product.omarket_url, result.new_price)

                        now = datetime.now(timezone.utc)
                        change.status = "success" if success else "failed"
                        change.completed_at = now

                        if success:
                            await notification_service.emit(
                                db=db,
                                event_type="price_updated",
                                message=f"Цена изменена: {scraped.our_price} → {result.new_price} ₸",
                                product_id=product_id,
                                payload={
                                    "old_price": float(scraped.our_price),
                                    "new_price": float(result.new_price),
                                    "product_name": product.name,
                                },
                            )
                    except PriceUpdateError as e:
                        change.status = "failed"
                        change.error_message = str(e)
                        change.completed_at = datetime.now(timezone.utc)

                elif result.decision == RepriceDecision.FLOOR_REACHED:
                    change = PriceChange(
                        product_id=product_id,
                        snapshot_id=snapshot.id,
                        old_price=scraped.our_price,
                        new_price=scraped.our_price,
                        reason="floor_reached",
                        status="skipped",
                    )
                    db.add(change)
                    await notification_service.emit(
                        db=db,
                        event_type="floor_reached",
                        message=f"Достигнута минимальная цена {config.floor_price} ₸",
                        product_id=product_id,
                        payload={"floor_price": float(config.floor_price)},
                    )

            await db.commit()
            logger.info(f"Scan completed for product {product_id}")

        except SessionExpiredError:
            snapshot.error = "session_expired"
            await db.commit()
            await notification_service.emit(
                db=db,
                event_type="login_required",
                message="Сессия Omarket.kz истекла. Требуется повторная авторизация.",
            )
        except BotDetectedError:
            snapshot.error = "bot_detected"
            await db.commit()
            raise task.retry(countdown=120)
        except Exception as e:
            snapshot.error = str(e)[:500]
            await db.commit()
            logger.error(f"Scan failed for {product_id}: {e}")
            raise task.retry(exc=e)
