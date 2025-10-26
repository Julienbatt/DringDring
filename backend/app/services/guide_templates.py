"""
Pre-configured guide templates for different user roles
"""
from datetime import datetime, timezone
from typing import List

from .documentation import (
    UserGuide, GuideStep, GuideType, UserRole,
    create_guide
)
from .onboarding import get_onboarding_manager

def initialize_guide_templates():
    """Initialize all guide templates"""
    
    # Initialize onboarding tasks
    onboarding_manager = get_onboarding_manager()
    onboarding_manager.initialize_tasks()
    
    # Create guides for different roles
    create_shop_guides()
    create_admin_guides()
    create_regional_admin_guides()
    create_hq_admin_guides()
    
    print("✅ All guide templates initialized")

def create_shop_guides():
    """Create guides for shop users"""
    
    # Quick Start Guide for Shops
    quick_start_guide = UserGuide(
        id="shop_quick_start",
        title="Quick Start Guide for Shops",
        description="Get up and running with DringDring in 15 minutes",
        guide_type=GuideType.QUICK_START,
        target_roles=[UserRole.SHOP],
        steps=[
            GuideStep(
                id="setup_profile",
                title="Set Up Your Profile",
                description="Complete your shop profile with essential information",
                content="Welcome to DringDring! Let's start by setting up your shop profile. This includes your shop name, address, contact information, and basic settings.",
                action_required="Complete shop profile form",
                estimated_time=5,
                difficulty="beginner",
                prerequisites=[]
            ),
            GuideStep(
                id="configure_pricing",
                title="Configure Your Pricing",
                description="Set up how you want to charge for deliveries",
                content="Configure your pricing model - whether you want to charge per bag or per amount. You can also set different rates for CMS clients.",
                action_required="Configure pricing settings",
                estimated_time=10,
                difficulty="beginner",
                prerequisites=["setup_profile"]
            ),
            GuideStep(
                id="create_first_delivery",
                title="Create Your First Delivery",
                description="Test the system by creating your first delivery",
                content="Now let's create your first delivery to see how the system works. This will help you understand the workflow.",
                action_required="Create a test delivery",
                estimated_time=5,
                difficulty="beginner",
                prerequisites=["configure_pricing"]
            )
        ],
        estimated_total_time=20,
        difficulty="beginner",
        tags=["shop", "quick-start", "onboarding"],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    create_guide(quick_start_guide)
    
    # Advanced Shop Features Guide
    advanced_guide = UserGuide(
        id="shop_advanced_features",
        title="Advanced Shop Features",
        description="Master advanced features for shop management",
        guide_type=GuideType.TUTORIAL,
        target_roles=[UserRole.SHOP],
        steps=[
            GuideStep(
                id="google_sheets_integration",
                title="Google Sheets Integration",
                description="Connect your Google Sheets for automatic delivery tracking",
                content="Learn how to connect Google Sheets to automatically track all your deliveries. This creates a real-time spreadsheet of your delivery data.",
                action_required="Connect Google Sheets account",
                estimated_time=15,
                difficulty="intermediate",
                prerequisites=[]
            ),
            GuideStep(
                id="client_management",
                title="Advanced Client Management",
                description="Manage your clients efficiently with advanced features",
                content="Discover advanced client management features including bulk operations, client categorization, and automated workflows.",
                action_required="Set up client categories",
                estimated_time=20,
                difficulty="intermediate",
                prerequisites=["google_sheets_integration"]
            ),
            GuideStep(
                id="reporting_analytics",
                title="Reporting and Analytics",
                description="Use built-in analytics to track your business performance",
                content="Learn how to use the reporting dashboard to track your delivery performance, revenue, and client satisfaction.",
                action_required="Generate your first report",
                estimated_time=10,
                difficulty="intermediate",
                prerequisites=["client_management"]
            )
        ],
        estimated_total_time=45,
        difficulty="intermediate",
        tags=["shop", "advanced", "features"],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    create_guide(advanced_guide)

def create_admin_guides():
    """Create guides for admin users"""
    
    # Admin Setup Guide
    admin_setup_guide = UserGuide(
        id="admin_setup",
        title="Admin Setup Guide",
        description="Complete setup guide for system administrators",
        guide_type=GuideType.TUTORIAL,
        target_roles=[UserRole.ADMIN],
        steps=[
            GuideStep(
                id="system_configuration",
                title="System Configuration",
                description="Configure system-wide settings and preferences",
                content="Set up system-wide configurations including default pricing, regional settings, and global preferences.",
                action_required="Configure system settings",
                estimated_time=20,
                difficulty="intermediate",
                prerequisites=[]
            ),
            GuideStep(
                id="user_management",
                title="User Management",
                description="Learn how to manage users and their permissions",
                content="Master user management including creating users, assigning roles, and managing permissions across the system.",
                action_required="Create test users",
                estimated_time=15,
                difficulty="intermediate",
                prerequisites=["system_configuration"]
            ),
            GuideStep(
                id="monitoring_setup",
                title="Monitoring and Analytics",
                description="Set up monitoring and analytics for the system",
                content="Configure monitoring tools, set up alerts, and learn how to use analytics to track system performance.",
                action_required="Set up monitoring dashboard",
                estimated_time=25,
                difficulty="advanced",
                prerequisites=["user_management"]
            )
        ],
        estimated_total_time=60,
        difficulty="intermediate",
        tags=["admin", "setup", "configuration"],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    create_guide(admin_setup_guide)

def create_regional_admin_guides():
    """Create guides for regional admin users"""
    
    # Regional Admin Guide
    regional_admin_guide = UserGuide(
        id="regional_admin_guide",
        title="Regional Administration Guide",
        description="Complete guide for regional administrators",
        guide_type=GuideType.TUTORIAL,
        target_roles=[UserRole.REGIONAL_ADMIN],
        steps=[
            GuideStep(
                id="region_setup",
                title="Region Setup",
                description="Set up your region and manage regional settings",
                content="Configure your region, set regional policies, and establish regional pricing structures.",
                action_required="Configure region settings",
                estimated_time=20,
                difficulty="intermediate",
                prerequisites=[]
            ),
            GuideStep(
                id="shop_management",
                title="Shop Management",
                description="Manage shops within your region",
                content="Learn how to create, manage, and monitor shops within your region. This includes shop approval and oversight.",
                action_required="Create test shops",
                estimated_time=15,
                difficulty="intermediate",
                prerequisites=["region_setup"]
            ),
            GuideStep(
                id="regional_analytics",
                title="Regional Analytics",
                description="Monitor regional performance and trends",
                content="Use regional analytics to track performance across your region, identify trends, and make data-driven decisions.",
                action_required="Generate regional report",
                estimated_time=10,
                difficulty="intermediate",
                prerequisites=["shop_management"]
            )
        ],
        estimated_total_time=45,
        difficulty="intermediate",
        tags=["regional-admin", "region", "management"],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    create_guide(regional_admin_guide)

def create_hq_admin_guides():
    """Create guides for HQ admin users"""
    
    # HQ Admin Guide
    hq_admin_guide = UserGuide(
        id="hq_admin_guide",
        title="HQ Administration Guide",
        description="Complete guide for HQ administrators",
        guide_type=GuideType.TUTORIAL,
        target_roles=[UserRole.HQ_ADMIN],
        steps=[
            GuideStep(
                id="chain_setup",
                title="Chain Setup",
                description="Set up your chain and manage chain-wide settings",
                content="Configure your chain, establish chain-wide policies, and set up chain-level pricing and standards.",
                action_required="Configure chain settings",
                estimated_time=25,
                difficulty="intermediate",
                prerequisites=[]
            ),
            GuideStep(
                id="store_management",
                title="Store Management",
                description="Manage stores within your chain",
                content="Learn how to create, manage, and monitor stores within your chain. This includes store approval and chain-wide oversight.",
                action_required="Create test stores",
                estimated_time=20,
                difficulty="intermediate",
                prerequisites=["chain_setup"]
            ),
            GuideStep(
                id="chain_analytics",
                title="Chain Analytics",
                description="Monitor chain performance and trends",
                content="Use chain analytics to track performance across your entire chain, identify trends, and make strategic decisions.",
                action_required="Generate chain report",
                estimated_time=15,
                difficulty="intermediate",
                prerequisites=["store_management"]
            ),
            GuideStep(
                id="billing_management",
                title="Billing and Financial Management",
                description="Manage billing and financial operations",
                content="Set up billing systems, manage financial reporting, and oversee revenue tracking across your chain.",
                action_required="Set up billing system",
                estimated_time=30,
                difficulty="advanced",
                prerequisites=["chain_analytics"]
            )
        ],
        estimated_total_time=90,
        difficulty="intermediate",
        tags=["hq-admin", "chain", "management", "billing"],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    create_guide(hq_admin_guide)

def create_troubleshooting_guides():
    """Create troubleshooting guides"""
    
    # Common Issues Guide
    troubleshooting_guide = UserGuide(
        id="troubleshooting_common_issues",
        title="Troubleshooting Common Issues",
        description="Solutions for common problems and issues",
        guide_type=GuideType.TROUBLESHOOTING,
        target_roles=[UserRole.SHOP, UserRole.ADMIN, UserRole.REGIONAL_ADMIN, UserRole.HQ_ADMIN],
        steps=[
            GuideStep(
                id="pricing_issues",
                title="Pricing Calculation Issues",
                description="Troubleshoot pricing calculation problems",
                content="Common issues with pricing calculations and how to resolve them. Includes fee splitting problems and CMS pricing issues.",
                action_required="Check pricing configuration",
                estimated_time=10,
                difficulty="beginner",
                prerequisites=[]
            ),
            GuideStep(
                id="sheets_sync_issues",
                title="Google Sheets Sync Issues",
                description="Resolve Google Sheets synchronization problems",
                content="Troubleshoot Google Sheets integration issues including authentication problems, sync failures, and data formatting issues.",
                action_required="Test sheets connection",
                estimated_time=15,
                difficulty="intermediate",
                prerequisites=[]
            ),
            GuideStep(
                id="permission_issues",
                title="Permission and Access Issues",
                description="Resolve user permission and access problems",
                content="Common permission issues and how to resolve them. Includes role assignment problems and access restrictions.",
                action_required="Check user permissions",
                estimated_time=5,
                difficulty="beginner",
                prerequisites=[]
            )
        ],
        estimated_total_time=30,
        difficulty="beginner",
        tags=["troubleshooting", "support", "issues"],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    create_guide(troubleshooting_guide)

def create_video_tutorials():
    """Create video tutorial content"""
    from .documentation import get_documentation_manager
    
    doc_manager = get_documentation_manager()
    
    # Welcome Video
    doc_manager.create_video_tutorial(
        video_id="welcome_video",
        title="Welcome to DringDring",
        description="Introduction to the DringDring platform",
        video_url="https://example.com/videos/welcome.mp4",
        duration=300,  # 5 minutes
        target_roles=[UserRole.SHOP, UserRole.ADMIN, UserRole.REGIONAL_ADMIN, UserRole.HQ_ADMIN],
        transcript="Welcome to DringDring, the comprehensive delivery management platform..."
    )
    
    # Pricing Setup Video
    doc_manager.create_video_tutorial(
        video_id="pricing_setup_video",
        title="Setting Up Your Pricing",
        description="How to configure pricing for your deliveries",
        video_url="https://example.com/videos/pricing-setup.mp4",
        duration=600,  # 10 minutes
        target_roles=[UserRole.SHOP, UserRole.REGIONAL_ADMIN, UserRole.HQ_ADMIN],
        transcript="In this video, we'll show you how to set up your pricing model..."
    )
    
    # Google Sheets Integration Video
    doc_manager.create_video_tutorial(
        video_id="sheets_integration_video",
        title="Google Sheets Integration",
        description="How to connect and use Google Sheets with DringDring",
        video_url="https://example.com/videos/sheets-integration.mp4",
        duration=900,  # 15 minutes
        target_roles=[UserRole.SHOP, UserRole.ADMIN],
        transcript="Learn how to integrate Google Sheets with your DringDring account..."
    )

def create_help_articles():
    """Create help articles"""
    from .documentation import get_documentation_manager
    
    doc_manager = get_documentation_manager()
    
    # FAQ Articles
    doc_manager.create_help_article(
        article_id="faq_pricing",
        title="Pricing FAQ",
        content="Frequently asked questions about pricing configuration and fee calculations.",
        category="pricing",
        tags=["pricing", "faq", "fees"],
        target_roles=[UserRole.SHOP, UserRole.REGIONAL_ADMIN, UserRole.HQ_ADMIN]
    )
    
    doc_manager.create_help_article(
        article_id="faq_permissions",
        title="User Permissions FAQ",
        content="Common questions about user roles and permissions in the system.",
        category="permissions",
        tags=["permissions", "roles", "access"],
        target_roles=[UserRole.ADMIN, UserRole.REGIONAL_ADMIN, UserRole.HQ_ADMIN]
    )
    
    doc_manager.create_help_article(
        article_id="faq_sheets",
        title="Google Sheets FAQ",
        content="Frequently asked questions about Google Sheets integration.",
        category="integrations",
        tags=["google-sheets", "integration", "sync"],
        target_roles=[UserRole.SHOP, UserRole.ADMIN]
    )

def create_interactive_demos():
    """Create interactive demos"""
    from .documentation import get_documentation_manager
    
    doc_manager = get_documentation_manager()
    
    # Pricing Calculator Demo
    doc_manager.create_interactive_demo(
        demo_id="pricing_calculator_demo",
        title="Pricing Calculator Demo",
        description="Interactive demo of the pricing calculation system",
        demo_config={
            "type": "pricing_calculator",
            "scenarios": [
                {"bags": 2, "amount": 30, "cms": False, "expected_fee": 15},
                {"bags": 3, "amount": 45, "cms": True, "expected_fee": 20},
                {"bags": 5, "amount": 75, "cms": False, "expected_fee": 30}
            ]
        },
        target_roles=[UserRole.SHOP, UserRole.REGIONAL_ADMIN, UserRole.HQ_ADMIN]
    )
    
    # Delivery Creation Demo
    doc_manager.create_interactive_demo(
        demo_id="delivery_creation_demo",
        title="Delivery Creation Demo",
        description="Interactive demo of creating a delivery",
        demo_config={
            "type": "delivery_creation",
            "steps": [
                "Select client",
                "Set delivery details",
                "Configure pricing",
                "Review and confirm"
            ]
        },
        target_roles=[UserRole.SHOP, UserRole.ADMIN]
    )

# Initialize all templates when module is imported
if __name__ == "__main__":
    initialize_guide_templates()
    create_troubleshooting_guides()
    create_video_tutorials()
    create_help_articles()
    create_interactive_demos()
    print("✅ All documentation templates created successfully!")

