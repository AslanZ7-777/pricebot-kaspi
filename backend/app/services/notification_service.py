import json
import uuid
from datetime import datetime, timezone
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.notification import Notification
from app.config import get_settings

REDIS_CHANNEL = "omarket:events"


async def emit(
    db: AsyncSession,
    event_type: str,
    message: str,
    product_id: uuid.UUID | None = None,
    payload: dict | None = None,
) -> Notification:
    notification = Notification(
        product_id=product_id,
        type=event_type,
        message=message,
        payload=payload,
    )
    db.add(notification)
    await db.flush()

    settings = get_settings()
    try:
        r = aioredis.from_url(settings.redis_url, decode_responses=True, protocol=2)
        event_data = {
            "type": event_type,
            "product_id": str(product_id) if product_id else None,
            "message": message,
            "payload": payload,
            "notification_id": str(notification.id),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await r.publish(REDIS_CHANNEL, json.dumps(event_data))
        await r.aclose()
    except Exception:
        pass  # Redis publish failure must not break DB transaction

    return notification
