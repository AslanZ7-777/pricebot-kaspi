from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.browser_session import BrowserSession
from app.config import get_settings


async def load_session(db: AsyncSession, account_login: str) -> BrowserSession | None:
    result = await db.execute(
        select(BrowserSession).where(BrowserSession.account_login == account_login)
    )
    return result.scalar_one_or_none()


async def save_session(
    db: AsyncSession,
    account_login: str,
    cookies: list,
    local_storage: dict,
    user_agent: str | None = None,
    is_login: bool = False,
) -> BrowserSession:
    result = await db.execute(
        select(BrowserSession).where(BrowserSession.account_login == account_login)
    )
    session = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if session is None:
        session = BrowserSession(
            account_login=account_login,
            cookies=cookies,
            local_storage=local_storage,
            user_agent=user_agent,
            is_valid=True,
            last_used_at=now,
            last_login_at=now if is_login else None,
        )
        db.add(session)
    else:
        session.cookies = cookies
        session.local_storage = local_storage
        session.is_valid = True
        session.last_used_at = now
        if user_agent:
            session.user_agent = user_agent
        if is_login:
            session.last_login_at = now

    await db.flush()
    return session


async def invalidate_session(db: AsyncSession, account_login: str) -> None:
    result = await db.execute(
        select(BrowserSession).where(BrowserSession.account_login == account_login)
    )
    session = result.scalar_one_or_none()
    if session:
        session.is_valid = False
        await db.flush()


async def get_session_status(db: AsyncSession) -> dict:
    settings = get_settings()
    login = settings.omarket_login
    if not login:
        return {"is_valid": False, "account_login": None, "last_login_at": None, "last_used_at": None}

    session = await load_session(db, login)
    if session is None:
        return {"is_valid": False, "account_login": login, "last_login_at": None, "last_used_at": None}

    return {
        "is_valid": session.is_valid,
        "account_login": session.account_login,
        "last_login_at": session.last_login_at,
        "last_used_at": session.last_used_at,
    }
