import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.db.models.price_snapshot import PriceSnapshot
from app.db.models.price_change import PriceChange
from app.db.models.product import Product
from app.schemas.price import PriceSnapshotOut, PriceChangeOut, PriceHistoryPoint, DashboardSummary

router = APIRouter(tags=["prices"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).where(Product.is_active == True))).scalar() or 0

    # Changes today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    changes_today = (await db.execute(
        select(func.count()).select_from(PriceChange)
        .where(PriceChange.attempted_at >= today_start, PriceChange.status == "success")
    )).scalar() or 0

    # Products with errors in last 2 hours
    two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
    error_products = (await db.execute(
        select(func.count(func.distinct(PriceSnapshot.product_id)))
        .where(PriceSnapshot.error.isnot(None), PriceSnapshot.captured_at >= two_hours_ago)
    )).scalar() or 0

    # Floor products (last change was floor_reached)
    floor_products = (await db.execute(
        select(func.count(func.distinct(PriceChange.product_id)))
        .where(PriceChange.reason == "floor_reached", PriceChange.attempted_at >= today_start)
    )).scalar() or 0

    # Paused (auto_reprice=False)
    from app.db.models.product import ProductConfig
    paused = (await db.execute(
        select(func.count()).select_from(ProductConfig).where(ProductConfig.auto_reprice == False)
    )).scalar() or 0

    winning = max(0, total - floor_products - error_products - paused)

    return DashboardSummary(
        total_products=total,
        winning_products=winning,
        changes_today=changes_today,
        floor_products=floor_products,
        error_products=error_products,
        paused_products=paused,
    )


@router.get("/products/{product_id}/snapshots", response_model=list[PriceSnapshotOut])
async def get_snapshots(
    product_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PriceSnapshot)
        .where(PriceSnapshot.product_id == product_id)
        .order_by(PriceSnapshot.captured_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    snapshots = result.scalars().all()
    out = []
    for s in snapshots:
        s_out = PriceSnapshotOut.model_validate(s)
        if s.raw_competitors:
            from app.schemas.price import CompetitorOut
            from decimal import Decimal
            s_out.raw_competitors = [
                CompetitorOut(seller=c["seller"], price=Decimal(str(c["price"])), in_stock=c["in_stock"])
                for c in s.raw_competitors
            ]
        out.append(s_out)
    return out


@router.get("/products/{product_id}/prices", response_model=list[PriceHistoryPoint])
async def get_price_history(
    product_id: uuid.UUID,
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(PriceSnapshot.captured_at, PriceSnapshot.our_price, PriceSnapshot.min_competitor_price)
        .where(PriceSnapshot.product_id == product_id, PriceSnapshot.captured_at >= since)
        .order_by(PriceSnapshot.captured_at.asc())
    )
    rows = result.fetchall()
    from decimal import Decimal
    return [
        PriceHistoryPoint(
            captured_at=row[0],
            our_price=Decimal(str(row[1])) if row[1] else None,
            min_competitor_price=Decimal(str(row[2])) if row[2] else None,
        )
        for row in rows
    ]


@router.get("/products/{product_id}/changes", response_model=list[PriceChangeOut])
async def get_price_changes(
    product_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PriceChange)
        .where(PriceChange.product_id == product_id)
        .order_by(PriceChange.attempted_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all()
