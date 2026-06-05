import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class PriceChange(Base):
    __tablename__ = "price_changes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("price_snapshots.id", ondelete="SET NULL"), nullable=True)
    old_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    new_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)  # auto_reprice | manual | floor_reached
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending | success | failed | skipped
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    product: Mapped["Product"] = relationship("Product", back_populates="price_changes")
    snapshot: Mapped["PriceSnapshot"] = relationship("PriceSnapshot", back_populates="price_changes")
