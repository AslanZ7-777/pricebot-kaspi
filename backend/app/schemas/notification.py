import uuid
from datetime import datetime
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID | None
    type: str
    message: str
    payload: dict | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListOut(BaseModel):
    items: list[NotificationOut]
    total: int
    unread_count: int


class WsEvent(BaseModel):
    type: str
    product_id: str | None = None
    payload: dict | None = None
    message: str | None = None
