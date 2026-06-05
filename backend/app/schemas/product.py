import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, HttpUrl, field_validator


class ProductConfigBase(BaseModel):
    step: Decimal = Decimal("100")
    floor_price: Decimal
    auto_reprice: bool = True
    check_interval_minutes: int = 30


class ProductConfigCreate(ProductConfigBase):
    pass


class ProductConfigUpdate(BaseModel):
    step: Decimal | None = None
    floor_price: Decimal | None = None
    auto_reprice: bool | None = None
    check_interval_minutes: int | None = None


class ProductConfigOut(ProductConfigBase):
    id: uuid.UUID
    product_id: uuid.UUID
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    omarket_url: str
    floor_price: Decimal
    step: Decimal = Decimal("100")
    check_interval_minutes: int = 30


class ProductUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class CompetitorInfo(BaseModel):
    seller: str
    price: Decimal
    in_stock: bool


class ProductOut(BaseModel):
    id: uuid.UUID
    omarket_url: str
    omarket_sku_id: str | None
    name: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    config: ProductConfigOut | None = None
    our_price: Decimal | None = None
    min_competitor_price: Decimal | None = None
    last_checked_at: datetime | None = None
    status: str | None = None  # winning | losing | floor | error | unknown

    model_config = {"from_attributes": True}


class ProductListOut(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int
