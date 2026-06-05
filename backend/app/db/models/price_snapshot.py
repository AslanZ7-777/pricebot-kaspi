import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, Numeric, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    our_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    min_competitor_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    competitor_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_competitors: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    scan_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    product: Mapped["Product"] = relationship("Product", back_populates="snapshots")
    price_changes: Mapped[list["PriceChange"]] = relationship("PriceChange", back_populates="snapshot")
