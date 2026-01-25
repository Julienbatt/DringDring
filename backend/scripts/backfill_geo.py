import os
import re
import time
from typing import Optional

import psycopg

from app.core.config import settings
from app.core.geo import compute_co2_saved_kg, compute_distance_km, geocode_swiss_address


SLEEP_SECONDS = float(os.getenv("BACKFILL_SLEEP_SECONDS", "0.2"))
LIMIT = int(os.getenv("BACKFILL_LIMIT", "0")) or None
DELIVERY_LIMIT = int(os.getenv("BACKFILL_DELIVERY_LIMIT", "0")) or None
FORCE = os.getenv("BACKFILL_FORCE", "0") == "1"
BATCH_SIZE = int(os.getenv("BACKFILL_BATCH_SIZE", "10"))


def _clean_address(address: Optional[str]) -> Optional[str]:
    if not address:
        return None
    cleaned = address.strip()
    cleaned = re.split(r",?\s*(Etage|Étage|Code|Digicode|T[eé]l|Téléphone)\b", cleaned, maxsplit=1)[0]
    return cleaned.strip(" ,")


def _format_address(
    address: Optional[str], postal_code: Optional[str], city_name: Optional[str]
) -> Optional[str]:
    cleaned = _clean_address(address)
    if not cleaned:
        return None
    parts = [cleaned]
    tail = " ".join(part for part in [postal_code, city_name] if part)
    if tail:
        parts.append(tail.strip())
    return ", ".join(part for part in parts if part)


def _sleep():
    if SLEEP_SECONDS > 0:
        time.sleep(SLEEP_SECONDS)


def _is_swiss_lat_lng(lat: Optional[float], lng: Optional[float]) -> bool:
    if lat is None or lng is None:
        return False
    return 45.5 <= lat <= 48.5 and 5.5 <= lng <= 11.5


def backfill_shops(cur, conn) -> int:
    query = """
        SELECT id, address, lat, lng
        FROM shop
        WHERE address IS NOT NULL
    """
    if not FORCE:
        query += " AND (lat IS NULL OR lng IS NULL OR lat < 45.5 OR lat > 48.5 OR lng < 5.5 OR lng > 11.5)"
    if LIMIT:
        query += " LIMIT %s"
        cur.execute(query, (LIMIT,))
    else:
        cur.execute(query)
    rows = cur.fetchall()
    updated = 0
    for idx, (shop_id, address, lat, lng) in enumerate(rows, start=1):
        if not FORCE and _is_swiss_lat_lng(lat, lng):
            continue

        coords = geocode_swiss_address(_clean_address(address))
        if not coords:
            continue
        lat, lng = coords
        cur.execute(
            "UPDATE shop SET lat = %s, lng = %s WHERE id = %s",
            (lat, lng, shop_id),
        )
        updated += 1
        if updated % BATCH_SIZE == 0:
            conn.commit()
        _sleep()
    return updated


def backfill_clients(cur, conn) -> int:
    query = """
        SELECT id, address, postal_code, city_name, lat, lng
        FROM client
        WHERE address IS NOT NULL
    """
    if not FORCE:
        query += " AND (lat IS NULL OR lng IS NULL OR lat < 45.5 OR lat > 48.5 OR lng < 5.5 OR lng > 11.5)"
    if LIMIT:
        query += " LIMIT %s"
        cur.execute(query, (LIMIT,))
    else:
        cur.execute(query)
    rows = cur.fetchall()
    updated = 0
    for idx, (client_id, address, postal_code, city_name, lat, lng) in enumerate(rows, start=1):
        if not FORCE and _is_swiss_lat_lng(lat, lng):
            continue
        query_addr = _format_address(address, postal_code, city_name)
        coords = geocode_swiss_address(query_addr) if query_addr else None
        if not coords:
            continue
        lat, lng = coords
        cur.execute(
            "UPDATE client SET lat = %s, lng = %s WHERE id = %s",
            (lat, lng, client_id),
        )
        updated += 1
        if updated % BATCH_SIZE == 0:
            conn.commit()
        _sleep()
    return updated


def backfill_deliveries(cur, conn) -> int:
    query = """
        SELECT
            d.id,
            s.lat AS shop_lat,
            s.lng AS shop_lng,
            c.lat AS client_lat,
            c.lng AS client_lng,
            l.address AS delivery_address,
            l.postal_code AS delivery_postal_code,
            l.city_name AS delivery_city_name
        FROM delivery d
        JOIN shop s ON s.id = d.shop_id
        LEFT JOIN client c ON c.id = d.client_id
        JOIN delivery_logistics l ON l.delivery_id = d.id
        WHERE (d.distance_km IS NULL OR d.co2_saved_kg IS NULL)
    """
    if DELIVERY_LIMIT:
        query += " LIMIT %s"
        cur.execute(query, (DELIVERY_LIMIT,))
    else:
        cur.execute(query)
    rows = cur.fetchall()
    updated = 0
    for idx, (
        delivery_id,
        shop_lat,
        shop_lng,
        client_lat,
        client_lng,
        delivery_address,
        delivery_postal_code,
        delivery_city_name,
    ) in enumerate(rows, start=1):
        if shop_lat is None or shop_lng is None:
            continue

        if client_lat is None or client_lng is None:
            query_addr = _format_address(delivery_address, delivery_postal_code, delivery_city_name)
            coords = geocode_swiss_address(query_addr) if query_addr else None
            if not coords:
                continue
            client_lat, client_lng = coords

        distance_km = compute_distance_km(shop_lat, shop_lng, client_lat, client_lng)
        distance_km *= settings.RETURN_TRIP_MULTIPLIER
        co2_saved_kg = compute_co2_saved_kg(distance_km)

        cur.execute(
            """
            UPDATE delivery
            SET distance_km = %s,
                co2_saved_kg = %s
            WHERE id = %s
            """,
            (distance_km, co2_saved_kg, delivery_id),
        )
        updated += 1
        if updated % BATCH_SIZE == 0:
            conn.commit()
        _sleep()
    return updated


def main() -> None:
    print("Backfill geo: connecting...")
    with psycopg.connect(settings.DATABASE_URL, cursor_factory=psycopg.ClientCursor) as conn:
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = '0'")
            shops_updated = backfill_shops(cur, conn)
            clients_updated = backfill_clients(cur, conn)
            deliveries_updated = backfill_deliveries(cur, conn)
        conn.commit()

    print(
        f"Backfill done. shops: {shops_updated}, clients: {clients_updated}, deliveries: {deliveries_updated}"
    )


if __name__ == "__main__":
    main()
