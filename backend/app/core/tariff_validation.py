from decimal import Decimal

from fastapi import HTTPException



def validate_tariff_rule(rule_type: str, rule: dict, share: dict | None = None) -> None:
    if not isinstance(rule, dict):
        raise HTTPException(status_code=400, detail="Invalid tariff rule format")

    if rule_type == "bags":
        _validate_bags_rule(rule, share or {})
        return
    if rule_type == "order_amount":
        _validate_order_amount_rule(rule, share or {})
        return

    raise HTTPException(
        status_code=400,
        detail=f"Unsupported tariff rule type '{rule_type}'",
    )


def _validate_bags_rule(rule: dict, share: dict) -> None:
    pricing = rule.get("pricing") if isinstance(rule.get("pricing"), dict) else rule
    required_keys = {"price_per_2_bags", "cms_discount"}
    missing = required_keys - set(pricing.keys())
    if missing:
        raise HTTPException(
            status_code=400,
            detail="Invalid tariff rule: missing pricing keys",
        )

    _validate_shares(rule, share)

    price_per_2_bags = Decimal(str(pricing["price_per_2_bags"]))
    cms_discount = Decimal(str(pricing["cms_discount"]))
    if price_per_2_bags < 0:
        raise HTTPException(status_code=400, detail="Invalid price_per_2_bags")
    if cms_discount < 0:
        raise HTTPException(status_code=400, detail="Invalid cms_discount")
    
    # [NEW] Strict validation
    if cms_discount > price_per_2_bags:
        raise HTTPException(status_code=400, detail="CMS discount cannot exceed price")


def _validate_order_amount_rule(rule: dict, share: dict) -> None:
    pricing = rule.get("pricing") if isinstance(rule.get("pricing"), dict) else rule
    if "percent_of_order" not in pricing:
        raise HTTPException(
            status_code=400,
            detail="Invalid tariff rule: missing percent_of_order",
        )

    _validate_shares(rule, share)

    percent_of_order = Decimal(str(pricing["percent_of_order"]))
    minimum_fee = Decimal(str(pricing.get("minimum_fee", 0)))
    maximum_fee_raw = pricing.get("maximum_fee")
    if percent_of_order < 0:
        raise HTTPException(status_code=400, detail="Invalid percent_of_order")
    if minimum_fee < 0:
        raise HTTPException(status_code=400, detail="Invalid minimum_fee")
    if maximum_fee_raw is not None and Decimal(str(maximum_fee_raw)) < 0:
        raise HTTPException(status_code=400, detail="Invalid maximum_fee")


def _validate_shares(rule: dict, share: dict) -> None:
    shares = rule.get("shares") if isinstance(rule.get("shares"), dict) else None
    shares = shares or share
    
    # [NEW] Strict validation: Check for unknown keys
    required_shares = {"client", "shop", "city", "admin_region"}
    unknown_keys = set(shares.keys()) - required_shares
    if unknown_keys:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tariff rule: unknown share keys {unknown_keys}",
        )

    if not required_shares.issubset(shares):
        raise HTTPException(
            status_code=400,
            detail="Invalid tariff rule: missing share keys",
        )

    total = Decimal("0")
    for key, value in shares.items():
        # [NEW] Strict validation: Check for negative shares
        d_val = Decimal(str(value))
        if d_val < 0:
             raise HTTPException(
                status_code=400,
                detail=f"Invalid tariff rule: share '{key}' cannot be negative",
            )
        total += d_val

    if abs(total - Decimal("100")) > Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail="Tariff shares must sum to 100",
        )
