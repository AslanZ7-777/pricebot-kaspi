from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.db.session import get_db
from app.db.models.price_snapshot import PriceSnapshot
from app.db.models.price_change import PriceChange
from app.db.models.product import Product

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
async def analytics_overview(db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    seven_ago = now - timedelta(days=7)
    thirty_ago = now - timedelta(days=30)

    # Win rate last 7 days
    win_q = await db.execute(
        select(
            func.count().filter(
                PriceSnapshot.our_price.isnot(None),
                PriceSnapshot.min_competitor_price.isnot(None),
                PriceSnapshot.our_price <= PriceSnapshot.min_competitor_price,
            ).label("winning"),
            func.count().filter(
                PriceSnapshot.our_price.isnot(None),
                PriceSnapshot.min_competitor_price.isnot(None),
            ).label("total"),
        ).where(PriceSnapshot.captured_at >= seven_ago)
    )
    win_row = win_q.one()
    win_rate = round((win_row.winning / win_row.total * 100) if win_row.total > 0 else 0, 1)

    # Total price changes last 30 days
    changes_q = await db.execute(
        select(func.count()).select_from(PriceChange)
        .where(PriceChange.attempted_at >= thirty_ago, PriceChange.status == "success")
    )
    total_changes = changes_q.scalar() or 0

    # Revenue impact (sum of price differences from price changes)
    impact_q = await db.execute(
        select(func.coalesce(func.sum(PriceChange.old_price - PriceChange.new_price), 0))
        .where(PriceChange.attempted_at >= thirty_ago, PriceChange.status == "success",
               PriceChange.new_price < PriceChange.old_price)
    )
    revenue_impact = float(impact_q.scalar() or 0)

    # Unique competitors from JSONB (last 30 days)
    comp_count_q = await db.execute(text("""
        SELECT COUNT(DISTINCT comp->>'seller') as cnt
        FROM price_snapshots ps,
        LATERAL jsonb_array_elements(ps.raw_competitors) AS comp
        WHERE ps.raw_competitors IS NOT NULL
          AND jsonb_typeof(ps.raw_competitors) = 'array'
          AND ps.captured_at >= NOW() - INTERVAL '30 days'
    """))
    competitors_tracked = comp_count_q.scalar() or 0

    # Avg reprice response time (minutes)
    response_q = await db.execute(
        select(
            func.avg(
                func.extract("epoch", PriceChange.completed_at - PriceChange.attempted_at) / 60
            )
        ).where(
            PriceChange.completed_at.isnot(None),
            PriceChange.status == "success",
            PriceChange.attempted_at >= thirty_ago,
        )
    )
    avg_response = round(float(response_q.scalar() or 0), 1)

    # Products currently winning (based on last snapshot per product)
    products_winning_q = await db.execute(text("""
        WITH latest AS (
          SELECT DISTINCT ON (product_id) product_id, our_price, min_competitor_price
          FROM price_snapshots
          WHERE our_price IS NOT NULL AND min_competitor_price IS NOT NULL
          ORDER BY product_id, captured_at DESC
        )
        SELECT
          COUNT(*) FILTER (WHERE our_price <= min_competitor_price) as winning,
          COUNT(*) as total
        FROM latest
    """))
    pos_row = products_winning_q.one()
    products_winning = pos_row.winning or 0
    products_total_with_data = pos_row.total or 0

    return {
        "win_rate_pct": win_rate,
        "avg_reprice_response_min": avg_response,
        "competitors_tracked": int(competitors_tracked),
        "total_price_changes_30d": total_changes,
        "revenue_impact_tenge": revenue_impact,
        "products_winning": products_winning,
        "products_total_with_data": products_total_with_data,
    }


@router.get("/win-rate-trend")
async def win_rate_trend(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT
            DATE_TRUNC('day', captured_at AT TIME ZONE 'UTC') AS day,
            COUNT(*) FILTER (
                WHERE our_price IS NOT NULL AND min_competitor_price IS NOT NULL
                  AND our_price <= min_competitor_price
            ) AS winning,
            COUNT(*) FILTER (
                WHERE our_price IS NOT NULL AND min_competitor_price IS NOT NULL
            ) AS total
        FROM price_snapshots
        WHERE captured_at >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day ASC
    """))
    result = []
    for row in rows:
        total = row.total or 0
        winning = row.winning or 0
        win_rate = round((winning / total * 100) if total > 0 else 0, 1)
        result.append({
            "date": row.day.strftime("%Y-%m-%d"),
            "win_rate": win_rate,
            "winning": winning,
            "total": total,
        })
    return result


@router.get("/price-changes-trend")
async def price_changes_trend(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT
            DATE_TRUNC('day', attempted_at AT TIME ZONE 'UTC') AS day,
            COUNT(*) AS changes,
            COALESCE(SUM(ABS(new_price - old_price)), 0) AS price_movement
        FROM price_changes
        WHERE attempted_at >= NOW() - INTERVAL '30 days'
          AND status = 'success'
        GROUP BY day
        ORDER BY day ASC
    """))
    return [
        {
            "date": row.day.strftime("%Y-%m-%d"),
            "changes": int(row.changes),
            "price_movement": float(row.price_movement),
        }
        for row in rows
    ]


@router.get("/competitors")
async def top_competitors(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        WITH comp_data AS (
            SELECT
                comp->>'seller'           AS seller,
                (comp->>'price')::numeric AS price,
                ps.our_price,
                ps.product_id,
                ps.captured_at
            FROM price_snapshots ps,
            LATERAL jsonb_array_elements(ps.raw_competitors) AS comp
            WHERE ps.raw_competitors IS NOT NULL
              AND jsonb_typeof(ps.raw_competitors) = 'array'
              AND ps.captured_at >= NOW() - INTERVAL '30 days'
        )
        SELECT
            seller,
            COUNT(*)                                          AS appearances,
            ROUND(AVG(price))                                AS avg_price,
            COUNT(DISTINCT product_id)                       AS products_count,
            COUNT(*) FILTER (WHERE price < our_price)        AS times_undercut,
            MAX(captured_at)                                 AS last_seen
        FROM comp_data
        GROUP BY seller
        ORDER BY times_undercut DESC, appearances DESC
        LIMIT 15
    """))
    return [
        {
            "seller": row.seller,
            "appearances": int(row.appearances),
            "avg_price": float(row.avg_price or 0),
            "products_count": int(row.products_count),
            "times_undercut": int(row.times_undercut),
            "last_seen": row.last_seen.isoformat() if row.last_seen else None,
            "aggression": (
                "high" if row.times_undercut / max(row.appearances, 1) > 0.5
                else "medium" if row.times_undercut / max(row.appearances, 1) > 0.2
                else "low"
            ),
        }
        for row in rows
    ]


@router.get("/activity-feed")
async def activity_feed(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PriceChange, Product.name)
        .join(Product, PriceChange.product_id == Product.id)
        .where(PriceChange.status == "success")
        .order_by(PriceChange.attempted_at.desc())
        .limit(20)
    )
    rows = result.all()
    return [
        {
            "id": str(row.PriceChange.id),
            "product_id": str(row.PriceChange.product_id),
            "product_name": row.name or "Товар",
            "old_price": float(row.PriceChange.old_price),
            "new_price": float(row.PriceChange.new_price),
            "reason": row.PriceChange.reason,
            "attempted_at": row.PriceChange.attempted_at.isoformat(),
        }
        for row in rows
    ]
