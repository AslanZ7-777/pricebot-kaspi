from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.session_manager import get_session_status, invalidate_session
from app.config import get_settings

router = APIRouter(prefix="/session", tags=["session"])


@router.get("/status")
async def session_status(db: AsyncSession = Depends(get_db)):
    return await get_session_status(db)


@router.post("/login")
async def trigger_login(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    background_tasks.add_task(_background_login)
    return {"message": "Попытка авторизации запущена в фоне"}


@router.post("/logout")
async def logout(db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    if settings.omarket_login:
        await invalidate_session(db, settings.omarket_login)
    return {"message": "Сессия очищена"}


async def _background_login():
    from app.browser.browser_pool import acquire_context
    from app.browser.login import login
    from app.services.session_manager import save_session
    from app.db.session import AsyncSessionLocal
    from app.config import get_settings

    settings = get_settings()
    async with acquire_context() as ctx:
        success = await login(ctx)
        if success and settings.omarket_login:
            cookies = await ctx.cookies()
            async with AsyncSessionLocal() as db:
                await save_session(
                    db,
                    account_login=settings.omarket_login,
                    cookies=cookies,
                    local_storage={},
                    is_login=True,
                )
                await db.commit()
