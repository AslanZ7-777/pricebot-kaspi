import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.db.models.product import Product, ProductConfig
from app.db.models.price_snapshot import PriceSnapshot
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductOut, ProductListOut,
    ProductConfigUpdate, ProductConfigOut,
)

router = APIRouter(prefix="/products", tags=["products"])


def _compute_status(our_price, min_comp, floor_price, has_error) -> str:
    if has_error:
        return "error"
    if our_price is None:
        return "unknown"
    if min_comp is None:
        return "winning"
    if our_price <= min_comp:
        return "winning"
    if floor_price and (min_comp - Decimal("100")) < Decimal(str(floor_price)):
        return "floor"
    return "losing"


async def _enrich_product(product: Product, db: AsyncSession) -> ProductOut:
    # Get latest snapshot
    result = await db.execute(
        select(PriceSnapshot)
        .where(PriceSnapshot.product_id == product.id)
        .order_by(PriceSnapshot.captured_at.desc())
        .limit(1)
    )
    snapshot = result.scalar_one_or_none()

    our_price = Decimal(str(snapshot.our_price)) if snapshot and snapshot.our_price else None
    min_comp = Decimal(str(snapshot.min_competitor_price)) if snapshot and snapshot.min_competitor_price else None
    floor = product.config.floor_price if product.config else None
    has_error = bool(snapshot and snapshot.error) if snapshot else False

    out = ProductOut.model_validate(product)
    out.our_price = our_price
    out.min_competitor_price = min_comp
    out.last_checked_at = snapshot.captured_at if snapshot else None
    out.status = _compute_status(our_price, min_comp, floor, has_error)
    return out


@router.get("", response_model=ProductListOut)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product)
    if search:
        query = query.where(
            Product.name.ilike(f"%{search}%") | Product.omarket_url.ilike(f"%{search}%")
        )
    if is_active is not None:
        query = query.where(Product.is_active == is_active)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    result = await db.execute(
        query.offset((page - 1) * page_size).limit(page_size).order_by(Product.created_at.desc())
    )
    products = result.scalars().all()

    items = [await _enrich_product(p, db) for p in products]
    return ProductListOut(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(body: ProductCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Product).where(Product.omarket_url == body.omarket_url))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Товар с таким URL уже существует")

    product = Product(omarket_url=body.omarket_url)
    config = ProductConfig(
        product=product,
        step=body.step,
        floor_price=body.floor_price,
        check_interval_minutes=body.check_interval_minutes,
    )
    db.add(product)
    db.add(config)
    await db.flush()
    await db.refresh(product)
    return await _enrich_product(product, db)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return await _enrich_product(product, db)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(product_id: uuid.UUID, body: ProductUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    if body.name is not None:
        product.name = body.name
    if body.is_active is not None:
        product.is_active = body.is_active
    await db.flush()
    return await _enrich_product(product, db)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    await db.delete(product)


@router.get("/{product_id}/config", response_model=ProductConfigOut)
async def get_config(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductConfig).where(ProductConfig.product_id == product_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Настройки не найдены")
    return config


@router.put("/{product_id}/config", response_model=ProductConfigOut)
async def update_config(product_id: uuid.UUID, body: ProductConfigUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductConfig).where(ProductConfig.product_id == product_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Настройки не найдены")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(config, field, value)
    await db.flush()
    return config


@router.post("/{product_id}/scan", status_code=status.HTTP_202_ACCEPTED)
async def trigger_scan(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")

    from worker.tasks.scan_product import scan_product
    scan_product.apply_async(args=[str(product_id)], queue="monitoring")
    return {"queued": True, "product_id": str(product_id)}


@router.post("/{product_id}/pause")
async def pause_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductConfig).where(ProductConfig.product_id == product_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Настройки не найдены")
    config.auto_reprice = False
    await db.flush()
    return {"auto_reprice": False}


@router.post("/{product_id}/resume")
async def resume_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductConfig).where(ProductConfig.product_id == product_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Настройки не найдены")
    config.auto_reprice = True
    await db.flush()
    return {"auto_reprice": True}


@router.post("/scan-all", status_code=status.HTTP_202_ACCEPTED)
async def scan_all_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.is_active == True))
    products = result.scalars().all()
    queued = 0
    try:
        from worker.tasks.scan_product import scan_product
        for p in products:
            scan_product.apply_async(args=[str(p.id)], queue="monitoring")
            queued += 1
    except Exception:
        pass
    return {"queued": True, "count": queued}
