"""
Documentation and help system endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from ..dependencies.auth import get_current_user, CurrentUser
from ..services.documentation import (
    get_documentation_manager, create_guide, get_guides_for_role, 
    start_guide, complete_step, search_documentation,
    UserGuide, GuideStep, GuideType, UserRole, UserProgress
)
from ..services.onboarding import (
    get_onboarding_manager, start_user_onboarding, get_next_onboarding_tasks,
    complete_onboarding_task, get_onboarding_analytics,
    OnboardingTask, OnboardingStep, OnboardingStatus
)
from ..services.guide_templates import initialize_guide_templates

router = APIRouter(prefix="/docs", tags=["documentation"])

@router.get("/guides")
def get_user_guides(
    guide_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get guides available for the user's role"""
    doc_manager = get_documentation_manager()
    
    # Map user roles to guide roles
    role_mapping = {
        "admin": UserRole.ADMIN,
        "shop": UserRole.SHOP,
        "regionalAdmin": UserRole.REGIONAL_ADMIN,
        "hqAdmin": UserRole.HQ_ADMIN
    }
    
    user_role = role_mapping.get(current_user.roles[0] if current_user.roles else "shop", UserRole.SHOP)
    guide_type_enum = GuideType(guide_type) if guide_type else None
    
    guides = doc_manager.get_guides_for_role(user_role, guide_type_enum)
    
    # Filter by difficulty if specified
    if difficulty:
        guides = [g for g in guides if g.difficulty == difficulty]
    
    return {
        "guides": [
            {
                "id": guide.id,
                "title": guide.title,
                "description": guide.description,
                "type": guide.guide_type.value,
                "difficulty": guide.difficulty,
                "estimated_time": guide.estimated_total_time,
                "steps_count": len(guide.steps),
                "tags": guide.tags
            }
            for guide in guides
        ]
    }

@router.get("/guides/{guide_id}")
def get_guide_details(guide_id: str, current_user: CurrentUser = Depends(get_current_user)):
    """Get detailed information about a specific guide"""
    doc_manager = get_documentation_manager()
    guide = doc_manager.get_guide(guide_id)
    
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    
    return {
        "id": guide.id,
        "title": guide.title,
        "description": guide.description,
        "type": guide.guide_type.value,
        "difficulty": guide.difficulty,
        "estimated_time": guide.estimated_total_time,
        "steps": [
            {
                "id": step.id,
                "title": step.title,
                "description": step.description,
                "content": step.content,
                "action_required": step.action_required,
                "estimated_time": step.estimated_time,
                "difficulty": step.difficulty,
                "prerequisites": step.prerequisites or []
            }
            for step in guide.steps
        ],
        "tags": guide.tags,
        "version": guide.version
    }

@router.post("/guides/{guide_id}/start")
def start_guide_for_user(guide_id: str, current_user: CurrentUser = Depends(get_current_user)):
    """Start a guide for the current user"""
    doc_manager = get_documentation_manager()
    
    try:
        progress = start_guide(current_user.user_id, guide_id)
        
        return {
            "progress_id": f"{current_user.user_id}_{guide_id}",
            "guide_id": guide_id,
            "current_step": 0,
            "started_at": progress.started_at.isoformat(),
            "message": "Guide started successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/guides/{guide_id}/steps/{step_id}/complete")
def complete_guide_step(
    guide_id: str, 
    step_id: str, 
    completion_data: Dict[str, Any],
    current_user: CurrentUser = Depends(get_current_user)
):
    """Complete a step in a guide"""
    doc_manager = get_documentation_manager()
    
    success = complete_step(current_user.user_id, guide_id, step_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to complete step")
    
    return {
        "message": "Step completed successfully",
        "step_id": step_id,
        "guide_id": guide_id
    }

@router.get("/progress")
def get_user_progress(
    guide_id: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get user's progress in guides"""
    doc_manager = get_documentation_manager()
    
    progress_list = doc_manager.get_user_progress(current_user.user_id, guide_id)
    
    return {
        "progress": [
            {
                "user_id": progress.user_id,
                "guide_id": progress.guide_id,
                "current_step": progress.current_step,
                "completed_steps": progress.completed_steps,
                "started_at": progress.started_at.isoformat(),
                "last_activity": progress.last_activity.isoformat(),
                "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
                "score": progress.score
            }
            for progress in progress_list
        ]
    }

@router.get("/help/articles")
def get_help_articles(
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get help articles"""
    doc_manager = get_documentation_manager()
    
    # Map user roles to guide roles
    role_mapping = {
        "admin": UserRole.ADMIN,
        "shop": UserRole.SHOP,
        "regionalAdmin": UserRole.REGIONAL_ADMIN,
        "hqAdmin": UserRole.HQ_ADMIN
    }
    
    user_role = role_mapping.get(current_user.roles[0] if current_user.roles else "shop", UserRole.SHOP)
    
    articles = doc_manager.get_help_articles(category, user_role, search)
    
    return {
        "articles": articles,
        "count": len(articles)
    }

@router.get("/help/articles/{article_id}")
def get_help_article(article_id: str, current_user: CurrentUser = Depends(get_current_user)):
    """Get a specific help article"""
    doc_manager = get_documentation_manager()
    
    articles = doc_manager.get_help_articles()
    article = next((a for a in articles if a["id"] == article_id), None)
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Increment view count
    article["views"] += 1
    
    return article

@router.get("/videos")
def get_video_tutorials(current_user: CurrentUser = Depends(get_current_user)):
    """Get video tutorials"""
    doc_manager = get_documentation_manager()
    
    # Map user roles to guide roles
    role_mapping = {
        "admin": UserRole.ADMIN,
        "shop": UserRole.SHOP,
        "regionalAdmin": UserRole.REGIONAL_ADMIN,
        "hqAdmin": UserRole.HQ_ADMIN
    }
    
    user_role = role_mapping.get(current_user.roles[0] if current_user.roles else "shop", UserRole.SHOP)
    
    videos = doc_manager.get_video_tutorials(user_role)
    
    return {
        "videos": videos,
        "count": len(videos)
    }

@router.get("/demos")
def get_interactive_demos(current_user: CurrentUser = Depends(get_current_user)):
    """Get interactive demos"""
    doc_manager = get_documentation_manager()
    
    # Map user roles to guide roles
    role_mapping = {
        "admin": UserRole.ADMIN,
        "shop": UserRole.SHOP,
        "regionalAdmin": UserRole.REGIONAL_ADMIN,
        "hqAdmin": UserRole.HQ_ADMIN
    }
    
    user_role = role_mapping.get(current_user.roles[0] if current_user.roles else "shop", UserRole.SHOP)
    
    demos = doc_manager.get_interactive_demos(user_role)
    
    return {
        "demos": demos,
        "count": len(demos)
    }

@router.get("/search")
def search_documentation_endpoint(
    q: str = Query(..., description="Search query"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Search across all documentation"""
    doc_manager = get_documentation_manager()
    
    # Map user roles to guide roles
    role_mapping = {
        "admin": UserRole.ADMIN,
        "shop": UserRole.SHOP,
        "regionalAdmin": UserRole.REGIONAL_ADMIN,
        "hqAdmin": UserRole.HQ_ADMIN
    }
    
    user_role = role_mapping.get(current_user.roles[0] if current_user.roles else "shop", UserRole.SHOP)
    
    results = search_documentation(q, user_role)
    
    return {
        "query": q,
        "results": results,
        "total_results": sum(len(category_results) for category_results in results.values())
    }

# Onboarding endpoints
@router.get("/onboarding/start")
def start_onboarding(current_user: CurrentUser = Depends(get_current_user)):
    """Start onboarding for the current user"""
    onboarding_manager = get_onboarding_manager()
    
    # Get user's primary role
    user_role = current_user.roles[0] if current_user.roles else "shop"
    
    onboarding = start_user_onboarding(current_user.user_id, user_role)
    
    return {
        "onboarding_id": f"{current_user.user_id}_onboarding",
        "status": onboarding.status.value,
        "current_step": onboarding.current_step.value,
        "progress_percentage": onboarding.progress_percentage,
        "started_at": onboarding.started_at.isoformat(),
        "message": "Onboarding started successfully"
    }

@router.get("/onboarding/tasks")
def get_onboarding_tasks(
    limit: int = Query(3, ge=1, le=10),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get next onboarding tasks for the user"""
    onboarding_manager = get_onboarding_manager()
    
    tasks = get_next_onboarding_tasks(current_user.user_id, limit)
    
    return {
        "tasks": [
            {
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "step": task.step.value,
                "required": task.required,
                "estimated_time": task.estimated_time,
                "prerequisites": task.prerequisites,
                "help_content": task.help_content,
                "video_url": task.video_url,
                "interactive_demo": task.interactive_demo
            }
            for task in tasks
        ],
        "count": len(tasks)
    }

@router.post("/onboarding/tasks/{task_id}/complete")
def complete_onboarding_task_endpoint(
    task_id: str,
    completion_data: Dict[str, Any],
    current_user: CurrentUser = Depends(get_current_user)
):
    """Complete an onboarding task"""
    success = complete_onboarding_task(current_user.user_id, task_id, completion_data)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to complete task")
    
    return {
        "message": "Task completed successfully",
        "task_id": task_id
    }

@router.post("/onboarding/tasks/{task_id}/skip")
def skip_onboarding_task(
    task_id: str,
    reason: str = "user_choice",
    current_user: CurrentUser = Depends(get_current_user)
):
    """Skip an onboarding task"""
    onboarding_manager = get_onboarding_manager()
    
    success = onboarding_manager.skip_task(current_user.user_id, task_id, reason)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to skip task")
    
    return {
        "message": "Task skipped successfully",
        "task_id": task_id,
        "reason": reason
    }

@router.get("/onboarding/status")
def get_onboarding_status(current_user: CurrentUser = Depends(get_current_user)):
    """Get user's onboarding status"""
    onboarding_manager = get_onboarding_manager()
    
    status = onboarding_manager.get_onboarding_status(current_user.user_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    
    return {
        "user_id": status.user_id,
        "status": status.status.value,
        "current_step": status.current_step.value,
        "completed_tasks": status.completed_tasks,
        "skipped_tasks": status.skipped_tasks,
        "progress_percentage": status.progress_percentage,
        "started_at": status.started_at.isoformat(),
        "last_activity": status.last_activity.isoformat(),
        "completed_at": status.completed_at.isoformat() if status.completed_at else None
    }

@router.get("/onboarding/analytics")
def get_onboarding_analytics_endpoint(current_user: CurrentUser = Depends(get_current_user)):
    """Get onboarding analytics (admin only)"""
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin only")
    
    analytics = get_onboarding_analytics()
    
    return {
        "analytics": analytics
    }

@router.post("/initialize")
def initialize_documentation(current_user: CurrentUser = Depends(get_current_user)):
    """Initialize all documentation templates (admin only)"""
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin only")
    
    try:
        initialize_guide_templates()
        
        return {
            "message": "Documentation templates initialized successfully",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize documentation: {str(e)}")
