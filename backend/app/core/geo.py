import math
from typing import Optional, Tuple

import httpx
from urllib.parse import quote

from app.core.config import settings


def swiss_to_wgs84(easting: float, northing: float) -> Tuple[float, float]:
    # Swisstopo coordinates can be LV03 or LV95. Detect by magnitude.
    if easting < 1000000.0:
        y = (easting - 600000.0) / 1000000.0
        x = (northing - 200000.0) / 1000000.0
    else:
        y = (easting - 2600000.0) / 1000000.0
        x = (northing - 1200000.0) / 1000000.0

    lon = (
        2.6779094
        + 4.728982 * y
        + 0.791484 * y * x
        + 0.1306 * y * x * x
        - 0.0436 * y * y * y
    )
    lat = (
        16.9023892
        + 3.238272 * x
        - 0.270978 * y * y
        - 0.002528 * x * x
        - 0.0447 * y * y * x
        - 0.0140 * x * x * x
    )

    lon = lon * 100.0 / 36.0
    lat = lat * 100.0 / 36.0
    return lat, lon


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return radius_km * c


def route_distance_km(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
) -> Optional[float]:
    url = (
        f"{settings.OSRM_BASE_URL}/route/v1/driving/"
        f"{start_lng},{start_lat};{end_lng},{end_lat}"
        "?overview=false"
    )
    try:
        response = httpx.get(url, timeout=settings.OSRM_TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()
        routes = data.get("routes") or []
        if not routes:
            return None
        meters = routes[0].get("distance")
        if meters is None:
            return None
        return float(meters) / 1000.0
    except Exception:
        return None


def compute_distance_km(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
) -> float:
    distance = route_distance_km(start_lat, start_lng, end_lat, end_lng)
    if distance is None:
        distance = _haversine_km(start_lat, start_lng, end_lat, end_lng)
    return distance


def compute_co2_saved_kg(distance_km: float) -> float:
    return distance_km * (settings.CO2_G_PER_KM / 1000.0)


def geocode_swiss_address(query: str) -> Optional[Tuple[float, float]]:
    url = (
        "https://api3.geo.admin.ch/rest/services/ech/SearchServer"
        f"?type=locations&origins=address&searchText={quote(query)}"
    )
    try:
        response = httpx.get(url, timeout=settings.OSRM_TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()
        results = data.get("results") or []
        if not results:
            return None
        attrs = results[0].get("attrs") or {}
        easting = attrs.get("y")
        northing = attrs.get("x")
        if easting is None or northing is None:
            return None
        return swiss_to_wgs84(float(easting), float(northing))
    except Exception:
        return None
