"""
Intelligent onboarding system
"""
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger("dringdring.onboarding")

class OnboardingStep(Enum):
    """Onboarding steps"""
    WELCOME = "welcome"
    PROFILE_SETUP = "profile_setup"
    ROLE_SELECTION = "role_selection"
    SHOP_CREATION = "shop_creation"
    PRICING_SETUP = "pricing_setup"
    FIRST_DELIVERY = "first_delivery"
    SHEETS_INTEGRATION = "sheets_integration"
    TEAM_INVITATION = "team_invitation"
    COMPLETION = "completion"

class OnboardingStatus(Enum):
    """Onboarding status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"

@dataclass
class OnboardingTask:
    """Individual onboarding task"""
    id: str
    title: str
    description: str
    step: OnboardingStep
    required: bool
    estimated_time: int  # minutes
    prerequisites: List[str]
    completion_criteria: Dict[str, Any]
    help_content: Optional[str] = None
    video_url: Optional[str] = None
    interactive_demo: Optional[Dict[str, Any]] = None

@dataclass
class UserOnboarding:
    """User onboarding progress"""
    user_id: str
    status: OnboardingStatus
    current_step: OnboardingStep
    completed_tasks: List[str]
    skipped_tasks: List[str]
    started_at: datetime
    last_activity: datetime
    completed_at: Optional[datetime] = None
    personalized_path: List[OnboardingStep] = None
    progress_percentage: float = 0.0

class OnboardingManager:
    """Intelligent onboarding system"""
    
    def __init__(self):
        self._tasks: Dict[str, OnboardingTask] = {}
        self._user_onboarding: Dict[str, UserOnboarding] = {}
        self._onboarding_paths: Dict[str, List[OnboardingStep]] = {}
        self._completion_analytics: Dict[str, Any] = {}
    
    def initialize_tasks(self):
        """Initialize default onboarding tasks"""
        tasks = [
            OnboardingTask(
                id="welcome_tour",
                title="Welcome to DringDring",
                description="Take a quick tour of the platform",
                step=OnboardingStep.WELCOME,
                required=True,
                estimated_time=5,
                prerequisites=[],
                completion_criteria={"tour_completed": True},
                help_content="Welcome to DringDring! This tour will show you the main features.",
                video_url="https://example.com/welcome-tour.mp4"
            ),
            OnboardingTask(
                id="profile_setup",
                title="Complete Your Profile",
                description="Set up your user profile and preferences",
                step=OnboardingStep.PROFILE_SETUP,
                required=True,
                estimated_time=10,
                prerequisites=["welcome_tour"],
                completion_criteria={"profile_complete": True, "preferences_set": True},
                help_content="Complete your profile to personalize your experience."
            ),
            OnboardingTask(
                id="role_selection",
                title="Select Your Role",
                description="Choose your role in the system",
                step=OnboardingStep.ROLE_SELECTION,
                required=True,
                estimated_time=5,
                prerequisites=["profile_setup"],
                completion_criteria={"role_selected": True},
                help_content="Select the role that best describes your position."
            ),
            OnboardingTask(
                id="shop_creation",
                title="Create Your Shop",
                description="Set up your shop or store",
                step=OnboardingStep.SHOP_CREATION,
                required=True,
                estimated_time=15,
                prerequisites=["role_selection"],
                completion_criteria={"shop_created": True, "shop_configured": True},
                help_content="Create your shop to start managing deliveries."
            ),
            OnboardingTask(
                id="pricing_setup",
                title="Configure Pricing",
                description="Set up your pricing model",
                step=OnboardingStep.PRICING_SETUP,
                required=True,
                estimated_time=20,
                prerequisites=["shop_creation"],
                completion_criteria={"pricing_configured": True},
                help_content="Configure how you want to price your deliveries.",
                interactive_demo={"type": "pricing_calculator", "config": {}}
            ),
            OnboardingTask(
                id="first_delivery",
                title="Create Your First Delivery",
                description="Create your first delivery to test the system",
                step=OnboardingStep.FIRST_DELIVERY,
                required=True,
                estimated_time=10,
                prerequisites=["pricing_setup"],
                completion_criteria={"delivery_created": True},
                help_content="Create your first delivery to see how the system works."
            ),
            OnboardingTask(
                id="sheets_integration",
                title="Connect Google Sheets",
                description="Set up Google Sheets integration",
                step=OnboardingStep.SHEETS_INTEGRATION,
                required=False,
                estimated_time=15,
                prerequisites=["first_delivery"],
                completion_criteria={"sheets_connected": True},
                help_content="Connect Google Sheets to automatically track your deliveries."
            ),
            OnboardingTask(
                id="team_invitation",
                title="Invite Your Team",
                description="Invite team members to collaborate",
                step=OnboardingStep.TEAM_INVITATION,
                required=False,
                estimated_time=10,
                prerequisites=["sheets_integration"],
                completion_criteria={"team_members_invited": True},
                help_content="Invite your team members to start collaborating."
            ),
            OnboardingTask(
                id="completion",
                title="Onboarding Complete",
                description="You're all set to use DringDring!",
                step=OnboardingStep.COMPLETION,
                required=True,
                estimated_time=2,
                prerequisites=["first_delivery"],
                completion_criteria={"onboarding_complete": True},
                help_content="Congratulations! You've completed the onboarding process."
            )
        ]
        
        for task in tasks:
            self._tasks[task.id] = task
        
        # Define onboarding paths for different roles
        self._onboarding_paths = {
            "admin": [
                OnboardingStep.WELCOME,
                OnboardingStep.PROFILE_SETUP,
                OnboardingStep.ROLE_SELECTION,
                OnboardingStep.SHOP_CREATION,
                OnboardingStep.PRICING_SETUP,
                OnboardingStep.FIRST_DELIVERY,
                OnboardingStep.SHEETS_INTEGRATION,
                OnboardingStep.TEAM_INVITATION,
                OnboardingStep.COMPLETION
            ],
            "shop": [
                OnboardingStep.WELCOME,
                OnboardingStep.PROFILE_SETUP,
                OnboardingStep.ROLE_SELECTION,
                OnboardingStep.SHOP_CREATION,
                OnboardingStep.PRICING_SETUP,
                OnboardingStep.FIRST_DELIVERY,
                OnboardingStep.SHEETS_INTEGRATION,
                OnboardingStep.COMPLETION
            ],
            "regionalAdmin": [
                OnboardingStep.WELCOME,
                OnboardingStep.PROFILE_SETUP,
                OnboardingStep.ROLE_SELECTION,
                OnboardingStep.SHOP_CREATION,
                OnboardingStep.PRICING_SETUP,
                OnboardingStep.FIRST_DELIVERY,
                OnboardingStep.TEAM_INVITATION,
                OnboardingStep.COMPLETION
            ],
            "hqAdmin": [
                OnboardingStep.WELCOME,
                OnboardingStep.PROFILE_SETUP,
                OnboardingStep.ROLE_SELECTION,
                OnboardingStep.SHOP_CREATION,
                OnboardingStep.PRICING_SETUP,
                OnboardingStep.FIRST_DELIVERY,
                OnboardingStep.TEAM_INVITATION,
                OnboardingStep.COMPLETION
            ]
        }
    
    def start_onboarding(self, user_id: str, user_role: str) -> UserOnboarding:
        """Start onboarding for a user"""
        if user_id in self._user_onboarding:
            return self._user_onboarding[user_id]
        
        # Get personalized path based on role
        path = self._onboarding_paths.get(user_role, self._onboarding_paths["shop"])
        
        onboarding = UserOnboarding(
            user_id=user_id,
            status=OnboardingStatus.IN_PROGRESS,
            current_step=path[0] if path else OnboardingStep.WELCOME,
            completed_tasks=[],
            skipped_tasks=[],
            started_at=datetime.now(timezone.utc),
            last_activity=datetime.now(timezone.utc),
            personalized_path=path
        )
        
        self._user_onboarding[user_id] = onboarding
        
        logger.info("onboarding_started", extra={
            "user_id": user_id,
            "role": user_role,
            "path_length": len(path)
        })
        
        return onboarding
    
    def get_next_tasks(self, user_id: str, limit: int = 3) -> List[OnboardingTask]:
        """Get next tasks for a user"""
        if user_id not in self._user_onboarding:
            return []
        
        onboarding = self._user_onboarding[user_id]
        if onboarding.status != OnboardingStatus.IN_PROGRESS:
            return []
        
        # Get tasks for current step
        current_step_tasks = [
            task for task in self._tasks.values()
            if task.step == onboarding.current_step
        ]
        
        # Filter out completed and skipped tasks
        available_tasks = [
            task for task in current_step_tasks
            if (task.id not in onboarding.completed_tasks and 
                task.id not in onboarding.skipped_tasks)
        ]
        
        # Check prerequisites
        ready_tasks = []
        for task in available_tasks:
            if all(prereq in onboarding.completed_tasks for prereq in task.prerequisites):
                ready_tasks.append(task)
        
        return ready_tasks[:limit]
    
    def complete_task(self, user_id: str, task_id: str, completion_data: Dict[str, Any]) -> bool:
        """Complete an onboarding task"""
        if user_id not in self._user_onboarding:
            return False
        
        if task_id not in self._tasks:
            return False
        
        task = self._tasks[task_id]
        onboarding = self._user_onboarding[user_id]
        
        # Validate completion criteria
        if not self._validate_completion(task, completion_data):
            return False
        
        # Mark task as completed
        if task_id not in onboarding.completed_tasks:
            onboarding.completed_tasks.append(task_id)
        
        onboarding.last_activity = datetime.now(timezone.utc)
        
        # Check if current step is complete
        if self._is_step_complete(onboarding):
            self._advance_to_next_step(onboarding)
        
        # Update progress
        self._update_progress(onboarding)
        
        logger.info("task_completed", extra={
            "user_id": user_id,
            "task_id": task_id,
            "step": task.step.value,
            "progress": onboarding.progress_percentage
        })
        
        return True
    
    def skip_task(self, user_id: str, task_id: str, reason: str = "user_choice") -> bool:
        """Skip an onboarding task"""
        if user_id not in self._user_onboarding:
            return False
        
        if task_id not in self._tasks:
            return False
        
        task = self._tasks[task_id]
        onboarding = self._user_onboarding[user_id]
        
        # Can't skip required tasks
        if task.required:
            return False
        
        # Mark task as skipped
        if task_id not in onboarding.skipped_tasks:
            onboarding.skipped_tasks.append(task_id)
        
        onboarding.last_activity = datetime.now(timezone.utc)
        
        # Check if current step is complete
        if self._is_step_complete(onboarding):
            self._advance_to_next_step(onboarding)
        
        # Update progress
        self._update_progress(onboarding)
        
        logger.info("task_skipped", extra={
            "user_id": user_id,
            "task_id": task_id,
            "reason": reason
        })
        
        return True
    
    def get_onboarding_status(self, user_id: str) -> Optional[UserOnboarding]:
        """Get user onboarding status"""
        return self._user_onboarding.get(user_id)
    
    def get_onboarding_analytics(self) -> Dict[str, Any]:
        """Get onboarding analytics"""
        total_users = len(self._user_onboarding)
        completed_users = len([
            o for o in self._user_onboarding.values()
            if o.status == OnboardingStatus.COMPLETED
        ])
        
        completion_rate = (completed_users / total_users * 100) if total_users > 0 else 0
        
        # Average completion time
        completed_onboardings = [
            o for o in self._user_onboarding.values()
            if o.completed_at is not None
        ]
        
        avg_completion_time = 0
        if completed_onboardings:
            total_time = sum([
                (o.completed_at - o.started_at).total_seconds()
                for o in completed_onboardings
            ])
            avg_completion_time = total_time / len(completed_onboardings) / 3600  # hours
        
        # Most skipped tasks
        all_skipped = []
        for onboarding in self._user_onboarding.values():
            all_skipped.extend(onboarding.skipped_tasks)
        
        skipped_counts = {}
        for task_id in all_skipped:
            skipped_counts[task_id] = skipped_counts.get(task_id, 0) + 1
        
        most_skipped = sorted(skipped_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_users": total_users,
            "completed_users": completed_users,
            "completion_rate": round(completion_rate, 2),
            "average_completion_time_hours": round(avg_completion_time, 2),
            "most_skipped_tasks": most_skipped,
            "step_completion_rates": self._calculate_step_completion_rates()
        }
    
    def _validate_completion(self, task: OnboardingTask, completion_data: Dict[str, Any]) -> bool:
        """Validate task completion criteria"""
        for criterion, expected_value in task.completion_criteria.items():
            if criterion not in completion_data:
                return False
            
            actual_value = completion_data[criterion]
            if actual_value != expected_value:
                return False
        
        return True
    
    def _is_step_complete(self, onboarding: UserOnboarding) -> bool:
        """Check if current step is complete"""
        current_step_tasks = [
            task for task in self._tasks.values()
            if task.step == onboarding.current_step
        ]
        
        required_tasks = [task for task in current_step_tasks if task.required]
        
        # All required tasks must be completed
        for task in required_tasks:
            if task.id not in onboarding.completed_tasks:
                return False
        
        return True
    
    def _advance_to_next_step(self, onboarding: UserOnboarding):
        """Advance to next step in onboarding"""
        if not onboarding.personalized_path:
            return
        
        current_index = onboarding.personalized_path.index(onboarding.current_step)
        if current_index < len(onboarding.personalized_path) - 1:
            onboarding.current_step = onboarding.personalized_path[current_index + 1]
        else:
            # Onboarding complete
            onboarding.status = OnboardingStatus.COMPLETED
            onboarding.completed_at = datetime.now(timezone.utc)
    
    def _update_progress(self, onboarding: UserOnboarding):
        """Update onboarding progress percentage"""
        if not onboarding.personalized_path:
            return
        
        total_steps = len(onboarding.personalized_path)
        completed_steps = 0
        
        for step in onboarding.personalized_path:
            step_tasks = [task for task in self._tasks.values() if task.step == step]
            required_tasks = [task for task in step_tasks if task.required]
            
            if all(task.id in onboarding.completed_tasks for task in required_tasks):
                completed_steps += 1
        
        onboarding.progress_percentage = (completed_steps / total_steps) * 100
    
    def _calculate_step_completion_rates(self) -> Dict[str, float]:
        """Calculate completion rates for each step"""
        step_rates = {}
        
        for step in OnboardingStep:
            step_tasks = [task for task in self._tasks.values() if task.step == step]
            if not step_tasks:
                continue
            
            total_attempts = 0
            completions = 0
            
            for onboarding in self._user_onboarding.values():
                if step in onboarding.personalized_path:
                    total_attempts += 1
                    
                    step_tasks = [task for task in self._tasks.values() if task.step == step]
                    required_tasks = [task for task in step_tasks if task.required]
                    
                    if all(task.id in onboarding.completed_tasks for task in required_tasks):
                        completions += 1
            
            if total_attempts > 0:
                step_rates[step.value] = round((completions / total_attempts) * 100, 2)
        
        return step_rates

# Global onboarding manager instance
onboarding_manager = OnboardingManager()

def get_onboarding_manager() -> OnboardingManager:
    """Get the global onboarding manager instance"""
    return onboarding_manager

def start_user_onboarding(user_id: str, user_role: str) -> UserOnboarding:
    """Start onboarding for a user"""
    return onboarding_manager.start_onboarding(user_id, user_role)

def get_next_onboarding_tasks(user_id: str, limit: int = 3) -> List[OnboardingTask]:
    """Get next onboarding tasks for a user"""
    return onboarding_manager.get_next_tasks(user_id, limit)

def complete_onboarding_task(user_id: str, task_id: str, completion_data: Dict[str, Any]) -> bool:
    """Complete an onboarding task"""
    return onboarding_manager.complete_task(user_id, task_id, completion_data)

def get_onboarding_analytics() -> Dict[str, Any]:
    """Get onboarding analytics"""
    return onboarding_manager.get_onboarding_analytics()

