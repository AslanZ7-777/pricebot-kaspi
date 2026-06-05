import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    omarket_url: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    omarket_sku_id: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    config: Mapped["ProductConfig"] = relationship("ProductConfig", back_populates="product", uselist=False, cascade="all, delete-orphan")
    snapshots: Mapped[list["PriceSnapshot"]] = relationship("PriceSnapshot", back_populates="product", cascade="all, delete-orphan")
    price_changes: Mapped[list["PriceChange"]] = relationship("PriceChange", back_populates="product", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="product")


class ProductConfig(Base):
    __tablename__ = "product_configs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False)
    step: Mapped[float] = mapped_column(Numeric(12, 2), default=100, nullable=False)
    floor_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    auto_reprice: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    check_interval_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    product: Mapped["Product"] = relationship("Product", back_populates="config")
