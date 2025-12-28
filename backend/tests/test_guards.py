import pytest
from fastapi import HTTPException
from app.core.guards import (
    require_city_user,
    require_hq_user,
    require_hq_or_admin_user_for_shop
)
from app.schemas.me import MeResponse

@pytest.fixture
def mock_resolve_identity(mocker):
    return mocker.patch("app.core.guards.resolve_identity")

def test_require_city_user_success(mock_resolve_identity, mock_current_user, mock_user_claims):
    """Test access granted for city user"""
    mock_resolve_identity.return_value = MeResponse(
        user_id="u1", email="e", role="city", city_id="city-1"
    )
    identity = require_city_user(mock_current_user, mock_user_claims)
    assert identity.role == "city"
    assert identity.city_id == "city-1"

def test_require_city_user_failure(mock_resolve_identity, mock_current_user, mock_user_claims):
    """Test access denied for non-city user or city user without city_id"""
    # Wrong role
    mock_resolve_identity.return_value = MeResponse(
        user_id="u1", email="e", role="shop", shop_id="s1"
    )
    with pytest.raises(HTTPException) as exc:
        require_city_user(mock_current_user, mock_user_claims)
    assert exc.value.status_code == 403
    
    # Right role, missing city_id (should not happen in real DB but defensive coding)
    mock_resolve_identity.return_value = MeResponse(
        user_id="u1", email="e", role="city", city_id=None
    )
    with pytest.raises(HTTPException) as exc:
        require_city_user(mock_current_user, mock_user_claims)
    assert exc.value.status_code == 403

def test_require_hq_or_admin_for_shop_hq_success(
    mock_db_connection, mock_resolve_identity, mock_current_user, mock_user_claims
):
    """Test HQ user accessing their own shop"""
    shop_id = "shop-1"
    hq_id = "hq-1"
    
    # Mock Shop lookup finding the shop and linking it to hq-1
    mock_cursor = mock_db_connection
    # row = (shop_hq_id, canton_id)
    # The code ALWAYS checks admin region after checking shop, regardless of user role
    mock_cursor.fetchone.side_effect = [
        (hq_id, "canton-1"),   # 1. Shop details
        (None,)                # 2. Admin region (not important for this test but called)
    ]
    
    # User is HQ of hq-1
    mock_resolve_identity.return_value = MeResponse(
        user_id="u1", email="e", role="hq", hq_id=hq_id
    )
    
    identity = require_hq_or_admin_user_for_shop(shop_id, mock_current_user, mock_user_claims)
    assert identity.hq_id == hq_id

def test_require_hq_or_admin_for_shop_hq_failure(
    mock_db_connection, mock_resolve_identity, mock_current_user, mock_user_claims
):
    """Test HQ user accessing shop of ANOTHER HQ"""
    shop_id = "shop-1"
    
    # Shop belongs to hq-2
    mock_cursor = mock_db_connection
    mock_cursor.fetchone.side_effect = [
        ("hq-2", "canton-1"), # 1. Shop details
        (None,)               # 2. Admin region
    ]
    
    # User is HQ of hq-1
    mock_resolve_identity.return_value = MeResponse(
        user_id="u1", email="e", role="hq", hq_id="hq-1"
    )
    
    with pytest.raises(HTTPException) as exc:
        require_hq_or_admin_user_for_shop(shop_id, mock_current_user, mock_user_claims)
    assert exc.value.status_code == 403

def test_require_hq_or_admin_for_shop_admin_success(
    mock_db_connection, mock_resolve_identity, mock_current_user, mock_user_claims
):
    """Test Admin accessing shop in their region"""
    shop_id = "shop-1"
    canton_id = "canton-1"
    admin_region_id = "admin-1"
    
    mock_cursor = mock_db_connection
    mock_cursor.fetchone.side_effect = [
        (None, canton_id),     # First fetch: Shop details (No HQ, just canton)
        (admin_region_id,),    # Second fetch: Admin region for canton
    ]
    
    # User is Admin of admin-1
    mock_resolve_identity.return_value = MeResponse(
        user_id="u1", email="e", role="admin_region", admin_region_id=admin_region_id
    )
    
    identity = require_hq_or_admin_user_for_shop(shop_id, mock_current_user, mock_user_claims)
    assert identity.admin_region_id == admin_region_id
