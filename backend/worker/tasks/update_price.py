import asyncio
import uuid
import logging
from decimal import Decimal
from datetime import datetime, timezone
from worker.celery_app import app
from app.db.session import AsyncSessionLocal
from app.db.models.product import Product
from app.db.models.price_change import PriceChange
from app.browser.browser_pool import acquire_context
from app.browser.price_updater import update_price, PriceUpdateError
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
    name="worker.tasks.update_price.manual_price_update",
    max_retries=2,
    default_retry_delay=300,
    queue="monitoring",
)
def manual_price_update(self, product_id: str, new_price: float, old_price: float):
    return run_async(_manual_update_async(self, product_id, new_price, old_price))


async def _manual_update_async(task, product_id_str: str, new_price_float: float, old_price_float: float):
    product_id = uuid.UUID(product_id_str)
    new_price = Decimal(str(new_price_float))
    old_price = Decimal(str(old_price_float))

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        if not product:
            return

        change = PriceChange(
            product_id=product_id,
            old_price=old_price,
            new_price=new_price,
            reason="manual",
            status="pending",
        )
        db.add(change)
        await db.flush()

        try:
            async with acquire_context() as ctx:
                success = await update_price(ctx, product.omarket_url, new_price)

            change.status = "success" if success else "failed"
            change.completed_at = datetime.now(timezone.utc)

            if success:
                await notification_service.emit(
                    db=db,
                    event_type="price_updated",
                    message=f"Цена вручную изменена: {old_price} → {new_price} ₸",
                    product_id=product_id,
                    payload={"old_price": float(old_price), "new_price": float(new_price)},
                )
        except PriceUpdateError as e:
            change.status = "failed"
            change.error_message = str(e)
            change.completed_at = datetime.now(timezone.utc)
            raise task.retry(exc=e)

        await db.commit()
