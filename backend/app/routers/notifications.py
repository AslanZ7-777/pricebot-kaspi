import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.db.session import get_db
from app.db.models.notification import Notification
from app.schemas.notification import NotificationOut, NotificationListOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListOut)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    query = select(Notification)
    if unread_only:
        query = query.where(Notification.is_read == False)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    unread_count = (await db.execute(
        select(func.count()).where(Notification.is_read == False)
    )).scalar() or 0

    result = await db.execute(
        query.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = result.scalars().all()
    return NotificationListOut(items=items, total=total, unread_count=unread_count)


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(notification_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.flush()
    return notif


@router.post("/read-all")
async def mark_all_read(db: AsyncSession = Depends(get_db)):
    await db.execute(update(Notification).where(Notification.is_read == False).values(is_read=True))
    return {"ok": True}


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(notification_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notif = result.scalar_one_or_none()
    if notif:
        await db.delete(notif)
