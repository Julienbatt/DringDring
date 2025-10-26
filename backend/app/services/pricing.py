from __future__ import annotations

from dataclasses import dataclass
from math import ceil
from typing import Any, Dict, Optional, Tuple


def _safe_float(value: Any, default: float = 0.0) -> float:
	try:
		if value is None:
			return default
		return float(value)
	except Exception:
		return default


@dataclass
class PricingResult:
	total_fee: float
	is_cms: bool
	mode: str
	# split amounts
	shop_fee: float
	authority_fee: float
	chain_fee: float
	# debug/meta for observability
	calc_details: Dict[str, Any]


def _normalize_split(shop_percent: float, authority_percent: float, chain_percent: float) -> Tuple[float, float, float]:
	total = shop_percent + authority_percent + chain_percent
	if total <= 0:
		return 33.34, 33.33, 33.33
	return (shop_percent * 100.0 / total, authority_percent * 100.0 / total, chain_percent * 100.0 / total)


def compute_fee_for_delivery(delivery: Dict[str, Any], shop: Dict[str, Any], client: Optional[Dict[str, Any]] = None) -> PricingResult:
	"""Compute delivery fee and split based on shop.pricing.
	Fallbacks:
	- mode 'bags' if unspecified
	- CMS pricing when client['cms'] truthy
	- amount-based pricing requires `delivery['amount']`
	"""
	pricing = (shop or {}).get("pricing") or {}
	mode = (pricing.get("mode") or "bags").lower()
	is_cms = bool((client or {}).get("cms"))

	total_fee: float = 0.0
	calc_details: Dict[str, Any] = {"mode": mode, "isCMS": is_cms}

	if mode == "amount":
		amount_cfg = pricing.get("amount") or {}
		threshold = _safe_float(amount_cfg.get("threshold"))
		price_le = _safe_float(amount_cfg.get("cmsPriceBelowOrEqual" if is_cms else "priceBelowOrEqual"),
							   _safe_float(amount_cfg.get("priceBelowOrEqual")))
		price_gt = _safe_float(amount_cfg.get("cmsPriceAbove" if is_cms else "priceAbove"),
							   _safe_float(amount_cfg.get("priceAbove")))
		cart_amount = _safe_float(delivery.get("amount"))
		calc_details.update({"threshold": threshold, "cartAmount": cart_amount, "priceLE": price_le, "priceGT": price_gt})
		if cart_amount <= 0 and threshold > 0:
			# If no amount provided, default to below price
			total_fee = price_le
		else:
			total_fee = price_le if cart_amount <= threshold else price_gt
	else:
		# bags mode
		bags_cfg = pricing.get("bags") or {}
		bags_per_step = int(bags_cfg.get("bagsPerStep") or 2)
		price_per_step = _safe_float(bags_cfg.get("cmsPricePerStep" if is_cms else "pricePerStep"),
									 _safe_float(bags_cfg.get("pricePerStep") or 0.0))
		bags = int(delivery.get("bags") or 0)
		steps = ceil(bags / max(1, bags_per_step)) if bags > 0 else 0
		total_fee = steps * price_per_step
		calc_details.update({"bags": bags, "bagsPerStep": bags_per_step, "steps": steps, "unitPrice": price_per_step})

	split = pricing.get("split") or {}
	shop_p = _safe_float(split.get("shopPercent"), 33.34)
	auth_p = _safe_float(split.get("authorityPercent"), 33.33)
	chain_p = _safe_float(split.get("chainPercent"), 33.33)
	shop_p, auth_p, chain_p = _normalize_split(shop_p, auth_p, chain_p)

	shop_fee = round(total_fee * shop_p / 100.0, 2)
	authority_fee = round(total_fee * auth_p / 100.0, 2)
	chain_fee = round(total_fee * chain_p / 100.0, 2)

	# Adjust rounding residue onto shop_fee to ensure sum equals total_fee to 2 decimals
	residue = round(total_fee - (shop_fee + authority_fee + chain_fee), 2)
	if residue != 0:
		shop_fee = round(shop_fee + residue, 2)

	return PricingResult(
		total_fee=round(total_fee, 2),
		is_cms=is_cms,
		mode=mode,
		shop_fee=shop_fee,
		authority_fee=authority_fee,
		chain_fee=chain_fee,
		calc_details=calc_details,
	)

