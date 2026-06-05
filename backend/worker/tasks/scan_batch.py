import asyncio
import logging
import random
from worker.celery_app import app
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, text

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


@app.task(name="worker.tasks.scan_batch.scan_all_active_products", queue="default")
def scan_all_active_products():
    return run_async(_fan_out_async())


async def _fan_out_async():
    from worker.tasks.scan_product import scan_product

    async with AsyncSessionLocal() as db:
        result = await db.execute(text("""
            SELECT p.id
            FROM products p
            JOIN product_configs pc ON pc.product_id = p.id
            WHERE p.is_active = TRUE
              AND pc.auto_reprice = TRUE
              AND (
                (SELECT MAX(captured_at) FROM price_snapshots WHERE product_id = p.id) IS NULL
                OR
                NOW() - (SELECT MAX(captured_at) FROM price_snapshots WHERE product_id = p.id)
                    > (pc.check_interval_minutes || ' minutes')::interval
              )
            ORDER BY
                COALESCE(
                    (SELECT our_price - min_competitor_price
                     FROM price_snapshots
                     WHERE product_id = p.id
                       AND our_price IS NOT NULL
                       AND min_competitor_price IS NOT NULL
                     ORDER BY captured_at DESC
                     LIMIT 1),
                    0
                ) DESC
        """))
        product_ids = [str(row[0]) for row in result.fetchall()]

    if not product_ids:
        logger.info("No products due for scanning")
        return

    logger.info(f"Fanning out {len(product_ids)} product scans")

    for product_id in product_ids:
        jitter = random.uniform(0, 30)
        scan_product.apply_async(args=[product_id], countdown=jitter, queue="monitoring")

    return {"queued": len(product_ids)}
