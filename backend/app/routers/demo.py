"""
Demo data seeder for Kaspi.kz price monitor demonstration.
POST /demo/seed  — creates 10 demo products with 30 days of realistic price history.
POST /demo/clear — removes all demo data.
"""
import uuid
import math
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.session import get_db
from app.db.models.product import Product, ProductConfig
from app.db.models.price_snapshot import PriceSnapshot
from app.db.models.price_change import PriceChange
from app.db.models.notification import Notification

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_TAG = "[DEMO]"

DEMO_PRODUCTS = [
    {
        "name": "Apple iPhone 16 Pro 256GB Чёрный Титан",
        "url": "https://kaspi.kz/shop/p/apple-iphone-16-pro-256gb-chernyj-titan-123101/",
        "our_base": 489900, "floor": 429000, "step": 1000,
        "competitors": [
            ("iStore KZ",     509900),
            ("TechCity Almaty", 479900),
            ("Mechta.kz",    484900),
            ("Sulpak",        494900),
        ],
    },
    {
        "name": "Samsung Galaxy S25 Ultra 512GB Серый",
        "url": "https://kaspi.kz/shop/p/samsung-galaxy-s25-ultra-512gb-seryj-123102/",
        "our_base": 469900, "floor": 399000, "step": 1000,
        "competitors": [
            ("Samsung Official KZ", 459900),
            ("SmartCity",           449900),
            ("MegaCom",             454900),
        ],
    },
    {
        "name": "MacBook Air M3 13\" 256GB Серый космос",
        "url": "https://kaspi.kz/shop/p/apple-macbook-air-m3-13-256gb-seryj-kosmos-123103/",
        "our_base": 699900, "floor": 629000, "step": 1000,
        "competitors": [
            ("Apple Store KZ",   749900),
            ("iGadget.kz",       729900),
            ("TechZone Almaty",  719900),
        ],
    },
    {
        "name": "AirPods Pro 2 (USB-C) MagSafe",
        "url": "https://kaspi.kz/shop/p/apple-airpods-pro-2-usb-c-magsafe-123104/",
        "our_base": 144900, "floor": 124000, "step": 500,
        "competitors": [
            ("iStore KZ",    159900),
            ("TechZone",     149900),
            ("Mechta.kz",    139900),
        ],
    },
    {
        "name": "Sony WH-1000XM5 Чёрный",
        "url": "https://kaspi.kz/shop/p/sony-wh-1000xm5-chernyj-123105/",
        "our_base": 179900, "floor": 149000, "step": 1000,
        "competitors": [
            ("AudioCity KZ",    189900),
            ("Sony Official",   199900),
            ("ElectroMart",     184900),
        ],
    },
    {
        "name": "Samsung QLED 4K 65\" QE65Q70C",
        "url": "https://kaspi.kz/shop/p/samsung-qled-4k-65-qe65q70c-123106/",
        "our_base": 449900, "floor": 379000, "step": 2000,
        "competitors": [
            ("TV Shop KZ",          479900),
            ("Samsung Official KZ", 469900),
            ("HomeAppliance",       459900),
        ],
    },
    {
        "name": "PlayStation 5 Slim Disc Edition",
        "url": "https://kaspi.kz/shop/p/sony-playstation-5-slim-disc-edition-123107/",
        "our_base": 249900, "floor": 219000, "step": 1000,
        "competitors": [
            ("GameZone.kz",  259900),
            ("PlayWorld",    269900),
            ("Sulpak",       254900),
        ],
    },
    {
        "name": "Dyson V15 Detect Absolute",
        "url": "https://kaspi.kz/shop/p/dyson-v15-detect-absolute-123108/",
        "our_base": 319900, "floor": 279000, "step": 1000,
        "competitors": [
            ("Dyson Official",    349900),
            ("HomeAppliance",    329900),
            ("TechCity Almaty",  334900),
        ],
    },
    {
        "name": "Apple Watch Series 10 44mm Чёрный",
        "url": "https://kaspi.kz/shop/p/apple-watch-series-10-44mm-chernyj-123109/",
        "our_base": 289900, "floor": 249000, "step": 1000,
        "competitors": [
            ("iStore KZ",    309900),
            ("WatchShop.kz", 279900),
            ("TechZone",     274900),
        ],
    },
    {
        "name": "Xiaomi 14T Pro 256GB Серый Титан",
        "url": "https://kaspi.kz/shop/p/xiaomi-14t-pro-256gb-seryj-titan-123110/",
        "our_base": 299900, "floor": 259000, "step": 1000,
        "competitors": [
            ("MiStore KZ",  309900),
            ("TechKZ",      304900),
            ("Sulpak",      299900),
        ],
    },
]


def _jitter(seed: int, amplitude: float = 0.015) -> float:
    """Deterministic jitter using sin — no randomness module needed."""
    return math.sin(seed * 2.399) * amplitude


def _make_snapshot(
    product_id: uuid.UUID,
    day_offset: int,
    product: dict,
    now: datetime,
) -> tuple[PriceSnapshot, float]:
    """Returns (snapshot, our_price_used) for a given day."""
    base = float(product["our_base"])
    floor = float(product["floor"])
    step = float(product["step"])

    # Our price drifts slightly over time
    our_price = round(base * (1 + _jitter(day_offset * 7 + product["our_base"])), -2)
    our_price = max(our_price, floor)

    captured_at = now - timedelta(days=30 - day_offset) + timedelta(hours=9, minutes=(day_offset % 7) * 7)

    competitors = []
    min_comp = None
    for idx, (seller, base_comp_price) in enumerate(product["competitors"]):
        comp_price = round(base_comp_price * (1 + _jitter(day_offset * 13 + idx * 3)), -2)
        comp_price = max(comp_price, floor + step)
        in_stock = _jitter(day_offset * 5 + idx) > -0.01  # ~50% chance out of stock rare
        competitors.append({"seller": seller, "price": comp_price, "in_stock": True})
        if min_comp is None or comp_price < min_comp:
            min_comp = comp_price

    snap = PriceSnapshot(
        product_id=product_id,
        captured_at=captured_at,
        our_price=Decimal(str(our_price)),
        min_competitor_price=Decimal(str(min_comp)) if min_comp else None,
        competitor_count=len(competitors),
        raw_competitors=competitors,
        scan_duration_ms=int(1200 + abs(_jitter(day_offset) * 1800)),
    )
    return snap, our_price, min_comp


@router.post("/seed")
async def seed_demo(db: AsyncSession = Depends(get_db)):
    # Skip if already seeded
    existing = await db.execute(
        select(Product).where(Product.name.like(f"%{DEMO_TAG}%")).limit(1)
    )
    if existing.scalar_one_or_none():
        return {"status": "already_seeded", "message": "Демо данные уже загружены"}

    now = datetime.now(timezone.utc)
    seeded_products = []

    for pdata in DEMO_PRODUCTS:
        product = Product(
            omarket_url=pdata["url"],
            name=f"{pdata['name']} {DEMO_TAG}",
            is_active=True,
        )
        config = ProductConfig(
            product=product,
            step=Decimal(str(pdata["step"])),
            floor_price=Decimal(str(pdata["floor"])),
            auto_reprice=True,
            check_interval_minutes=30,
        )
        db.add(product)
        db.add(config)
        await db.flush()

        prev_price = float(pdata["our_base"])
        changes_made = []

        for day in range(30):
            snap, our_price, min_comp = _make_snapshot(product.id, day, pdata, now)
            db.add(snap)
            await db.flush()

            # If competitor is cheaper and we haven't hit floor, create a price change
            if min_comp and our_price > min_comp and day % 3 == 1:
                new_price = max(min_comp - pdata["step"], pdata["floor"])
                if new_price < prev_price:
                    change_time = snap.captured_at + timedelta(minutes=12)
                    pc = PriceChange(
                        product_id=product.id,
                        snapshot_id=snap.id,
                        old_price=Decimal(str(prev_price)),
                        new_price=Decimal(str(new_price)),
                        reason="auto_reprice",
                        status="success",
                        attempted_at=change_time,
                        completed_at=change_time + timedelta(seconds=8),
                    )
                    db.add(pc)
                    prev_price = new_price
                    changes_made.append(new_price)

        seeded_products.append({"name": pdata["name"], "changes": len(changes_made)})

    # Create some recent notifications
    recent_products_q = await db.execute(select(Product).where(Product.name.like(f"%{DEMO_TAG}%")).limit(4))
    recent_products = recent_products_q.scalars().all()

    notif_templates = [
        ("price_updated", "Цена снижена до ₸{} — обошли конкурента", 0),
        ("price_updated", "Автоматически снижена цена на «{}»", 1),
        ("floor_reached", "Товар «{}» достиг минимальной цены", 2),
        ("scan_error", "Ошибка сканирования страницы «{}»", 3),
    ]
    for i, (ntype, msg_tpl, pidx) in enumerate(notif_templates):
        if pidx < len(recent_products):
            prod = recent_products[pidx]
            short_name = (prod.name or "").replace(f" {DEMO_TAG}", "").split(" ")[:4]
            short_name = " ".join(short_name)
            notif = Notification(
                product_id=prod.id,
                type=ntype,
                message=msg_tpl.format(short_name),
                is_read=i > 1,
                created_at=now - timedelta(minutes=10 * (i + 1)),
            )
            db.add(notif)

    return {
        "status": "ok",
        "seeded_products": len(DEMO_PRODUCTS),
        "details": seeded_products,
    }


@router.post("/clear")
async def clear_demo(db: AsyncSession = Depends(get_db)):
    products_q = await db.execute(
        select(Product).where(Product.name.like(f"%{DEMO_TAG}%"))
    )
    demo_products = products_q.scalars().all()
    count = len(demo_products)
    for p in demo_products:
        await db.delete(p)
    return {"status": "ok", "deleted_products": count}
