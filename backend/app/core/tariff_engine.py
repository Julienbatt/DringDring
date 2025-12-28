from decimal import Decimal
import json

from fastapi import HTTPException


def parse_rule(value) -> dict:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    return {}


def compute_financials(
    *,
    rule_type: str,
    rule: dict,
    share: dict,
    bags: int,
    order_amount: Decimal | float | None,
    is_cms: bool,
):
    if bags < 1:
        raise HTTPException(status_code=400, detail="Bags must be >= 1")

    shares = _resolve_shares(rule, share)
    if not shares:
        raise HTTPException(status_code=400, detail="Tariff shares missing")

    pct_client = Decimal(str(shares.get("client", 0)))
    pct_shop = Decimal(str(shares.get("shop", 0)))
    pct_city = Decimal(str(shares.get("city", 0)))
    pct_admin = Decimal(str(shares.get("admin_region", shares.get("velocite", 0))))

    total_pct = pct_client + pct_shop + pct_city + pct_admin
    if abs(total_pct - Decimal("100")) > Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail="Tariff shares must sum to 100",
        )

    total_price = _compute_total_price(
        rule_type=rule_type,
        rule=rule,
        bags=bags,
        order_amount=order_amount,
        is_cms=is_cms,
    )

    s_client = round(total_price * (pct_client / 100), 2)
    s_shop = round(total_price * (pct_shop / 100), 2)
    s_city = round(total_price * (pct_city / 100), 2)
    s_admin = total_price - (s_client + s_shop + s_city)

    return total_price, s_client, s_shop, s_city, s_admin


def _compute_total_price(
    *,
    rule_type: str,
    rule: dict,
    bags: int,
    order_amount: Decimal | float | None,
    is_cms: bool,
):
    pricing = _resolve_pricing(rule)

    if rule_type == "bags":
        price_per_2_bags = Decimal(str(pricing.get("price_per_2_bags", 0)))
        cms_discount = Decimal(str(pricing.get("cms_discount", 0)))
        blocks = (bags + 1) // 2
        if is_cms:
            unit_price = max(Decimal("0.00"), price_per_2_bags - cms_discount)
        else:
            unit_price = price_per_2_bags
        return unit_price * blocks

    if rule_type == "order_amount":
        if order_amount is None:
            raise HTTPException(
                status_code=400,
                detail="order_amount required for order_amount tariff",
            )
        percent_of_order = Decimal(str(pricing.get("percent_of_order", 0)))
        minimum_fee = Decimal(str(pricing.get("minimum_fee", 0)))
        maximum_fee_raw = pricing.get("maximum_fee")
        total_price = Decimal(str(order_amount)) * (percent_of_order / 100)
        if minimum_fee:
            total_price = max(minimum_fee, total_price)
        if maximum_fee_raw is not None:
            maximum_fee = Decimal(str(maximum_fee_raw))
            total_price = min(maximum_fee, total_price)
        return total_price

    raise HTTPException(
        status_code=400,
        detail="Unsupported tariff rule type",
    )


def _resolve_pricing(rule: dict) -> dict:
    pricing = rule.get("pricing")
    if isinstance(pricing, dict):
        return pricing
    return rule


def _resolve_shares(rule: dict, share: dict) -> dict:
    shares = rule.get("shares")
    if isinstance(shares, dict) and shares:
        return shares
    if isinstance(share, dict):
        return share
    return {}
