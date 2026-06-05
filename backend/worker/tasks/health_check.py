import asyncio
import logging
from worker.celery_app import app
from app.db.session import AsyncSessionLocal
from app.browser.browser_pool import acquire_context
from app.browser.login import is_logged_in, login
from app.services.session_manager import invalidate_session
from app.services import notification_service
from app.config import get_settings

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


@app.task(name="worker.tasks.health_check.check_session_validity", queue="default")
def check_session_validity():
    return run_async(_check_async())


async def _check_async():
    settings = get_settings()
    if not settings.omarket_login:
        return {"status": "no_credentials"}

    async with acquire_context() as ctx:
        logged_in = await is_logged_in(ctx)

    if logged_in:
        logger.info("Session health check: authenticated")
        return {"status": "valid"}

    logger.warning("Session health check: not authenticated, attempting re-login")
    async with AsyncSessionLocal() as db:
        async with acquire_context() as ctx:
            success = await login(ctx)
        if not success:
            await invalidate_session(db, settings.omarket_login)
            await notification_service.emit(
                db=db,
                event_type="login_required",
                message="Сессия Omarket.kz недействительна. Требуется повторная авторизация.",
            )
            await db.commit()
            return {"status": "login_failed"}

    return {"status": "re_logged_in"}
