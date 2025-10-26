"""
UX enhancement endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from ..dependencies.auth import get_current_user, CurrentUser
from ..services.ux import get_ux_manager, start_operation_loading, complete_operation, notify_success, notify_error, notify_warning, notify_info
from ..services.undo_redo import get_undo_redo_manager, undo_last_action, redo_next_action, can_undo, can_redo, get_action_history
from ..services.realtime import get_realtime_manager, subscribe_to_updates, unsubscribe_from_updates, get_user_updates, publish_update, UpdateType

router = APIRouter(prefix="/ux", tags=["ux"])

@router.get("/loading/{operation_id}")
def get_loading_status(operation_id: str, current_user: CurrentUser = Depends(get_current_user)):
    """Get loading status for an operation"""
    ux_manager = get_ux_manager()
    status = ux_manager.get_loading_status(operation_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    return {
        "operation_id": operation_id,
        "state": status.state.value,
        "message": status.message,
        "progress": status.progress,
        "start_time": status.start_time.isoformat() if status.start_time else None,
        "end_time": status.end_time.isoformat() if status.end_time else None,
        "error_details": status.error_details
    }

@router.get("/notifications")
def get_notifications(limit: int = Query(50, ge=1, le=100), current_user: CurrentUser = Depends(get_current_user)):
    """Get user notifications"""
    ux_manager = get_ux_manager()
    notifications = ux_manager.get_notifications(limit)
    
    return {
        "notifications": [
            {
                "id": notif.id,
                "type": notif.type.value,
                "title": notif.title,
                "message": notif.message,
                "timestamp": notif.timestamp.isoformat(),
                "auto_dismiss": notif.auto_dismiss,
                "dismiss_after": notif.dismiss_after,
                "actions": notif.actions
            }
            for notif in notifications
        ]
    }

@router.delete("/notifications/{notification_id}")
def dismiss_notification(notification_id: str, current_user: CurrentUser = Depends(get_current_user)):
    """Dismiss a notification"""
    ux_manager = get_ux_manager()
    ux_manager.dismiss_notification(notification_id)
    
    return {"message": "Notification dismissed"}

@router.post("/notifications/success")
def create_success_notification(
    title: str, 
    message: str, 
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a success notification"""
    notification_id = notify_success(title, message)
    
    return {
        "notification_id": notification_id,
        "message": "Success notification created"
    }

@router.post("/notifications/error")
def create_error_notification(
    title: str, 
    message: str, 
    actions: Optional[List[Dict[str, Any]]] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create an error notification"""
    notification_id = notify_error(title, message, actions)
    
    return {
        "notification_id": notification_id,
        "message": "Error notification created"
    }

@router.post("/notifications/warning")
def create_warning_notification(
    title: str, 
    message: str, 
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a warning notification"""
    notification_id = notify_warning(title, message)
    
    return {
        "notification_id": notification_id,
        "message": "Warning notification created"
    }

@router.post("/notifications/info")
def create_info_notification(
    title: str, 
    message: str, 
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create an info notification"""
    notification_id = notify_info(title, message)
    
    return {
        "notification_id": notification_id,
        "message": "Info notification created"
    }

@router.get("/undo-redo/history")
def get_undo_redo_history(limit: int = Query(20, ge=1, le=100), current_user: CurrentUser = Depends(get_current_user)):
    """Get undo/redo history"""
    history = get_action_history(limit)
    
    return {
        "history": history,
        "can_undo": can_undo(),
        "can_redo": can_redo()
    }

@router.post("/undo")
def undo_action(current_user: CurrentUser = Depends(get_current_user)):
    """Undo the last action"""
    if not can_undo():
        raise HTTPException(status_code=400, detail="Nothing to undo")
    
    result = undo_last_action()
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to undo action")
    
    return {
        "message": "Action undone successfully",
        "action": result
    }

@router.post("/redo")
def redo_action(current_user: CurrentUser = Depends(get_current_user)):
    """Redo the next action"""
    if not can_redo():
        raise HTTPException(status_code=400, detail="Nothing to redo")
    
    result = redo_next_action()
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to redo action")
    
    return {
        "message": "Action redone successfully",
        "action": result
    }

@router.get("/realtime/subscribe")
def subscribe_to_realtime_updates(
    subscription_id: str,
    filters: Optional[Dict[str, Any]] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Subscribe to real-time updates"""
    realtime_manager = get_realtime_manager()
    subscription_id = subscribe_to_updates(current_user.user_id, subscription_id, filters)
    
    return {
        "subscription_id": subscription_id,
        "message": "Subscribed to real-time updates"
    }

@router.delete("/realtime/unsubscribe/{subscription_id}")
def unsubscribe_from_realtime_updates(
    subscription_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Unsubscribe from real-time updates"""
    unsubscribe_from_updates(current_user.user_id, subscription_id)
    
    return {
        "message": "Unsubscribed from real-time updates"
    }

@router.get("/realtime/updates")
def get_realtime_updates(
    since: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get real-time updates for user"""
    since_dt = None
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid since date format")
    
    updates = get_user_updates(current_user.user_id, since_dt, limit)
    
    return {
        "updates": updates,
        "count": len(updates)
    }

@router.post("/realtime/publish")
def publish_realtime_update(
    update_type: str,
    data: Dict[str, Any],
    shop_id: Optional[str] = None,
    client_id: Optional[str] = None,
    delivery_id: Optional[str] = None,
    broadcast: bool = True,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Publish a real-time update (admin only)"""
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin only")
    
    try:
        update_type_enum = UpdateType(update_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid update type: {update_type}")
    
    update_id = publish_update(
        update_type_enum,
        data,
        user_id=current_user.user_id,
        shop_id=shop_id,
        client_id=client_id,
        delivery_id=delivery_id,
        broadcast=broadcast
    )
    
    return {
        "update_id": update_id,
        "message": "Real-time update published"
    }

@router.get("/realtime/stats")
def get_realtime_stats(current_user: CurrentUser = Depends(get_current_user)):
    """Get real-time statistics (admin only)"""
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin only")
    
    realtime_manager = get_realtime_manager()
    stats = realtime_manager.get_subscription_stats()
    
    return {
        "stats": stats
    }

@router.get("/operation-history")
def get_operation_history(limit: int = Query(100, ge=1, le=500), current_user: CurrentUser = Depends(get_current_user)):
    """Get operation history"""
    ux_manager = get_ux_manager()
    history = ux_manager.get_operation_history(limit)
    
    return {
        "history": history,
        "count": len(history)
    }

