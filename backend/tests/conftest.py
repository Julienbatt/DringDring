from unittest.mock import MagicMock
import pytest
from app.schemas.me import MeResponse

@pytest.fixture
def mock_db_connection(mocker):
    """
    Mock the database connection context manager.
    Usage:
        def test_something(mock_db_connection):
            mock_cursor = mock_db_connection
            mock_cursor.fetchone.return_value = (...)
    """
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    
    # Setup context manager behavior
    mock_conn.__enter__.return_value = mock_conn
    mock_conn.__exit__.return_value = None
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.__enter__.return_value = mock_cursor
    mock_cursor.__exit__.return_value = None
    
    # Patch the get_db_connection in various places it might be used
    mocker.patch("app.core.identity.get_db_connection", return_value=mock_conn)
    mocker.patch("app.core.guards.get_db_connection", return_value=mock_conn)
    
    return mock_cursor

@pytest.fixture
def mock_user_claims(mocker):
    """Mock the JWT claims dependency"""
    mocker.patch("app.core.security.get_current_user_claims", return_value="fake-jwt-claims")
    return "fake-jwt-claims"

@pytest.fixture
def mock_current_user(mocker):
    """Mock the authenticated user without role resolution"""
    user = MagicMock()
    user.user_id = "user-123"
    user.email = "test@example.com"
    mocker.patch("app.core.security.get_current_user", return_value=user)
    return user
