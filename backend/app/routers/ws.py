import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from app.config import get_settings
from app.services.notification_service import REDIS_CHANNEL

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)

connected_clients: set[WebSocket] = set()


@router.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    logger.info(f"WS client connected. Total: {len(connected_clients)}")

    settings = get_settings()
    r = aioredis.from_url(settings.redis_url, decode_responses=True, protocol=2)
    pubsub = r.pubsub()
    await pubsub.subscribe(REDIS_CHANNEL)

    try:
        while True:
            try:
                message = await asyncio.wait_for(pubsub.get_message(ignore_subscribe_messages=True), timeout=30.0)
                if message and message["type"] == "message":
                    await websocket.send_text(message["data"])
                await asyncio.sleep(0.01)
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_text('{"type":"ping"}')
                except Exception:
                    break
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except Exception as e:
        logger.debug(f"WS loop ended: {e}")
    finally:
        connected_clients.discard(websocket)
        await pubsub.unsubscribe(REDIS_CHANNEL)
        await r.aclose()
        logger.info(f"WS client disconnected. Total: {len(connected_clients)}")
