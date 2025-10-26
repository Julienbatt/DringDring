"""
Business metrics and performance monitoring
"""
import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from dataclasses import dataclass

logger = logging.getLogger("dringdring.metrics")

@dataclass
class BusinessMetrics:
    """Business metrics for monitoring"""
    total_deliveries: int
    total_fees: float
    total_bags: int
    total_amount: float
    cms_deliveries: int
    avg_fee_per_delivery: float
    avg_bags_per_delivery: float
    avg_amount_per_delivery: float
    cms_percentage: float
    period: str  # "today", "week", "month"
    timestamp: datetime

def calculate_business_metrics(deliveries_data: list, period: str) -> BusinessMetrics:
    """Calculate business metrics from deliveries data"""
    if not deliveries_data:
        return BusinessMetrics(
            total_deliveries=0,
            total_fees=0.0,
            total_bags=0,
            total_amount=0.0,
            cms_deliveries=0,
            avg_fee_per_delivery=0.0,
            avg_bags_per_delivery=0.0,
            avg_amount_per_delivery=0.0,
            cms_percentage=0.0,
            period=period,
            timestamp=datetime.now(timezone.utc)
        )
    
    total_deliveries = len(deliveries_data)
    total_fees = sum(float(d.get("fee", 0) or 0) for d in deliveries_data)
    total_bags = sum(int(d.get("bags", 0) or 0) for d in deliveries_data)
    total_amount = sum(float(d.get("amount", 0) or 0) for d in deliveries_data)
    cms_deliveries = sum(1 for d in deliveries_data if d.get("cms"))
    
    avg_fee_per_delivery = total_fees / total_deliveries if total_deliveries > 0 else 0.0
    avg_bags_per_delivery = total_bags / total_deliveries if total_deliveries > 0 else 0.0
    avg_amount_per_delivery = total_amount / total_deliveries if total_deliveries > 0 else 0.0
    cms_percentage = (cms_deliveries / total_deliveries * 100) if total_deliveries > 0 else 0.0
    
    return BusinessMetrics(
        total_deliveries=total_deliveries,
        total_fees=round(total_fees, 2),
        total_bags=total_bags,
        total_amount=round(total_amount, 2),
        cms_deliveries=cms_deliveries,
        avg_fee_per_delivery=round(avg_fee_per_delivery, 2),
        avg_bags_per_delivery=round(avg_bags_per_delivery, 2),
        avg_amount_per_delivery=round(avg_amount_per_delivery, 2),
        cms_percentage=round(cms_percentage, 2),
        period=period,
        timestamp=datetime.now(timezone.utc)
    )

def log_business_metrics(metrics: BusinessMetrics, shop_id: Optional[str] = None, chain_id: Optional[str] = None, region_id: Optional[str] = None):
    """Log business metrics for monitoring"""
    extra_data = {
        "metrics": {
            "total_deliveries": metrics.total_deliveries,
            "total_fees": metrics.total_fees,
            "total_bags": metrics.total_bags,
            "total_amount": metrics.total_amount,
            "cms_deliveries": metrics.cms_deliveries,
            "avg_fee_per_delivery": metrics.avg_fee_per_delivery,
            "avg_bags_per_delivery": metrics.avg_bags_per_delivery,
            "avg_amount_per_delivery": metrics.avg_amount_per_delivery,
            "cms_percentage": metrics.cms_percentage,
            "period": metrics.period
        }
    }
    
    if shop_id:
        extra_data["shop_id"] = shop_id
    if chain_id:
        extra_data["chain_id"] = chain_id
    if region_id:
        extra_data["region_id"] = region_id
    
    logger.info("business_metrics", extra=extra_data)

def log_performance_metrics(operation: str, duration_ms: float, **kwargs):
    """Log performance metrics"""
    logger.info("performance_metrics", extra={
        "operation": operation,
        "duration_ms": duration_ms,
        **kwargs
    })

def log_pricing_calculation(delivery_id: str, shop_id: str, pricing_mode: str, is_cms: bool, 
                           bags: int, amount: Optional[float], total_fee: float, 
                           shop_fee: float, authority_fee: float, chain_fee: float):
    """Log pricing calculation for monitoring"""
    logger.info("pricing_calculation", extra={
        "delivery_id": delivery_id,
        "shop_id": shop_id,
        "pricing_mode": pricing_mode,
        "is_cms": is_cms,
        "bags": bags,
        "amount": amount,
        "total_fee": total_fee,
        "shop_fee": shop_fee,
        "authority_fee": authority_fee,
        "chain_fee": chain_fee
    })

def log_export_metrics(export_type: str, record_count: int, duration_ms: float, 
                      shop_id: Optional[str] = None, chain_id: Optional[str] = None, 
                      region_id: Optional[str] = None):
    """Log export metrics"""
    extra_data = {
        "export_type": export_type,
        "record_count": record_count,
        "duration_ms": duration_ms
    }
    
    if shop_id:
        extra_data["shop_id"] = shop_id
    if chain_id:
        extra_data["chain_id"] = chain_id
    if region_id:
        extra_data["region_id"] = region_id
    
    logger.info("export_metrics", extra=extra_data)

def log_error_with_context(error: Exception, context: Dict[str, Any]):
    """Log error with business context"""
    logger.error("business_error", extra={
        "error_type": type(error).__name__,
        "error_message": str(error),
        **context
    }, exc_info=True)

