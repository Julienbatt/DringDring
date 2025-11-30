from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from ..dependencies.auth import get_current_user, CurrentUser

router = APIRouter(prefix="/client", tags=["client-stats"])

class ClientStats(BaseModel):
    totalDeliveries: int
    thisMonth: int
    totalBags: int
    averageBags: float
    upcomingDeliveries: int
    lastDelivery: Optional[str] = None

class UpcomingDelivery(BaseModel):
    id: str
    date: str
    timeSlot: str
    bags: int
    status: str
    shopName: str

@router.get("/stats")
async def get_client_stats(current_user: CurrentUser = Depends(get_current_user)):
    """Get client statistics and upcoming deliveries"""
    
    # Pour l'instant, on retourne des données simulées
    # Plus tard, on récupérera les vraies données depuis Firestore
    stats = ClientStats(
        totalDeliveries=24,
        thisMonth=8,
        totalBags=48,
        averageBags=2.0,
        upcomingDeliveries=3,
        lastDelivery="2025-10-25"
    )
    
    return stats

@router.get("/deliveries/upcoming")
async def get_upcoming_deliveries(current_user: CurrentUser = Depends(get_current_user)):
    """Get upcoming deliveries for the client"""
    
    # Données simulées pour les livraisons à venir
    upcoming = [
        UpcomingDelivery(
            id="1",
            date="2025-10-27",
            timeSlot="14:30",
            bags=2,
            status="confirmed",
            shopName="Migros Sion"
        ),
        UpcomingDelivery(
            id="2",
            date="2025-10-28",
            timeSlot="10:00",
            bags=1,
            status="scheduled",
            shopName="Coop Martigny"
        ),
        UpcomingDelivery(
            id="3",
            date="2025-10-29",
            timeSlot="16:00",
            bags=3,
            status="confirmed",
            shopName="Manor Sion"
        )
    ]
    
    return upcoming

@router.get("/deliveries/history")
async def get_delivery_history(current_user: CurrentUser = Depends(get_current_user)):
    """Get delivery history for the client"""
    
    # Données simulées pour l'historique
    history = [
        {
            "id": "1",
            "date": "2025-10-20",
            "timeSlot": "15:00",
            "bags": 2,
            "status": "delivered",
            "shopName": "Migros Sion",
            "amount": 25.50
        },
        {
            "id": "2",
            "date": "2025-10-18",
            "timeSlot": "11:30",
            "bags": 1,
            "status": "delivered",
            "shopName": "Coop Martigny",
            "amount": 15.00
        },
        {
            "id": "3",
            "date": "2025-10-15",
            "timeSlot": "09:00",
            "bags": 3,
            "status": "delivered",
            "shopName": "Manor Sion",
            "amount": 45.75
        }
    ]
    
    return history



