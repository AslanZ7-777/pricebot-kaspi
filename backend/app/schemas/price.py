import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class CompetitorOut(BaseModel):
    seller: str
    price: Decimal
    in_stock: bool


class PriceSnapshotOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    captured_at: datetime
    our_price: Decimal | None
    min_competitor_price: Decimal | None
    competitor_count: int | None
    raw_competitors: list[CompetitorOut] | None
    scan_duration_ms: int | None
    error: str | None

    model_config = {"from_attributes": True}


class PriceChangeOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    old_price: Decimal
    new_price: Decimal
    reason: str
    status: str
    error_message: str | None
    attempted_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class PriceHistoryPoint(BaseModel):
    captured_at: datetime
    our_price: Decimal | None
    min_competitor_price: Decimal | None


class DashboardSummary(BaseModel):
    total_products: int
    winning_products: int
    changes_today: int
    floor_products: int
    error_products: int
    paused_products: int
