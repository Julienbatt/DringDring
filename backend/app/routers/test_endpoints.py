from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict

router = APIRouter(prefix="/test", tags=["test"])

def calculate_delivery_price(bags: int, order_amount: Optional[float] = None, pricing_type: str = "bags", is_cms: bool = False, region: str = "Vélocité Sion") -> float:
    """
    Calcule le prix d'une livraison selon la logique DringDring
    
    Args:
        bags: Nombre de sacs
        order_amount: Montant de la commande (pour tarif par montant)
        pricing_type: "bags" ou "amount"
        is_cms: True si le client est bénéficiaire CMS
        region: Région pour la configuration des tarifs
    
    Returns:
        Prix total de la livraison
    """
    if pricing_type == "amount" and order_amount is not None:
        # Tarif par montant de commande
        if order_amount <= 80:
            return 15.0
        else:
            return 30.0
    else:
        # Tarif par nombre de sacs (Sion)
        # Logique par tranche de 2 sacs
        if is_cms:
            # Tarif CMS réduit
            if bags <= 2:
                return 10.0
            elif bags <= 4:
                return 20.0
            elif bags <= 6:
                return 30.0
            elif bags <= 8:
                return 40.0
            elif bags <= 10:
                return 50.0
            else:
                # Pour plus de 10 sacs, continuer la logique CMS
                return ((bags - 1) // 2 + 1) * 10.0
        else:
            # Tarif normal
            if bags <= 2:
                return 15.0
            elif bags <= 4:
                return 30.0
            elif bags <= 6:
                return 45.0
            elif bags <= 8:
                return 60.0
            elif bags <= 10:
                return 75.0
            else:
                # Pour plus de 10 sacs, continuer la logique
                return ((bags - 1) // 2 + 1) * 15.0

def calculate_billing_distribution(total_amount: float) -> Dict[str, float]:
    """
    Calcule la répartition des factures pour une livraison
    
    Args:
        total_amount: Montant total de la livraison (reçu par Vélocité)
    
    Returns:
        Dictionnaire avec les montants à facturer
    """
    # Répartition en 3 factures égales
    amount_per_invoice = total_amount / 3
    
    return {
        "velocite_receives": total_amount,     # Vélocité reçoit le total
        "invoice_magasin": amount_per_invoice, # Facture au magasin
        "invoice_client": amount_per_invoice,  # Facture au client
        "invoice_autorites": amount_per_invoice # Facture aux autorités
    }

class PricingConfig(BaseModel):
    region: str
    pricing_type: str  # "bags" ou "amount"
    bags_pricing: Optional[Dict[str, float]] = None  # {"1-2": 15.0, "3-4": 30.0, etc.}
    cms_bags_pricing: Optional[Dict[str, float]] = None  # {"1-2": 10.0, "3-4": 20.0, etc.}
    amount_threshold: Optional[float] = None  # 80.0
    amount_low_price: Optional[float] = None  # 15.0
    amount_high_price: Optional[float] = None  # 30.0
    last_updated: str
    updated_by: str

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

@router.get("/client/stats")
async def get_client_stats_test():
    """Test endpoint for client stats without authentication"""
    
    stats = ClientStats(
        totalDeliveries=24,
        thisMonth=8,
        totalBags=48,
        averageBags=2.0,
        upcomingDeliveries=3,
        lastDelivery="2025-10-25"
    )
    
    return stats

@router.get("/client/deliveries/upcoming")
async def get_upcoming_deliveries_test():
    """Test endpoint for upcoming deliveries without authentication"""
    
    upcoming = [
        UpcomingDelivery(
            id="1",
            date="2025-10-27T14:30:00Z",
            timeSlot="14:30",
            bags=2,
            status="confirmed",
            shopName="Migros Sion"
        ),
        UpcomingDelivery(
            id="2",
            date="2025-10-28T10:00:00Z",
            timeSlot="10:00",
            bags=1,
            status="scheduled",
            shopName="Coop Martigny"
        ),
        UpcomingDelivery(
            id="3",
            date="2025-10-29T16:00:00Z",
            timeSlot="16:00",
            bags=3,
            status="confirmed",
            shopName="Manor Sion"
        )
    ]
    
    return upcoming

@router.get("/shop/deliveries/upcoming")
async def get_shop_upcoming_deliveries_test():
    """Test endpoint for shop upcoming deliveries without authentication"""
    # Données de test pour les livraisons à venir du magasin
    upcoming = [
        {
            "id": "1",
            "date": "2025-10-27T14:30:00Z",
            "timeSlot": "14:30",
            "bags": 2,
            "status": "confirmed",
            "clientName": "Jean Dupont",
            "clientPhone": "079 123 45 67",
            "address": "Rue du Rhône 12, 1950 Sion"
        },
        {
            "id": "2", 
            "date": "2025-10-28T10:00:00Z",
            "timeSlot": "10:00",
            "bags": 1,
            "status": "scheduled",
            "clientName": "Marie Martin",
            "clientPhone": "079 234 56 78",
            "address": "Avenue de la Gare 5, 1950 Sion"
        },
        {
            "id": "3",
            "date": "2025-10-29T16:00:00Z", 
            "timeSlot": "16:00",
            "bags": 3,
            "status": "confirmed",
            "clientName": "Pierre Durand",
            "clientPhone": "079 345 67 89",
            "address": "Rue de la Poste 8, 1950 Sion"
        }
    ]
    return upcoming

@router.get("/client/deliveries")
async def get_client_deliveries_test():
    """Test endpoint for all client deliveries without authentication"""
    
    deliveries = [
        {
            "id": "1",
            "date": "2025-10-27T14:30:00Z",
            "timeSlot": "14:30",
            "bags": 2,
            "status": "confirmed",
            "shopName": "Metropole Migros",
            "shopAddress": "Place de la Gare 5, 1950 Sion",
            "totalAmount": 15.00,  # 2 sacs (tarif normal)
            "notes": "Livraison au 2ème étage"
        },
        {
            "id": "2",
            "date": "2025-10-28T10:00:00Z",
            "timeSlot": "10:00",
            "bags": 1,
            "status": "scheduled",
            "shopName": "Coop Martigny",
            "shopAddress": "Avenue de la Gare 15, 1920 Martigny",
            "totalAmount": 15.00,  # 1 sac (tarif normal)
            "notes": ""
        },
        {
            "id": "3",
            "date": "2025-10-29T16:00:00Z",
            "timeSlot": "16:00",
            "bags": 3,
            "status": "confirmed",
            "shopName": "Manor Sion",
            "shopAddress": "Place de la Gare 5, 1950 Sion",
            "totalAmount": 30.00,  # 3 sacs (tarif normal)
            "notes": "Sonner à l'interphone"
        },
        {
            "id": "4",
            "date": "2025-10-20T11:30:00Z",
            "timeSlot": "11:30",
            "bags": 2,
            "status": "delivered",
            "shopName": "Metropole Migros",
            "shopAddress": "Place de la Gare 5, 1950 Sion",
            "totalAmount": 15.00,  # 2 sacs (tarif normal)
            "notes": ""
        },
        {
            "id": "5",
            "date": "2025-10-15T15:45:00Z",
            "timeSlot": "15:45",
            "bags": 1,
            "status": "delivered",
            "shopName": "Coop Martigny",
            "shopAddress": "Avenue de la Gare 15, 1920 Martigny",
            "totalAmount": 15.00,  # 1 sac (tarif normal)
            "notes": ""
        }
    ]
    
    return deliveries

@router.get("/client/delivery-stats")
async def get_client_delivery_stats_test():
    """Test endpoint for client delivery statistics without authentication"""
    
    stats = {
        "total": 5,
        "thisMonth": 3,
        "delivered": 2,
        "pending": 3,
        "cancelled": 0
    }
    
    return stats

@router.get("/client/profile")
async def get_client_profile_test():
    """Test endpoint for client profile without authentication"""
    
    profile = {
        "id": "client_123",
        "firstName": "Jean",
        "lastName": "Dupont",
        "email": "jean.dupont@example.com",
        "phone": "+41 79 123 45 67",
        "address": "Rue de la Paix 10",
        "city": "Sion",
        "zip": "1950",
        "country": "Suisse",
        "preferredDeliveryTime": "afternoon",
        "notes": "Livraison préférée l'après-midi",
        "createdAt": "2025-01-15T10:30:00Z",
        "lastLogin": "2025-10-26T15:30:00Z"
    }
    
    return profile

@router.put("/client/profile")
async def update_client_profile_test(profile_data: dict):
    """Test endpoint for updating client profile without authentication"""
    # Simulate profile update
    return {
        "id": "client_123",
        "firstName": profile_data.get("firstName", "Jean"),
        "lastName": profile_data.get("lastName", "Dupont"),
        "email": profile_data.get("email", "jean.dupont@example.com"),
        "phone": profile_data.get("phone", ""),
        "address": profile_data.get("address", ""),
        "city": profile_data.get("city", ""),
        "zip": profile_data.get("zip", ""),
        "country": profile_data.get("country", "Suisse"),
        "preferredDeliveryTime": profile_data.get("preferredDeliveryTime", ""),
        "notes": profile_data.get("notes", ""),
        "createdAt": "2025-01-15T10:30:00Z",
        "lastLogin": "2025-10-26T15:30:00Z"
    }

@router.put("/client/delete-account")
async def delete_client_account_test():
    """Test endpoint for deleting client account without authentication"""
    return {"message": "Account deleted successfully"}

@router.get("/shop/deliveries")
async def get_shop_deliveries_test():
    """Test endpoint for shop deliveries without authentication"""
    
    deliveries = [
        {
            "id": "1",
            "date": "2025-10-26T14:30:00Z",
            "timeSlot": "14:30",
            "clientName": "Jean Dupont",
            "clientAddress": "Rue de la Paix 10, 1950 Sion",
            "bags": 2,
            "status": "confirmed",
            "totalAmount": 15.00,  # 2 sacs (tarif normal)
            "notes": "Livraison au 2ème étage",
            "createdAt": "2025-10-25T10:30:00Z"
        },
        {
            "id": "2",
            "date": "2025-10-26T16:00:00Z",
            "timeSlot": "16:00",
            "clientName": "Marie Martin",
            "clientAddress": "Avenue du Rhône 25, 1950 Sion",
            "bags": 1,
            "status": "scheduled",
            "totalAmount": 15.00,  # 1 sac (tarif normal)
            "notes": "",
            "createdAt": "2025-10-25T11:15:00Z"
        },
        {
            "id": "3",
            "date": "2025-10-27T10:00:00Z",
            "timeSlot": "10:00",
            "clientName": "Pierre Dubois",
            "clientAddress": "Rue du Simplon 5, 1950 Sion",
            "bags": 3,
            "status": "confirmed",
            "totalAmount": 30.00,  # 3 sacs (tarif normal)
            "notes": "Sonner à l'interphone",
            "createdAt": "2025-10-25T14:20:00Z"
        },
        {
            "id": "4",
            "date": "2025-10-25T11:30:00Z",
            "timeSlot": "11:30",
            "clientName": "Sophie Moreau",
            "clientAddress": "Chemin des Vignes 12, 1950 Sion",
            "bags": 2,
            "status": "delivered",
            "totalAmount": 15.00,  # 2 sacs (tarif normal)
            "notes": "",
            "createdAt": "2025-10-24T16:45:00Z"
        },
        {
            "id": "5",
            "date": "2025-10-25T15:45:00Z",
            "timeSlot": "15:45",
            "clientName": "Lucas Petit",
            "clientAddress": "Rue de la Gare 8, 1950 Sion",
            "bags": 1,
            "status": "delivered",
            "totalAmount": 15.00,  # 1 sac (tarif normal)
            "notes": "",
            "createdAt": "2025-10-24T18:30:00Z"
        }
    ]
    
    return deliveries

@router.get("/shop/stats")
async def get_shop_stats_test():
    """Test endpoint for shop statistics without authentication"""
    
    stats = {
        "today": 2,
        "thisWeek": 8,
        "thisMonth": 45,
        "totalRevenue": 1250.50,
        "pendingDeliveries": 3
    }
    
    return stats

@router.get("/shop/profile")
async def get_shop_profile_test():
    """Test endpoint for shop profile without authentication"""
    
    profile = {
        "id": "shop_456",
        "name": "Metropole Migros",
        "address": "Place de la Gare 5",
        "city": "Sion",
        "zip": "1950",
        "country": "Suisse",
        "phone": "027/333 22 66",
        "email": "metropole.sion@migros.ch",
        "contactPerson": "Marie Dubois",
        "openingHours": {
            "monday": "08:00-19:00",
            "tuesday": "08:00-19:00",
            "wednesday": "08:00-19:00",
            "thursday": "08:00-19:00",
            "friday": "08:00-19:00",
            "saturday": "08:00-18:00",
            "sunday": "09:00-17:00"
        },
        "departments": ["Alimentation", "Boucherie", "Boulangerie", "Fruits & Légumes"],
        "notes": "Metropole Migros - Magasin principal près de la gare avec parking souterrain",
        "createdAt": "2025-01-10T09:00:00Z",
        "lastUpdated": "2025-10-26T14:30:00Z"
    }
    
    return profile

@router.put("/shop/profile")
async def update_shop_profile_test(profile_data: dict):
    """Test endpoint for updating shop profile without authentication"""
    # Simulate profile update
    return {
        "id": "shop_456",
        "name": profile_data.get("name", "Metropole Migros"),
        "address": profile_data.get("address", "Place de la Gare 5"),
        "city": profile_data.get("city", "Sion"),
        "zip": profile_data.get("zip", "1950"),
        "country": profile_data.get("country", "Suisse"),
        "phone": profile_data.get("phone", ""),
        "email": profile_data.get("email", ""),
        "contactPerson": profile_data.get("contactPerson", ""),
        "openingHours": {
            "monday": "08:00-19:00",
            "tuesday": "08:00-19:00",
            "wednesday": "08:00-19:00",
            "thursday": "08:00-19:00",
            "friday": "08:00-19:00",
            "saturday": "08:00-18:00",
            "sunday": "09:00-17:00"
        },
        "departments": ["Alimentation", "Boucherie", "Boulangerie", "Fruits & Légumes"],
        "notes": profile_data.get("notes", ""),
        "createdAt": "2025-01-10T09:00:00Z",
        "lastUpdated": "2025-10-26T14:30:00Z"
    }

@router.put("/shop/deliveries/{delivery_id}/cancel")
async def cancel_shop_delivery_test(delivery_id: str):
    """Test endpoint for cancelling a shop delivery without authentication"""
    return {"message": f"Delivery {delivery_id} cancelled successfully", "status": "cancelled"}

@router.get("/regional/pricing-config")
async def get_regional_pricing_config():
    """Récupère la configuration des tarifs pour la région"""
    return {
        "region": "Vélocité Sion",
        "pricing_type": "bags",
        "bags_pricing": {
            "1-2": 15.0,
            "3-4": 30.0,
            "5-6": 45.0,
            "7-8": 60.0,
            "9-10": 75.0
        },
        "cms_bags_pricing": {
            "1-2": 10.0,
            "3-4": 20.0,
            "5-6": 30.0,
            "7-8": 40.0,
            "9-10": 50.0
        },
        "last_updated": "2025-01-10T10:00:00Z",
        "updated_by": "admin_regional_sion"
    }

@router.put("/regional/pricing-config")
async def update_regional_pricing_config(config: PricingConfig):
    """Met à jour la configuration des tarifs pour la région"""
    # Simulation de la mise à jour
    return {
        "message": "Configuration des tarifs mise à jour avec succès",
        "config": config,
        "updated_at": "2025-01-10T12:00:00Z"
    }

@router.get("/delivery/{delivery_id}/billing")
async def get_delivery_billing(delivery_id: str):
    """Calcule les factures à envoyer pour une livraison spécifique"""
    # Simulation d'une livraison
    total_amount = 15.0  # Exemple avec 15 CHF
    billing = calculate_billing_distribution(total_amount)
    
    return {
        "delivery_id": delivery_id,
        "total_amount": total_amount,
        "billing_distribution": billing,
        "invoices_to_send": [
            {
                "recipient": "magasin",
                "amount": billing["invoice_magasin"],
                "description": "Participation au service de livraison"
            },
            {
                "recipient": "client", 
                "amount": billing["invoice_client"],
                "description": "Coût de la livraison à domicile"
            },
            {
                "recipient": "autorites",
                "amount": billing["invoice_autorites"], 
                "description": "Soutien à l'activité sociale et mobilité durable"
            }
        ]
    }

@router.get("/billing/calculate")
async def calculate_billing_endpoint(total_amount: float):
    """Calcule les factures à envoyer pour un montant donné"""
    billing = calculate_billing_distribution(total_amount)
    
    return {
        "total_amount": total_amount,
        "billing_distribution": billing,
        "invoices_to_send": [
            {
                "recipient": "magasin",
                "amount": billing["invoice_magasin"],
                "description": "Participation au service de livraison"
            },
            {
                "recipient": "client", 
                "amount": billing["invoice_client"],
                "description": "Coût de la livraison à domicile"
            },
            {
                "recipient": "autorites",
                "amount": billing["invoice_autorites"], 
                "description": "Soutien à l'activité sociale et mobilité durable"
            }
        ]
    }

# HQ Admin Test Data
_HQ_SHOPS_DATA = [
    {
        "id": "shop_1",
        "name": "Metropole Migros Sion",
        "address": "Place de la Gare 5, 1950 Sion",
        "phone": "027/333 22 66",
        "region": "Valais",
        "status": "active",
        "totalDeliveries": 45,
        "todayDeliveries": 3,
        "totalRevenue": 675.0,
        "lastActivity": "2025-01-10T14:30:00Z"
    },
    {
        "id": "shop_2", 
        "name": "Migros Martigny",
        "address": "Rue de la Gare 12, 1920 Martigny",
        "phone": "027/722 33 44",
        "region": "Valais",
        "status": "active",
        "totalDeliveries": 32,
        "todayDeliveries": 2,
        "totalRevenue": 480.0,
        "lastActivity": "2025-01-10T12:15:00Z"
    },
    {
        "id": "shop_3",
        "name": "Coop Sion",
        "address": "Avenue du Midi 8, 1950 Sion", 
        "phone": "027/456 78 90",
        "region": "Valais",
        "status": "active",
        "totalDeliveries": 28,
        "todayDeliveries": 1,
        "totalRevenue": 420.0,
        "lastActivity": "2025-01-10T10:45:00Z"
    }
]

_HQ_DELIVERIES_DATA = [
    {
        "id": "delivery_1",
        "shopName": "Metropole Migros Sion",
        "clientName": "Marie Dubois",
        "date": "2025-01-10T15:30:00Z",
        "amount": 15.0,
        "status": "delivered",
        "region": "Valais"
    },
    {
        "id": "delivery_2",
        "shopName": "Migros Martigny", 
        "clientName": "Pierre Martin",
        "date": "2025-01-10T14:15:00Z",
        "amount": 30.0,
        "status": "in_progress",
        "region": "Valais"
    },
    {
        "id": "delivery_3",
        "shopName": "Coop Sion",
        "clientName": "Sophie Bernard",
        "date": "2025-01-10T13:00:00Z", 
        "amount": 15.0,
        "status": "delivered",
        "region": "Valais"
    }
]

@router.get("/hq-admin/stats")
async def get_hq_admin_stats():
    """Récupère les statistiques pour HQ Admin"""
    total_shops = len(_HQ_SHOPS_DATA)
    total_deliveries = sum(shop["totalDeliveries"] for shop in _HQ_SHOPS_DATA)
    today_deliveries = sum(shop["todayDeliveries"] for shop in _HQ_SHOPS_DATA)
    total_revenue = sum(shop["totalRevenue"] for shop in _HQ_SHOPS_DATA)
    active_shops = len([shop for shop in _HQ_SHOPS_DATA if shop["status"] == "active"])
    
    # Group by region
    regions = {}
    for shop in _HQ_SHOPS_DATA:
        region = shop["region"]
        if region not in regions:
            regions[region] = {"shops": 0, "deliveries": 0, "revenue": 0}
        regions[region]["shops"] += 1
        regions[region]["deliveries"] += shop["totalDeliveries"]
        regions[region]["revenue"] += shop["totalRevenue"]
    
    regions_list = [{"name": region, **data} for region, data in regions.items()]
    
    return {
        "totalShops": total_shops,
        "totalDeliveries": total_deliveries,
        "todayDeliveries": today_deliveries,
        "totalRevenue": total_revenue,
        "activeShops": active_shops,
        "regions": regions_list
    }

@router.get("/hq-admin/shops")
async def get_hq_admin_shops():
    """Récupère la liste des magasins pour HQ Admin"""
    return _HQ_SHOPS_DATA

@router.get("/hq-admin/deliveries")
async def get_hq_admin_deliveries():
    """Récupère les livraisons pour HQ Admin"""
    return _HQ_DELIVERIES_DATA

@router.get("/hq-admin/recent-deliveries")
async def get_hq_admin_recent_deliveries():
    """Récupère les livraisons récentes pour HQ Admin"""
    return _HQ_DELIVERIES_DATA

@router.get("/hq-admin/reports/{period}")
async def get_hq_admin_reports(period: str):
    """Récupère les rapports pour HQ Admin selon la période"""
    # Simulation de données de rapport
    base_deliveries = 45
    base_revenue = 675.0
    
    if period == "week":
        deliveries = base_deliveries // 4
        revenue = base_revenue // 4
    elif period == "month":
        deliveries = base_deliveries
        revenue = base_revenue
    elif period == "quarter":
        deliveries = base_deliveries * 3
        revenue = base_revenue * 3
    elif period == "year":
        deliveries = base_deliveries * 12
        revenue = base_revenue * 12
    else:
        deliveries = base_deliveries
        revenue = base_revenue
    
    return {
        "period": period,
        "totalDeliveries": deliveries,
        "totalRevenue": revenue,
        "averageOrderValue": revenue / deliveries if deliveries > 0 else 0,
        "topShops": [
            {"name": "Metropole Migros Sion", "deliveries": deliveries // 3, "revenue": revenue // 3},
            {"name": "Migros Martigny", "deliveries": deliveries // 4, "revenue": revenue // 4},
            {"name": "Coop Sion", "deliveries": deliveries // 5, "revenue": revenue // 5}
        ],
        "deliveriesByDay": [
            {"date": "2025-01-10", "deliveries": 3, "revenue": 45.0},
            {"date": "2025-01-09", "deliveries": 2, "revenue": 30.0},
            {"date": "2025-01-08", "deliveries": 4, "revenue": 60.0}
        ],
        "deliveriesByRegion": [
            {"region": "Valais", "deliveries": deliveries, "revenue": revenue}
        ]
    }

@router.get("/hq-admin/users")
async def get_hq_admin_users():
    """Récupère les utilisateurs pour HQ Admin"""
    return [
        {
            "id": "user_1",
            "name": "Marie Dubois",
            "email": "marie.dubois@migros.ch",
            "role": "shop_manager",
            "shopName": "Metropole Migros Sion",
            "region": "Valais",
            "status": "active",
            "lastLogin": "2025-01-10T14:30:00Z",
            "createdAt": "2024-12-01T10:00:00Z",
            "permissions": ["deliveries:read", "deliveries:write", "shop:manage"]
        },
        {
            "id": "user_2",
            "name": "Pierre Martin",
            "email": "pierre.martin@migros.ch",
            "role": "shop_employee",
            "shopName": "Migros Martigny",
            "region": "Valais",
            "status": "active",
            "lastLogin": "2025-01-10T12:15:00Z",
            "createdAt": "2024-12-15T09:00:00Z",
            "permissions": ["deliveries:read"]
        },
        {
            "id": "user_3",
            "name": "Sophie Bernard",
            "email": "sophie.bernard@coop.ch",
            "role": "shop_manager",
            "shopName": "Coop Sion",
            "region": "Valais",
            "status": "pending",
            "lastLogin": "2025-01-09T16:45:00Z",
            "createdAt": "2025-01-05T14:00:00Z",
            "permissions": ["deliveries:read", "deliveries:write"]
        }
    ]

@router.get("/hq-admin/profile")
async def get_hq_admin_profile():
    """Récupère le profil HQ Admin"""
    return {
        "id": "hq_admin_1",
        "name": "Jean Dupont",
        "email": "jean.dupont@migros.ch",
        "role": "HQ Admin",
        "region": "Valais",
        "company": "Migros Valais",
        "phone": "+41 27 123 45 67",
        "lastLogin": "2025-01-10T15:30:00Z",
        "createdAt": "2024-11-01T09:00:00Z",
        "permissions": [
            "shops:read",
            "shops:write",
            "deliveries:read",
            "deliveries:write",
            "users:read",
            "users:write",
            "reports:read",
            "analytics:read"
        ],
        "preferences": {
            "language": "fr",
            "timezone": "Europe/Zurich",
            "notifications": True,
            "theme": "light"
        }
    }

@router.put("/hq-admin/profile")
async def update_hq_admin_profile(profile_data: dict):
    """Met à jour le profil HQ Admin"""
    # Simulation de la mise à jour
    return {
        "message": "Profil mis à jour avec succès",
        "profile": profile_data,
        "updated_at": "2025-01-10T16:00:00Z"
    }

@router.get("/shop/reports/{period}")
async def get_shop_reports(period: str):
    """Récupère les rapports pour un magasin selon la période"""
    # Simulation de données de rapport pour un magasin
    base_deliveries = 25
    base_revenue = 375.0
    
    if period == "week":
        deliveries = base_deliveries // 4
        revenue = base_revenue // 4
    elif period == "month":
        deliveries = base_deliveries
        revenue = base_revenue
    elif period == "quarter":
        deliveries = base_deliveries * 3
        revenue = base_revenue * 3
    elif period == "year":
        deliveries = base_deliveries * 12
        revenue = base_revenue * 12
    else:
        deliveries = base_deliveries
        revenue = base_revenue
    
    return {
        "period": period,
        "totalDeliveries": deliveries,
        "totalRevenue": revenue,
        "averageOrderValue": revenue / deliveries if deliveries > 0 else 0,
        "deliveriesByDay": [
            {"date": "2025-01-10", "deliveries": 3, "revenue": 45.0},
            {"date": "2025-01-09", "deliveries": 2, "revenue": 30.0},
            {"date": "2025-01-08", "deliveries": 4, "revenue": 60.0},
            {"date": "2025-01-07", "deliveries": 1, "revenue": 15.0},
            {"date": "2025-01-06", "deliveries": 3, "revenue": 45.0}
        ],
        "deliveriesByStatus": [
            {"status": "Livrées", "count": deliveries - 2, "percentage": ((deliveries - 2) / deliveries) * 100},
            {"status": "En cours", "count": 1, "percentage": (1 / deliveries) * 100},
            {"status": "Programmées", "count": 1, "percentage": (1 / deliveries) * 100}
        ],
        "topClients": [
            {"clientName": "Marie Dubois", "deliveries": 5, "revenue": 75.0},
            {"clientName": "Pierre Martin", "deliveries": 3, "revenue": 45.0},
            {"clientName": "Sophie Bernard", "deliveries": 2, "revenue": 30.0}
        ],
        "revenueByMonth": [
            {"month": "Janvier 2025", "deliveries": deliveries, "revenue": revenue},
            {"month": "Décembre 2024", "deliveries": deliveries - 2, "revenue": revenue - 30},
            {"month": "Novembre 2024", "deliveries": deliveries - 5, "revenue": revenue - 75}
        ]
    }

@router.get("/client/stats/{period}")
async def get_client_stats(period: str):
    """Récupère les statistiques pour un client selon la période"""
    # Simulation de données de statistiques pour un client
    base_deliveries = 15
    base_spent = 225.0
    
    if period == "week":
        deliveries = base_deliveries // 4
        spent = base_spent // 4
    elif period == "month":
        deliveries = base_deliveries
        spent = base_spent
    elif period == "quarter":
        deliveries = base_deliveries * 3
        spent = base_spent * 3
    elif period == "year":
        deliveries = base_deliveries * 12
        spent = base_spent * 12
    else:
        deliveries = base_deliveries
        spent = base_spent
    
    return {
        "period": period,
        "totalDeliveries": deliveries,
        "totalSpent": spent,
        "averageOrderValue": spent / deliveries if deliveries > 0 else 0,
        "deliveriesByMonth": [
            {"month": "Janvier 2025", "deliveries": deliveries, "spent": spent},
            {"month": "Décembre 2024", "deliveries": deliveries - 2, "spent": spent - 30},
            {"month": "Novembre 2024", "deliveries": deliveries - 5, "spent": spent - 75}
        ],
        "deliveriesByShop": [
            {"shopName": "Metropole Migros Sion", "deliveries": deliveries - 5, "spent": spent - 75, "percentage": 60.0},
            {"shopName": "Coop Sion", "deliveries": 3, "spent": 45, "percentage": 20.0},
            {"shopName": "Migros Martigny", "deliveries": 2, "spent": 30, "percentage": 13.3}
        ],
        "deliveriesByStatus": [
            {"status": "Livrées", "count": deliveries - 2, "percentage": ((deliveries - 2) / deliveries) * 100},
            {"status": "En cours", "count": 1, "percentage": (1 / deliveries) * 100},
            {"status": "Programmées", "count": 1, "percentage": (1 / deliveries) * 100}
        ],
        "spendingTrend": [
            {"period": "Semaine 1", "amount": spent // 4},
            {"period": "Semaine 2", "amount": spent // 4 + 15},
            {"period": "Semaine 3", "amount": spent // 4 - 10},
            {"period": "Semaine 4", "amount": spent // 4 + 5}
        ],
        "favoriteShop": {
            "name": "Metropole Migros Sion",
            "deliveries": deliveries - 5,
            "spent": spent - 75
        },
        "savings": {
            "total": 45.0,
            "description": "Économies grâce aux livraisons groupées et aux tarifs préférentiels"
        }
    }

@router.put("/client/deliveries/{delivery_id}")
async def update_client_delivery(delivery_id: str, delivery_data: dict):
    """Met à jour une livraison client"""
    # Simulation de la mise à jour d'une livraison
    return {
        "message": f"Livraison {delivery_id} mise à jour avec succès",
        "delivery": delivery_data,
        "updated_at": "2025-01-10T16:30:00Z"
    }

@router.put("/shop/deliveries/{delivery_id}")
async def update_shop_delivery(delivery_id: str, delivery_data: dict):
    """Met à jour une livraison magasin"""
    # Simulation de la mise à jour d'une livraison
    return {
        "message": f"Livraison {delivery_id} mise à jour avec succès",
        "delivery": delivery_data,
        "updated_at": "2025-01-10T16:30:00Z"
    }

@router.put("/hq-admin/deliveries/{delivery_id}")
async def update_hq_delivery(delivery_id: str, delivery_data: dict):
    """Met à jour une livraison HQ Admin"""
    # Simulation de la mise à jour d'une livraison
    return {
        "message": f"Livraison {delivery_id} mise à jour avec succès",
        "delivery": delivery_data,
        "updated_at": "2025-01-10T16:30:00Z"
    }

# Regional Admin endpoints
@router.get("/regional/deliveries")
async def get_regional_deliveries():
    """Récupère toutes les livraisons de la région"""
    return _HQ_DELIVERIES_DATA

@router.get("/regional/shops")
async def get_regional_shops():
    """Récupère tous les magasins de la région"""
    return _HQ_SHOPS_DATA

@router.get("/regional/stats")
async def get_regional_stats():
    """Test endpoint for regional admin statistics"""
    return {
        "totalShops": 3,
        "totalDeliveries": 105,
        "totalRevenue": 1575.0,
        "activeCouriers": 8,
        "thisWeekDeliveries": 25,
        "thisWeekRevenue": 375.0,
        "regions": [
            {
                "name": "Valais",
                "shops": 3,
                "deliveries": 105,
                "revenue": 1575.0
            }
        ]
    }

@router.put("/regional/deliveries/{delivery_id}")
async def update_regional_delivery(delivery_id: str, delivery_data: dict):
    """Met à jour une livraison Regional Admin"""
    # Simulation de la mise à jour d'une livraison
    return {
        "message": f"Livraison {delivery_id} mise à jour avec succès",
        "delivery": delivery_data,
        "updated_at": "2025-01-10T16:30:00Z"
    }

# Super Admin endpoints
@router.get("/super-admin/deliveries")
async def get_super_admin_deliveries():
    """Récupère toutes les livraisons pour Super Admin"""
    return _HQ_DELIVERIES_DATA

@router.get("/super-admin/shops")
async def get_super_admin_shops():
    """Récupère tous les magasins pour Super Admin"""
    return _HQ_SHOPS_DATA

@router.get("/super-admin/stats")
async def get_super_admin_stats():
    """Test endpoint for super admin statistics"""
    return {
        "totalUsers": 150,
        "totalShops": 25,
        "totalDeliveries": 2500,
        "totalRevenue": 37500.0,
        "activeRegions": 5,
        "systemHealth": "excellent",
        "alerts": [
            {
                "type": "info",
                "message": "Système opérationnel",
                "timestamp": "2025-01-10T16:30:00Z"
            }
        ]
    }

@router.get("/super-admin/users")
async def get_super_admin_users():
    """Récupère tous les utilisateurs pour Super Admin"""
    return [
        {
            "id": "user1",
            "email": "client1@example.com",
            "roles": ["client"],
            "createdAt": "2025-01-01T10:00:00Z",
            "lastLogin": "2025-01-10T14:30:00Z",
            "status": "active"
        },
        {
            "id": "user2",
            "email": "shop1@example.com",
            "roles": ["shop"],
            "shopId": "shop1",
            "createdAt": "2025-01-02T10:00:00Z",
            "lastLogin": "2025-01-10T15:00:00Z",
            "status": "active"
        },
        {
            "id": "user3",
            "email": "hq1@example.com",
            "roles": ["hq_admin"],
            "createdAt": "2025-01-03T10:00:00Z",
            "lastLogin": "2025-01-10T16:00:00Z",
            "status": "active"
        },
        {
            "id": "user4",
            "email": "regional1@example.com",
            "roles": ["regional_admin"],
            "createdAt": "2025-01-04T10:00:00Z",
            "lastLogin": "2025-01-10T17:00:00Z",
            "status": "active"
        },
        {
            "id": "user5",
            "email": "super@example.com",
            "roles": ["super_admin"],
            "createdAt": "2025-01-05T10:00:00Z",
            "lastLogin": "2025-01-10T18:00:00Z",
            "status": "active"
        }
    ]

@router.put("/super-admin/deliveries/{delivery_id}")
async def update_super_admin_delivery(delivery_id: str, delivery_data: dict):
    """Met à jour une livraison Super Admin"""
    # Simulation de la mise à jour d'une livraison
    return {
        "message": f"Livraison {delivery_id} mise à jour avec succès",
        "delivery": delivery_data,
        "updated_at": "2025-01-10T16:30:00Z"
    }

@router.get("/health")
async def health_check():
    """Simple health check"""
    return {"status": "ok", "message": "Test endpoints working"}
