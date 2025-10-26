"""
Real-time updates service for better UX
"""
import asyncio
import logging
import json
from typing import Dict, Any, Optional, List, Set, Callable
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum
import time

logger = logging.getLogger("dringdring.realtime")

class UpdateType(Enum):
    """Types of real-time updates"""
    DELIVERY_CREATED = "delivery_created"
    DELIVERY_UPDATED = "delivery_updated"
    DELIVERY_DELETED = "delivery_deleted"
    CLIENT_CREATED = "client_created"
    CLIENT_UPDATED = "client_updated"
    CLIENT_DELETED = "client_deleted"
    SHOP_UPDATED = "shop_updated"
    DASHBOARD_UPDATED = "dashboard_updated"
    EXPORT_COMPLETED = "export_completed"
    NOTIFICATION = "notification"

@dataclass
class RealtimeUpdate:
    """Real-time update message"""
    id: str
    type: UpdateType
    data: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[str] = None
    shop_id: Optional[str] = None
    client_id: Optional[str] = None
    delivery_id: Optional[str] = None
    broadcast: bool = True  # Whether to broadcast to all users

class RealtimeManager:
    """Manages real-time updates and subscriptions"""
    
    def __init__(self):
        self._subscribers: Dict[str, Set[str]] = {}  # user_id -> set of subscription_ids
        self._subscriptions: Dict[str, Dict[str, Any]] = {}  # subscription_id -> subscription_data
        self._update_queue: List[RealtimeUpdate] = []
        self._max_queue_size = 1000
        self._update_callbacks: Dict[UpdateType, List[Callable]] = {}
    
    def subscribe(self, user_id: str, subscription_id: str, filters: Optional[Dict[str, Any]] = None) -> str:
        """Subscribe a user to real-time updates"""
        if user_id not in self._subscribers:
            self._subscribers[user_id] = set()
        
        self._subscribers[user_id].add(subscription_id)
        
        self._subscriptions[subscription_id] = {
            "user_id": user_id,
            "filters": filters or {},
            "created_at": datetime.now(timezone.utc),
            "last_activity": datetime.now(timezone.utc)
        }
        
        logger.info("realtime_subscription_created", extra={
            "user_id": user_id,
            "subscription_id": subscription_id,
            "filters": filters
        })
        
        return subscription_id
    
    def unsubscribe(self, user_id: str, subscription_id: str):
        """Unsubscribe a user from real-time updates"""
        if user_id in self._subscribers:
            self._subscribers[user_id].discard(subscription_id)
        
        if subscription_id in self._subscriptions:
            del self._subscriptions[subscription_id]
        
        logger.info("realtime_subscription_removed", extra={
            "user_id": user_id,
            "subscription_id": subscription_id
        })
    
    def register_update_callback(self, update_type: UpdateType, callback: Callable):
        """Register a callback for specific update types"""
        if update_type not in self._update_callbacks:
            self._update_callbacks[update_type] = []
        
        self._update_callbacks[update_type].append(callback)
        
        logger.info("update_callback_registered", extra={
            "update_type": update_type.value
        })
    
    def publish_update(self, update_type: UpdateType, data: Dict[str, Any], 
                      user_id: Optional[str] = None, shop_id: Optional[str] = None,
                      client_id: Optional[str] = None, delivery_id: Optional[str] = None,
                      broadcast: bool = True) -> str:
        """Publish a real-time update"""
        update_id = f"update_{int(time.time() * 1000)}"
        
        update = RealtimeUpdate(
            id=update_id,
            type=update_type,
            data=data,
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
            shop_id=shop_id,
            client_id=client_id,
            delivery_id=delivery_id,
            broadcast=broadcast
        )
        
        # Add to queue
        self._update_queue.append(update)
        
        # Trim queue if too large
        if len(self._update_queue) > self._max_queue_size:
            self._update_queue = self._update_queue[-self._max_queue_size:]
        
        # Call registered callbacks
        if update_type in self._update_callbacks:
            for callback in self._update_callbacks[update_type]:
                try:
                    callback(update)
                except Exception as e:
                    logger.error("update_callback_failed", extra={
                        "update_id": update_id,
                        "update_type": update_type.value,
                        "error": str(e)
                    }, exc_info=True)
        
        logger.info("realtime_update_published", extra={
            "update_id": update_id,
            "update_type": update_type.value,
            "user_id": user_id,
            "shop_id": shop_id,
            "broadcast": broadcast
        })
        
        return update_id
    
    def get_updates_for_user(self, user_id: str, since: Optional[datetime] = None, 
                           limit: int = 50) -> List[Dict[str, Any]]:
        """Get updates for a specific user"""
        updates = []
        
        for update in reversed(self._update_queue):
            if since and update.timestamp <= since:
                break
            
            # Check if user should receive this update
            should_receive = False
            
            if update.broadcast:
                should_receive = True
            elif update.user_id == user_id:
                should_receive = True
            elif user_id in self._subscribers:
                # Check if user has subscriptions that match
                for subscription_id in self._subscribers[user_id]:
                    if subscription_id in self._subscriptions:
                        subscription = self._subscriptions[subscription_id]
                        filters = subscription.get("filters", {})
                        
                        # Check filters
                        if self._matches_filters(update, filters):
                            should_receive = True
                            break
            
            if should_receive:
                updates.append({
                    "id": update.id,
                    "type": update.type.value,
                    "data": update.data,
                    "timestamp": update.timestamp.isoformat(),
                    "user_id": update.user_id,
                    "shop_id": update.shop_id,
                    "client_id": update.client_id,
                    "delivery_id": update.delivery_id
                })
                
                if len(updates) >= limit:
                    break
        
        return updates
    
    def _matches_filters(self, update: RealtimeUpdate, filters: Dict[str, Any]) -> bool:
        """Check if an update matches the given filters"""
        for key, value in filters.items():
            if key == "type" and update.type.value != value:
                return False
            elif key == "shop_id" and update.shop_id != value:
                return False
            elif key == "user_id" and update.user_id != value:
                return False
            elif key == "delivery_id" and update.delivery_id != value:
                return False
            elif key == "client_id" and update.client_id != value:
                return False
        
        return True
    
    def get_subscription_stats(self) -> Dict[str, Any]:
        """Get subscription statistics"""
        total_subscribers = len(self._subscribers)
        total_subscriptions = len(self._subscriptions)
        total_updates = len(self._update_queue)
        
        return {
            "total_subscribers": total_subscribers,
            "total_subscriptions": total_subscriptions,
            "total_updates": total_updates,
            "max_queue_size": self._max_queue_size
        }
    
    def cleanup_old_subscriptions(self, max_age_hours: int = 24):
        """Clean up old subscriptions"""
        cutoff_time = datetime.now(timezone.utc) - timezone.utc.localize(
            datetime(1970, 1, 1)).replace(tzinfo=timezone.utc)
        cutoff_time = datetime.fromtimestamp(cutoff_time.timestamp() - max_age_hours * 3600, tz=timezone.utc)
        
        to_remove = []
        for subscription_id, subscription in self._subscriptions.items():
            if subscription.get("last_activity", datetime.now(timezone.utc)) < cutoff_time:
                to_remove.append(subscription_id)
        
        for subscription_id in to_remove:
            subscription = self._subscriptions[subscription_id]
            user_id = subscription["user_id"]
            
            if user_id in self._subscribers:
                self._subscribers[user_id].discard(subscription_id)
            
            del self._subscriptions[subscription_id]
        
        if to_remove:
            logger.info("old_subscriptions_cleaned", extra={
                "removed_count": len(to_remove),
                "max_age_hours": max_age_hours
            })

# Global real-time manager instance
realtime_manager = RealtimeManager()

def get_realtime_manager() -> RealtimeManager:
    """Get the global real-time manager instance"""
    return realtime_manager

def subscribe_to_updates(user_id: str, subscription_id: str, 
                        filters: Optional[Dict[str, Any]] = None) -> str:
    """Subscribe to real-time updates"""
    return realtime_manager.subscribe(user_id, subscription_id, filters)

def unsubscribe_from_updates(user_id: str, subscription_id: str):
    """Unsubscribe from real-time updates"""
    realtime_manager.unsubscribe(user_id, subscription_id)

def publish_update(update_type: UpdateType, data: Dict[str, Any], 
                  user_id: Optional[str] = None, shop_id: Optional[str] = None,
                  client_id: Optional[str] = None, delivery_id: Optional[str] = None,
                  broadcast: bool = True) -> str:
    """Publish a real-time update"""
    return realtime_manager.publish_update(
        update_type, data, user_id, shop_id, client_id, delivery_id, broadcast
    )

def get_user_updates(user_id: str, since: Optional[datetime] = None, 
                    limit: int = 50) -> List[Dict[str, Any]]:
    """Get updates for a user"""
    return realtime_manager.get_updates_for_user(user_id, since, limit)

