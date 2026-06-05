from decimal import Decimal
from dataclasses import dataclass
from enum import Enum


class RepriceDecision(str, Enum):
    UPDATE = "update"
    FLOOR_REACHED = "floor_reached"
    ALREADY_WINNING = "already_winning"
    NO_COMPETITORS = "no_competitors"


@dataclass
class RepriceResult:
    decision: RepriceDecision
    new_price: Decimal | None = None
    reason: str = ""


def calculate_reprice(
    our_price: Decimal,
    min_competitor_price: Decimal | None,
    step: Decimal,
    floor_price: Decimal,
) -> RepriceResult:
    if min_competitor_price is None:
        return RepriceResult(decision=RepriceDecision.NO_COMPETITORS, reason="Нет конкурентов")

    if our_price <= min_competitor_price:
        return RepriceResult(
            decision=RepriceDecision.ALREADY_WINNING,
            reason=f"Наша цена {our_price} уже не выше минимума {min_competitor_price}",
        )

    new_price = min_competitor_price - step

    if new_price < floor_price:
        return RepriceResult(
            decision=RepriceDecision.FLOOR_REACHED,
            reason=f"Расчётная цена {new_price} ниже минимально допустимой {floor_price}",
        )

    return RepriceResult(
        decision=RepriceDecision.UPDATE,
        new_price=new_price,
        reason=f"Конкурент: {min_competitor_price}, шаг: {step}, новая цена: {new_price}",
    )
