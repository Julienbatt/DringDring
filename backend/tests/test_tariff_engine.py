from decimal import Decimal
import pytest
from fastapi import HTTPException
from app.core.tariff_engine import compute_financials

def test_tariff_bags_standard():
    """Test standard bags pricing: 2 bags = 1 block"""
    rule_type = "bags"
    rule = {
        "pricing": {
            "price_per_2_bags": 15.0,
            "cms_discount": 5.0
        }
    }
    share = {
        "client": 33.33,
        "shop": 33.33, 
        "city": 33.34
    }
    
    # Case 1: 1 bag -> 1 block (15 CHF)
    total, s_client, s_shop, s_city, s_admin = compute_financials(
        rule_type=rule_type,
        rule=rule,
        share=share,
        bags=1,
        order_amount=None,
        is_cms=False
    )
    assert total == Decimal("15.00")
    assert s_client == Decimal("5.00")
    assert s_shop == Decimal("5.00")
    assert s_city == Decimal("5.00")
    assert s_admin == Decimal("0.00")

    # Case 2: 3 bags -> 2 blocks (30 CHF)
    total, _, _, _, _ = compute_financials(
        rule_type=rule_type,
        rule=rule,
        share=share,
        bags=3,
        order_amount=None,
        is_cms=False
    )
    assert total == Decimal("30.00")

def test_tariff_bags_cms():
    """Test CMS discount application"""
    rule_type = "bags"
    rule = {
        "pricing": {
            "price_per_2_bags": 15.0,
            "cms_discount": 5.0
        }
    }
    share = {
        "client": 0,    # CMS client pays 0 usually? Or reduced? Assuming share applies to reduced price
        "shop": 50,
        "city": 50
    }
    
    # 1 bag -> 15 - 5 = 10 CHF
    total, s_client, s_shop, s_city, s_admin = compute_financials(
        rule_type=rule_type,
        rule=rule,
        share=share,
        bags=1,
        order_amount=None,
        is_cms=True
    )
    assert total == Decimal("10.00")
    assert s_client == Decimal("0.00")
    assert s_shop == Decimal("5.00")
    assert s_city == Decimal("5.00")

def test_tariff_order_amount():
    """Test percentage of order amount pricing"""
    rule_type = "order_amount"
    rule = {
        "pricing": {
            "percent_of_order": 10.0,
            "minimum_fee": 15.0,
            "maximum_fee": 50.0
        }
    }
    share = {"shop": 100}

    # Case 1: Low amount -> Minimum fee
    total, _, _, _, _ = compute_financials(
        rule_type=rule_type,
        rule=rule,
        share=share,
        bags=1,
        order_amount=100.0, # 10% is 10, min is 15
        is_cms=False
    )
    assert total == Decimal("15.00")

    # Case 2: Normal amount
    total, _, _, _, _ = compute_financials(
        rule_type=rule_type,
        rule=rule,
        share=share,
        bags=1,
        order_amount=200.0, # 10% is 20
        is_cms=False
    )
    assert total == Decimal("20.00")

    # Case 3: High amount -> Max fee
    total, _, _, _, _ = compute_financials(
        rule_type=rule_type,
        rule=rule,
        share=share,
        bags=1,
        order_amount=600.0, # 10% is 60, max is 50
        is_cms=False
    )
    assert total == Decimal("50.00")

def test_tariff_validation_failures():
    """Test error cases"""
    rule_type = "bags"
    rule = {"pricing": {}}
    share = {"shop": 50} # Sum != 100

    with pytest.raises(HTTPException) as exc:
        compute_financials(
            rule_type=rule_type,
            rule=rule,
            share=share,
            bags=1,
            order_amount=None,
            is_cms=False
        )
    assert "Tariff shares must sum to 100" in str(exc.value.detail)

    with pytest.raises(HTTPException) as exc:
         compute_financials(
            rule_type=rule_type,
            rule=rule,
            share={"shop": 100},
            bags=0, # Invalid bags
            order_amount=None,
            is_cms=False
        )
    assert "Bags must be >= 1" in str(exc.value.detail)
