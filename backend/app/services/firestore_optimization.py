"""
Firestore query optimization and performance utilities
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from google.cloud import firestore

logger = logging.getLogger("dringdring.firestore")

class FirestoreOptimizer:
    """Firestore query optimization utilities"""
    
    def __init__(self, db: firestore.Client):
        self.db = db
    
    def get_deliveries_optimized(self, shop_id: str, start_date: datetime, end_date: datetime, 
                                limit: int = 1000) -> List[Dict[str, Any]]:
        """Optimized delivery query with proper indexing"""
        try:
            # Use compound index: shopId + startWindow
            query = (
                self.db.collection("deliveries")
                .where("shopId", "==", shop_id)
                .where("startWindow", ">=", start_date.isoformat())
                .where("startWindow", "<=", end_date.isoformat())
                .order_by("startWindow", direction=firestore.Query.DESCENDING)
                .limit(limit)
            )
            
            deliveries = []
            for doc in query.stream():
                delivery_data = doc.to_dict() or {}
                delivery_data["id"] = doc.id
                deliveries.append(delivery_data)
            
            logger.info("deliveries_query_optimized", extra={
                "shop_id": shop_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "result_count": len(deliveries),
                "limit": limit
            })
            
            return deliveries
            
        except Exception as e:
            logger.error("deliveries_query_error", extra={
                "shop_id": shop_id,
                "error": str(e)
            }, exc_info=True)
            return []
    
    def get_deliveries_by_chain_region(self, chain_id: str, region_id: str, 
                                     start_date: datetime, end_date: datetime,
                                     limit: int = 2000) -> List[Dict[str, Any]]:
        """Optimized query for chain/region deliveries"""
        try:
            # First get shop IDs for the chain/region
            shops_query = (
                self.db.collection("shops")
                .where("chainId", "==", chain_id)
                .where("regionId", "==", region_id)
            )
            
            shop_ids = []
            for shop_doc in shops_query.stream():
                shop_ids.append(shop_doc.id)
            
            if not shop_ids:
                return []
            
            # Query deliveries for all shops (batch query for better performance)
            deliveries = []
            batch_size = 10  # Firestore 'in' query limit
            
            for i in range(0, len(shop_ids), batch_size):
                batch_shop_ids = shop_ids[i:i + batch_size]
                
                query = (
                    self.db.collection("deliveries")
                    .where("shopId", "in", batch_shop_ids)
                    .where("startWindow", ">=", start_date.isoformat())
                    .where("startWindow", "<=", end_date.isoformat())
                    .order_by("startWindow", direction=firestore.Query.DESCENDING)
                    .limit(limit // (len(shop_ids) // batch_size + 1))
                )
                
                for doc in query.stream():
                    delivery_data = doc.to_dict() or {}
                    delivery_data["id"] = doc.id
                    deliveries.append(delivery_data)
            
            logger.info("chain_region_deliveries_query", extra={
                "chain_id": chain_id,
                "region_id": region_id,
                "shop_count": len(shop_ids),
                "result_count": len(deliveries),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            })
            
            return deliveries
            
        except Exception as e:
            logger.error("chain_region_deliveries_query_error", extra={
                "chain_id": chain_id,
                "region_id": region_id,
                "error": str(e)
            }, exc_info=True)
            return []
    
    def get_recent_deliveries_cached(self, shop_id: str, days: int = 7, 
                                   cache_ttl: int = 300) -> List[Dict[str, Any]]:
        """Get recent deliveries with caching"""
        cache_key = f"deliveries_{shop_id}_{days}"
        
        # Simple in-memory cache (in production, use Redis)
        if not hasattr(self, '_cache'):
            self._cache = {}
        
        import time
        now = time.time()
        
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if now - timestamp < cache_ttl:
                logger.info("deliveries_cache_hit", extra={
                    "shop_id": shop_id,
                    "cache_key": cache_key
                })
                return cached_data
        
        # Cache miss or expired
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        deliveries = self.get_deliveries_optimized(shop_id, start_date, end_date)
        
        # Cache the result
        self._cache[cache_key] = (deliveries, now)
        
        logger.info("deliveries_cache_miss", extra={
            "shop_id": shop_id,
            "cache_key": cache_key,
            "result_count": len(deliveries)
        })
        
        return deliveries
    
    def batch_get_clients(self, client_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Batch get clients for better performance"""
        if not client_ids:
            return {}
        
        try:
            clients = {}
            batch_size = 10  # Firestore batch limit
            
            for i in range(0, len(client_ids), batch_size):
                batch_ids = client_ids[i:i + batch_size]
                
                # Use batch get for better performance
                docs = self.db.collection("clients").where("__name__", "in", batch_ids).stream()
                
                for doc in docs:
                    client_data = doc.to_dict() or {}
                    clients[doc.id] = client_data
            
            logger.info("batch_clients_query", extra={
                "requested_count": len(client_ids),
                "retrieved_count": len(clients)
            })
            
            return clients
            
        except Exception as e:
            logger.error("batch_clients_query_error", extra={
                "client_ids": client_ids,
                "error": str(e)
            }, exc_info=True)
            return {}
    
    def get_shop_pricing_config(self, shop_id: str) -> Optional[Dict[str, Any]]:
        """Get shop pricing configuration with caching"""
        cache_key = f"shop_pricing_{shop_id}"
        
        if not hasattr(self, '_cache'):
            self._cache = {}
        
        import time
        now = time.time()
        
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if now - timestamp < 600:  # 10 minutes cache
                return cached_data
        
        try:
            shop_doc = self.db.collection("shops").document(shop_id).get()
            if shop_doc.exists:
                shop_data = shop_doc.to_dict() or {}
                pricing_config = shop_data.get("pricing")
                
                # Cache the result
                self._cache[cache_key] = (pricing_config, now)
                
                return pricing_config
            
            return None
            
        except Exception as e:
            logger.error("shop_pricing_query_error", extra={
                "shop_id": shop_id,
                "error": str(e)
            }, exc_info=True)
            return None

def create_firestore_indexes():
    """Create recommended Firestore indexes for optimal performance"""
    indexes = [
        # Deliveries indexes
        {
            "collection": "deliveries",
            "fields": [
                {"field": "shopId", "order": "ASCENDING"},
                {"field": "startWindow", "order": "DESCENDING"}
            ]
        },
        {
            "collection": "deliveries", 
            "fields": [
                {"field": "shopId", "order": "ASCENDING"},
                {"field": "startWindow", "order": "ASCENDING"}
            ]
        },
        # Shops indexes
        {
            "collection": "shops",
            "fields": [
                {"field": "chainId", "order": "ASCENDING"},
                {"field": "regionId", "order": "ASCENDING"}
            ]
        },
        # Clients indexes
        {
            "collection": "clients",
            "fields": [
                {"field": "shopId", "order": "ASCENDING"},
                {"field": "createdAt", "order": "DESCENDING"}
            ]
        }
    ]
    
    logger.info("firestore_indexes_recommended", extra={
        "indexes": indexes
    })
    
    return indexes

