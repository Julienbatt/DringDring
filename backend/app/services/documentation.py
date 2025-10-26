"""
Advanced documentation and help system
"""
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger("dringdring.documentation")

class GuideType(Enum):
    """Types of user guides"""
    QUICK_START = "quick_start"
    TUTORIAL = "tutorial"
    REFERENCE = "reference"
    TROUBLESHOOTING = "troubleshooting"
    VIDEO = "video"
    INTERACTIVE = "interactive"

class UserRole(Enum):
    """User roles for personalized guides"""
    ADMIN = "admin"
    SHOP = "shop"
    REGIONAL_ADMIN = "regionalAdmin"
    HQ_ADMIN = "hqAdmin"

@dataclass
class GuideStep:
    """Step in a user guide"""
    id: str
    title: str
    description: str
    content: str
    action_required: Optional[str] = None
    validation_criteria: Optional[Dict[str, Any]] = None
    next_steps: List[str] = None
    estimated_time: int = 0  # minutes
    difficulty: str = "beginner"  # beginner, intermediate, advanced
    prerequisites: List[str] = None

@dataclass
class UserGuide:
    """Complete user guide"""
    id: str
    title: str
    description: str
    guide_type: GuideType
    target_roles: List[UserRole]
    steps: List[GuideStep]
    estimated_total_time: int
    difficulty: str
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    version: str = "1.0.0"

@dataclass
class UserProgress:
    """User progress tracking"""
    user_id: str
    guide_id: str
    current_step: int
    completed_steps: List[str]
    started_at: datetime
    last_activity: datetime
    completed_at: Optional[datetime] = None
    score: Optional[float] = None

class DocumentationManager:
    """Advanced documentation and help system"""
    
    def __init__(self):
        self._guides: Dict[str, UserGuide] = {}
        self._user_progress: Dict[str, List[UserProgress]] = {}
        self._help_articles: Dict[str, Dict[str, Any]] = {}
        self._video_tutorials: Dict[str, Dict[str, Any]] = {}
        self._interactive_demos: Dict[str, Dict[str, Any]] = {}
    
    def create_guide(self, guide: UserGuide) -> str:
        """Create a new user guide"""
        self._guides[guide.id] = guide
        
        logger.info("guide_created", extra={
            "guide_id": guide.id,
            "title": guide.title,
            "type": guide.guide_type.value,
            "target_roles": [role.value for role in guide.target_roles]
        })
        
        return guide.id
    
    def get_guide(self, guide_id: str) -> Optional[UserGuide]:
        """Get a guide by ID"""
        return self._guides.get(guide_id)
    
    def get_guides_for_role(self, role: UserRole, guide_type: Optional[GuideType] = None) -> List[UserGuide]:
        """Get guides suitable for a user role"""
        guides = []
        for guide in self._guides.values():
            if role in guide.target_roles:
                if guide_type is None or guide.guide_type == guide_type:
                    guides.append(guide)
        
        # Sort by difficulty and estimated time
        guides.sort(key=lambda g: (g.difficulty, g.estimated_total_time))
        return guides
    
    def start_guide(self, user_id: str, guide_id: str) -> UserProgress:
        """Start a guide for a user"""
        if guide_id not in self._guides:
            raise ValueError(f"Guide {guide_id} not found")
        
        progress = UserProgress(
            user_id=user_id,
            guide_id=guide_id,
            current_step=0,
            completed_steps=[],
            started_at=datetime.now(timezone.utc),
            last_activity=datetime.now(timezone.utc)
        )
        
        if user_id not in self._user_progress:
            self._user_progress[user_id] = []
        
        self._user_progress[user_id].append(progress)
        
        logger.info("guide_started", extra={
            "user_id": user_id,
            "guide_id": guide_id
        })
        
        return progress
    
    def complete_step(self, user_id: str, guide_id: str, step_id: str) -> bool:
        """Mark a step as completed"""
        progress = self._get_user_progress(user_id, guide_id)
        if not progress:
            return False
        
        if step_id not in progress.completed_steps:
            progress.completed_steps.append(step_id)
            progress.last_activity = datetime.now(timezone.utc)
        
        # Check if guide is completed
        guide = self._guides[guide_id]
        if len(progress.completed_steps) >= len(guide.steps):
            progress.completed_at = datetime.now(timezone.utc)
            progress.score = self._calculate_score(progress, guide)
        
        logger.info("step_completed", extra={
            "user_id": user_id,
            "guide_id": guide_id,
            "step_id": step_id,
            "completed_steps": len(progress.completed_steps),
            "total_steps": len(guide.steps)
        })
        
        return True
    
    def get_user_progress(self, user_id: str, guide_id: Optional[str] = None) -> List[UserProgress]:
        """Get user progress for guides"""
        if user_id not in self._user_progress:
            return []
        
        if guide_id:
            progress = self._get_user_progress(user_id, guide_id)
            return [progress] if progress else []
        
        return self._user_progress[user_id]
    
    def _get_user_progress(self, user_id: str, guide_id: str) -> Optional[UserProgress]:
        """Get specific user progress"""
        if user_id not in self._user_progress:
            return None
        
        for progress in self._user_progress[user_id]:
            if progress.guide_id == guide_id:
                return progress
        
        return None
    
    def _calculate_score(self, progress: UserProgress, guide: UserGuide) -> float:
        """Calculate completion score"""
        if not progress.completed_at:
            return 0.0
        
        completion_rate = len(progress.completed_steps) / len(guide.steps)
        time_efficiency = 1.0  # Could be calculated based on estimated vs actual time
        
        return (completion_rate * 0.7 + time_efficiency * 0.3) * 100
    
    def create_help_article(self, article_id: str, title: str, content: str, 
                           category: str, tags: List[str], 
                           target_roles: List[UserRole]) -> str:
        """Create a help article"""
        self._help_articles[article_id] = {
            "id": article_id,
            "title": title,
            "content": content,
            "category": category,
            "tags": tags,
            "target_roles": [role.value for role in target_roles],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "views": 0,
            "helpful_votes": 0,
            "not_helpful_votes": 0
        }
        
        logger.info("help_article_created", extra={
            "article_id": article_id,
            "title": title,
            "category": category
        })
        
        return article_id
    
    def get_help_articles(self, category: Optional[str] = None, 
                         role: Optional[UserRole] = None,
                         search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get help articles with filtering"""
        articles = list(self._help_articles.values())
        
        if category:
            articles = [a for a in articles if a["category"] == category]
        
        if role:
            articles = [a for a in articles if role.value in a["target_roles"]]
        
        if search_query:
            query_lower = search_query.lower()
            articles = [a for a in articles if 
                       query_lower in a["title"].lower() or 
                       query_lower in a["content"].lower() or
                       any(query_lower in tag.lower() for tag in a["tags"])]
        
        return articles
    
    def create_video_tutorial(self, video_id: str, title: str, description: str,
                             video_url: str, duration: int, 
                             target_roles: List[UserRole],
                             transcript: Optional[str] = None) -> str:
        """Create a video tutorial"""
        self._video_tutorials[video_id] = {
            "id": video_id,
            "title": title,
            "description": description,
            "video_url": video_url,
            "duration": duration,
            "target_roles": [role.value for role in target_roles],
            "transcript": transcript,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "views": 0,
            "completion_rate": 0.0
        }
        
        logger.info("video_tutorial_created", extra={
            "video_id": video_id,
            "title": title,
            "duration": duration
        })
        
        return video_id
    
    def get_video_tutorials(self, role: Optional[UserRole] = None) -> List[Dict[str, Any]]:
        """Get video tutorials"""
        videos = list(self._video_tutorials.values())
        
        if role:
            videos = [v for v in videos if role.value in v["target_roles"]]
        
        return videos
    
    def create_interactive_demo(self, demo_id: str, title: str, description: str,
                               demo_config: Dict[str, Any],
                               target_roles: List[UserRole]) -> str:
        """Create an interactive demo"""
        self._interactive_demos[demo_id] = {
            "id": demo_id,
            "title": title,
            "description": description,
            "demo_config": demo_config,
            "target_roles": [role.value for role in target_roles],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completions": 0,
            "average_score": 0.0
        }
        
        logger.info("interactive_demo_created", extra={
            "demo_id": demo_id,
            "title": title
        })
        
        return demo_id
    
    def get_interactive_demos(self, role: Optional[UserRole] = None) -> List[Dict[str, Any]]:
        """Get interactive demos"""
        demos = list(self._interactive_demos.values())
        
        if role:
            demos = [d for d in demos if role.value in d["target_roles"]]
        
        return demos
    
    def search_documentation(self, query: str, role: Optional[UserRole] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Search across all documentation"""
        query_lower = query.lower()
        results = {
            "guides": [],
            "articles": [],
            "videos": [],
            "demos": []
        }
        
        # Search guides
        for guide in self._guides.values():
            if role and role not in guide.target_roles:
                continue
            
            if (query_lower in guide.title.lower() or 
                query_lower in guide.description.lower() or
                any(query_lower in tag.lower() for tag in guide.tags)):
                results["guides"].append({
                    "id": guide.id,
                    "title": guide.title,
                    "description": guide.description,
                    "type": guide.guide_type.value,
                    "difficulty": guide.difficulty,
                    "estimated_time": guide.estimated_total_time
                })
        
        # Search articles
        for article in self._help_articles.values():
            if role and role.value not in article["target_roles"]:
                continue
            
            if (query_lower in article["title"].lower() or 
                query_lower in article["content"].lower()):
                results["articles"].append(article)
        
        # Search videos
        for video in self._video_tutorials.values():
            if role and role.value not in video["target_roles"]:
                continue
            
            if (query_lower in video["title"].lower() or 
                query_lower in video["description"].lower()):
                results["videos"].append(video)
        
        # Search demos
        for demo in self._interactive_demos.values():
            if role and role.value not in demo["target_roles"]:
                continue
            
            if (query_lower in demo["title"].lower() or 
                query_lower in demo["description"].lower()):
                results["demos"].append(demo)
        
        return results

# Global documentation manager instance
doc_manager = DocumentationManager()

def get_documentation_manager() -> DocumentationManager:
    """Get the global documentation manager instance"""
    return doc_manager

def create_guide(guide: UserGuide) -> str:
    """Create a new user guide"""
    return doc_manager.create_guide(guide)

def get_guides_for_role(role: UserRole, guide_type: Optional[GuideType] = None) -> List[UserGuide]:
    """Get guides for a user role"""
    return doc_manager.get_guides_for_role(role, guide_type)

def start_guide(user_id: str, guide_id: str) -> UserProgress:
    """Start a guide for a user"""
    return doc_manager.start_guide(user_id, guide_id)

def complete_step(user_id: str, guide_id: str, step_id: str) -> bool:
    """Complete a guide step"""
    return doc_manager.complete_step(user_id, guide_id, step_id)

def search_documentation(query: str, role: Optional[UserRole] = None) -> Dict[str, List[Dict[str, Any]]]:
    """Search documentation"""
    return doc_manager.search_documentation(query, role)

