"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-05

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("omarket_url", sa.Text, unique=True, nullable=False),
        sa.Column("omarket_sku_id", sa.String(255), nullable=True),
        sa.Column("name", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "product_configs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("step", sa.Numeric(12, 2), nullable=False, server_default="100"),
        sa.Column("floor_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("auto_reprice", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("check_interval_minutes", sa.Integer, nullable=False, server_default="30"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "price_snapshots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("our_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("min_competitor_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("competitor_count", sa.Integer, nullable=True),
        sa.Column("raw_competitors", JSONB, nullable=True),
        sa.Column("scan_duration_ms", sa.Integer, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
    )
    op.create_index("ix_price_snapshots_product_time", "price_snapshots", ["product_id", sa.text("captured_at DESC")])

    op.create_table(
        "price_changes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_id", UUID(as_uuid=True), sa.ForeignKey("price_snapshots.id", ondelete="SET NULL"), nullable=True),
        sa.Column("old_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("new_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("reason", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("attempted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_price_changes_product", "price_changes", ["product_id", sa.text("attempted_at DESC")])

    op.create_table(
        "browser_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("account_login", sa.String(255), unique=True, nullable=False),
        sa.Column("cookies", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("local_storage", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("is_valid", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("payload", JSONB, nullable=True),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notifications_unread", "notifications", ["is_read", sa.text("created_at DESC")])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("browser_sessions")
    op.drop_table("price_changes")
    op.drop_table("price_snapshots")
    op.drop_table("product_configs")
    op.drop_table("products")
