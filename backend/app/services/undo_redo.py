"""
Undo/Redo functionality for better UX
"""
import time
import logging
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger("dringdring.undo_redo")

class ActionType(Enum):
    """Types of actions that can be undone/redone"""
    CREATE_DELIVERY = "create_delivery"
    UPDATE_DELIVERY = "update_delivery"
    DELETE_DELIVERY = "delete_delivery"
    CREATE_CLIENT = "create_client"
    UPDATE_CLIENT = "update_client"
    DELETE_CLIENT = "delete_client"
    UPDATE_SHOP = "update_shop"
    BULK_OPERATION = "bulk_operation"

@dataclass
class Action:
    """Represents an action that can be undone/redone"""
    id: str
    type: ActionType
    description: str
    timestamp: datetime
    data: Dict[str, Any]  # Original data before action
    undo_data: Dict[str, Any]  # Data needed to undo the action
    redo_data: Dict[str, Any]  # Data needed to redo the action
    user_id: str
    shop_id: Optional[str] = None
    client_id: Optional[str] = None
    delivery_id: Optional[str] = None

class UndoRedoManager:
    """Manages undo/redo functionality"""
    
    def __init__(self, max_history: int = 50):
        self._max_history = max_history
        self._history: List[Action] = []
        self._current_index = -1
        self._undo_callbacks: Dict[ActionType, Callable] = {}
        self._redo_callbacks: Dict[ActionType, Callable] = {}
    
    def register_undo_callback(self, action_type: ActionType, callback: Callable):
        """Register a callback for undoing an action type"""
        self._undo_callbacks[action_type] = callback
        logger.info("undo_callback_registered", extra={
            "action_type": action_type.value
        })
    
    def register_redo_callback(self, action_type: ActionType, callback: Callable):
        """Register a callback for redoing an action type"""
        self._redo_callbacks[action_type] = callback
        logger.info("redo_callback_registered", extra={
            "action_type": action_type.value
        })
    
    def add_action(self, action_type: ActionType, description: str, data: Dict[str, Any], 
                   undo_data: Dict[str, Any], redo_data: Dict[str, Any], 
                   user_id: str, shop_id: Optional[str] = None, 
                   client_id: Optional[str] = None, delivery_id: Optional[str] = None) -> str:
        """Add a new action to the history"""
        action_id = f"{action_type.value}_{int(time.time() * 1000)}"
        
        action = Action(
            id=action_id,
            type=action_type,
            description=description,
            timestamp=datetime.now(timezone.utc),
            data=data,
            undo_data=undo_data,
            redo_data=redo_data,
            user_id=user_id,
            shop_id=shop_id,
            client_id=client_id,
            delivery_id=delivery_id
        )
        
        # Remove any actions after current index (when adding new action after undo)
        if self._current_index < len(self._history) - 1:
            self._history = self._history[:self._current_index + 1]
        
        # Add new action
        self._history.append(action)
        self._current_index = len(self._history) - 1
        
        # Trim history if too long
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]
            self._current_index = len(self._history) - 1
        
        logger.info("action_added", extra={
            "action_id": action_id,
            "action_type": action_type.value,
            "description": description,
            "user_id": user_id
        })
        
        return action_id
    
    def can_undo(self) -> bool:
        """Check if undo is possible"""
        return self._current_index >= 0
    
    def can_redo(self) -> bool:
        """Check if redo is possible"""
        return self._current_index < len(self._history) - 1
    
    def undo(self) -> Optional[Dict[str, Any]]:
        """Undo the last action"""
        if not self.can_undo():
            return None
        
        action = self._history[self._current_index]
        
        if action.type not in self._undo_callbacks:
            logger.warning("no_undo_callback", extra={
                "action_id": action.id,
                "action_type": action.type.value
            })
            return None
        
        try:
            result = self._undo_callbacks[action.type](action.undo_data)
            self._current_index -= 1
            
            logger.info("action_undone", extra={
                "action_id": action.id,
                "action_type": action.type.value,
                "description": action.description
            })
            
            return {
                "action_id": action.id,
                "action_type": action.type.value,
                "description": action.description,
                "result": result
            }
            
        except Exception as e:
            logger.error("undo_failed", extra={
                "action_id": action.id,
                "action_type": action.type.value,
                "error": str(e)
            }, exc_info=True)
            return None
    
    def redo(self) -> Optional[Dict[str, Any]]:
        """Redo the next action"""
        if not self.can_redo():
            return None
        
        action = self._history[self._current_index + 1]
        
        if action.type not in self._redo_callbacks:
            logger.warning("no_redo_callback", extra={
                "action_id": action.id,
                "action_type": action.type.value
            })
            return None
        
        try:
            result = self._redo_callbacks[action.type](action.redo_data)
            self._current_index += 1
            
            logger.info("action_redone", extra={
                "action_id": action.id,
                "action_type": action.type.value,
                "description": action.description
            })
            
            return {
                "action_id": action.id,
                "action_type": action.type.value,
                "description": action.description,
                "result": result
            }
            
        except Exception as e:
            logger.error("redo_failed", extra={
                "action_id": action.id,
                "action_type": action.type.value,
                "error": str(e)
            }, exc_info=True)
            return None
    
    def get_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get action history"""
        start_idx = max(0, len(self._history) - limit)
        history = self._history[start_idx:]
        
        return [
            {
                "id": action.id,
                "type": action.type.value,
                "description": action.description,
                "timestamp": action.timestamp.isoformat(),
                "user_id": action.user_id,
                "shop_id": action.shop_id,
                "client_id": action.client_id,
                "delivery_id": action.delivery_id,
                "can_undo": idx <= self._current_index,
                "can_redo": idx > self._current_index
            }
            for idx, action in enumerate(history, start_idx)
        ]
    
    def clear_history(self, user_id: Optional[str] = None):
        """Clear action history"""
        if user_id:
            self._history = [action for action in self._history if action.user_id != user_id]
            self._current_index = len(self._history) - 1
        else:
            self._history = []
            self._current_index = -1
        
        logger.info("history_cleared", extra={
            "user_id": user_id,
            "remaining_actions": len(self._history)
        })

# Global undo/redo manager instance
undo_redo_manager = UndoRedoManager()

def get_undo_redo_manager() -> UndoRedoManager:
    """Get the global undo/redo manager instance"""
    return undo_redo_manager

def add_action(action_type: ActionType, description: str, data: Dict[str, Any], 
               undo_data: Dict[str, Any], redo_data: Dict[str, Any], 
               user_id: str, shop_id: Optional[str] = None, 
               client_id: Optional[str] = None, delivery_id: Optional[str] = None) -> str:
    """Add a new action to the history"""
    return undo_redo_manager.add_action(
        action_type, description, data, undo_data, redo_data,
        user_id, shop_id, client_id, delivery_id
    )

def undo_last_action() -> Optional[Dict[str, Any]]:
    """Undo the last action"""
    return undo_redo_manager.undo()

def redo_next_action() -> Optional[Dict[str, Any]]:
    """Redo the next action"""
    return undo_redo_manager.redo()

def can_undo() -> bool:
    """Check if undo is possible"""
    return undo_redo_manager.can_undo()

def can_redo() -> bool:
    """Check if redo is possible"""
    return undo_redo_manager.can_redo()

def get_action_history(limit: int = 20) -> List[Dict[str, Any]]:
    """Get action history"""
    return undo_redo_manager.get_history(limit)

