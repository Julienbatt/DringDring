from fastapi import APIRouter, Depends

from app.core.identity import resolve_identity
from app.core.security import get_current_user, get_current_user_claims
from app.schemas.me import MeResponse

router = APIRouter()


@router.get("/me", response_model=MeResponse)
def get_me(
    user=Depends(get_current_user),
    jwt_claims: str = Depends(get_current_user_claims),
) -> MeResponse:
    return resolve_identity(
        user_id=user.user_id,
        email=user.email,
        jwt_claims=jwt_claims,
    )
