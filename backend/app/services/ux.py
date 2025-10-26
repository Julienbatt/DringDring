"""
UX enhancement services for better user experience
"""
import time
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger("dringdring.ux")

class LoadingState(Enum):
    """Loading states for different operations"""
    IDLE = "idle"
    LOADING = "loading"
    SUCCESS = "success"
    ERROR = "error"

class NotificationType(Enum):
    """Notification types"""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"

@dataclass
class LoadingStatus:
    """Loading status for operations"""
    operation: str
    state: LoadingState
    message: str
    progress: Optional[int] = None  # 0-100
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    error_details: Optional[str] = None

@dataclass
class Notification:
    """User notification"""
    id: str
    type: NotificationType
    title: str
    message: str
    timestamp: datetime
    auto_dismiss: bool = True
    dismiss_after: int = 5000  # milliseconds
    actions: Optional[List[Dict[str, Any]]] = None

class UXManager:
    """UX management service"""
    
    def __init__(self):
        self._loading_states: Dict[str, LoadingStatus] = {}
        self._notifications: Dict[str, Notification] = {}
        self._operation_history: List[Dict[str, Any]] = []
    
    def start_loading(self, operation: str, message: str = "Loading...") -> str:
        """Start a loading operation"""
        operation_id = f"{operation}_{int(time.time() * 1000)}"
        
        self._loading_states[operation_id] = LoadingStatus(
            operation=operation,
            state=LoadingState.LOADING,
            message=message,
            start_time=datetime.now(timezone.utc)
        )
        
        logger.info("loading_started", extra={
            "operation_id": operation_id,
            "operation": operation,
            "message": message
        })
        
        return operation_id
    
    def update_loading(self, operation_id: str, message: str = None, progress: int = None):
        """Update loading status"""
        if operation_id in self._loading_states:
            if message:
                self._loading_states[operation_id].message = message
            if progress is not None:
                self._loading_states[operation_id].progress = progress
            
            logger.info("loading_updated", extra={
                "operation_id": operation_id,
                "message": message,
                "progress": progress
            })
    
    def complete_loading(self, operation_id: str, success: bool = True, message: str = None, error_details: str = None):
        """Complete a loading operation"""
        if operation_id in self._loading_states:
            self._loading_states[operation_id].state = LoadingState.SUCCESS if success else LoadingState.ERROR
            self._loading_states[operation_id].end_time = datetime.now(timezone.utc)
            
            if message:
                self._loading_states[operation_id].message = message
            if error_details:
                self._loading_states[operation_id].error_details = error_details
            
            # Calculate duration
            if self._loading_states[operation_id].start_time:
                duration = (self._loading_states[operation_id].end_time - self._loading_states[operation_id].start_time).total_seconds()
                self._operation_history.append({
                    "operation_id": operation_id,
                    "operation": self._loading_states[operation_id].operation,
                    "success": success,
                    "duration_seconds": duration,
                    "timestamp": self._loading_states[operation_id].end_time.isoformat()
                })
            
            logger.info("loading_completed", extra={
                "operation_id": operation_id,
                "success": success,
                "message": message,
                "error_details": error_details
            })
    
    def get_loading_status(self, operation_id: str) -> Optional[LoadingStatus]:
        """Get loading status for an operation"""
        return self._loading_states.get(operation_id)
    
    def create_notification(self, notification_type: NotificationType, title: str, message: str, 
                           auto_dismiss: bool = True, dismiss_after: int = 5000,
                           actions: Optional[List[Dict[str, Any]]] = None) -> str:
        """Create a new notification"""
        notification_id = f"notif_{int(time.time() * 1000)}"
        
        notification = Notification(
            id=notification_id,
            type=notification_type,
            title=title,
            message=message,
            timestamp=datetime.now(timezone.utc),
            auto_dismiss=auto_dismiss,
            dismiss_after=dismiss_after,
            actions=actions
        )
        
        self._notifications[notification_id] = notification
        
        logger.info("notification_created", extra={
            "notification_id": notification_id,
            "type": notification_type.value,
            "title": title,
            "message": message
        })
        
        return notification_id
    
    def dismiss_notification(self, notification_id: str):
        """Dismiss a notification"""
        if notification_id in self._notifications:
            del self._notifications[notification_id]
            
            logger.info("notification_dismissed", extra={
                "notification_id": notification_id
            })
    
    def get_notifications(self, limit: int = 50) -> List[Notification]:
        """Get recent notifications"""
        notifications = list(self._notifications.values())
        notifications.sort(key=lambda x: x.timestamp, reverse=True)
        return notifications[:limit]
    
    def get_operation_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get operation history"""
        return self._operation_history[-limit:]
    
    def create_success_notification(self, title: str, message: str) -> str:
        """Create a success notification"""
        return self.create_notification(
            NotificationType.SUCCESS,
            title,
            message,
            auto_dismiss=True,
            dismiss_after=3000
        )
    
    def create_error_notification(self, title: str, message: str, actions: Optional[List[Dict[str, Any]]] = None) -> str:
        """Create an error notification"""
        return self.create_notification(
            NotificationType.ERROR,
            title,
            message,
            auto_dismiss=False,
            actions=actions
        )
    
    def create_warning_notification(self, title: str, message: str) -> str:
        """Create a warning notification"""
        return self.create_notification(
            NotificationType.WARNING,
            title,
            message,
            auto_dismiss=True,
            dismiss_after=7000
        )
    
    def create_info_notification(self, title: str, message: str) -> str:
        """Create an info notification"""
        return self.create_notification(
            NotificationType.INFO,
            title,
            message,
            auto_dismiss=True,
            dismiss_after=5000
        )

# Global UX manager instance
ux_manager = UXManager()

def get_ux_manager() -> UXManager:
    """Get the global UX manager instance"""
    return ux_manager

def start_operation_loading(operation: str, message: str = "Loading...") -> str:
    """Start loading for an operation"""
    return ux_manager.start_loading(operation, message)

def complete_operation(operation_id: str, success: bool = True, message: str = None, error_details: str = None):
    """Complete an operation"""
    ux_manager.complete_loading(operation_id, success, message, error_details)

def notify_success(title: str, message: str) -> str:
    """Create a success notification"""
    return ux_manager.create_success_notification(title, message)

def notify_error(title: str, message: str, actions: Optional[List[Dict[str, Any]]] = None) -> str:
    """Create an error notification"""
    return ux_manager.create_error_notification(title, message, actions)

def notify_warning(title: str, message: str) -> str:
    """Create a warning notification"""
    return ux_manager.create_warning_notification(title, message)

def notify_info(title: str, message: str) -> str:
    """Create an info notification"""
    return ux_manager.create_info_notification(title, message)

