import csv
import os
import sys
from typing import List, Optional, Tuple

import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.config import settings  # noqa: E402


def decode_csv(path: str) -> str:
    with open(path, "rb") as handle:
        raw = handle.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    if "\ufffd" in text:
        text = raw.decode("latin-1")
    return text


def split_name(raw: str) -> Tuple[str, str]:
    parts = [chunk for chunk in raw.strip().split() if chunk]
    if not parts:
        return ("", "")
    if len(parts) == 1:
        return (parts[0], parts[0])
    last_name = parts[0]
    first_name = " ".join(parts[1:])
    return (first_name, last_name)


def clean_phone(raw: str) -> str:
    return raw.strip()


def clean_courier_number(raw: str) -> str:
    return raw.strip().lstrip("#")


def resolve_admin_region_id(conn: psycopg.Connection, admin_email: str) -> Optional[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT p.admin_region_id::text
            FROM auth.users u
            JOIN public.profiles p ON p.id = u.id
            WHERE lower(u.email) = lower(%s)
            """,
            (admin_email,),
        )
        row = cur.fetchone()
        return row[0] if row else None


def fallback_admin_region_id(conn: psycopg.Connection, name: str) -> Optional[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT id::text FROM admin_region WHERE name = %s", (name,))
        row = cur.fetchone()
        return row[0] if row else None


def has_vehicle_type(conn: psycopg.Connection) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'courier'
              AND column_name = 'vehicle_type'
            """
        )
        return cur.fetchone() is not None


def parse_rows(text: str) -> List[Tuple[str, str, str, str]]:
    reader = csv.reader(text.splitlines())
    rows = []
    for idx, row in enumerate(reader):
        if idx == 0:
            continue
        if not row or len(row) < 4:
            continue
        name, phone, email, courier_number = row[0], row[1], row[2], row[3]
        if not name.strip() or not courier_number.strip():
            continue
        rows.append((name, phone, email, courier_number))
    return rows


def main() -> None:
    csv_path = os.path.join("docs", "Import_Coursiers.csv")
    admin_email = "admin_sion@dringdring.ch"

    if not settings.DATABASE_URL:
        print("Missing DATABASE_URL in backend/.env")
        sys.exit(1)

    text = decode_csv(csv_path)
    rows = parse_rows(text)
    if not rows:
        print("No couriers found in CSV.")
        return

    with psycopg.connect(settings.DATABASE_URL) as conn:
        admin_region_id = resolve_admin_region_id(conn, admin_email)
        if not admin_region_id:
            admin_region_id = fallback_admin_region_id(conn, "Velocite Valais")
        if not admin_region_id:
            print("Could not resolve admin_region_id.")
            sys.exit(1)

        vehicle_type_available = has_vehicle_type(conn)

        created = 0
        updated = 0
        skipped = 0

        with conn.cursor() as cur:
            for raw_name, raw_phone, raw_email, raw_number in rows:
                first_name, last_name = split_name(raw_name)
                courier_number = clean_courier_number(raw_number)
                phone_number = clean_phone(raw_phone)
                email = raw_email.strip() or None
                if not courier_number:
                    skipped += 1
                    continue

                if vehicle_type_available:
                    cur.execute(
                        """
                        INSERT INTO courier (
                            id, first_name, last_name, courier_number, phone_number, email, active,
                            vehicle_type, admin_region_id
                        )
                        VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, true, %s, %s)
                        ON CONFLICT (courier_number) DO UPDATE SET
                            first_name = EXCLUDED.first_name,
                            last_name = EXCLUDED.last_name,
                            phone_number = EXCLUDED.phone_number,
                            email = EXCLUDED.email,
                            active = EXCLUDED.active,
                            vehicle_type = EXCLUDED.vehicle_type,
                            admin_region_id = EXCLUDED.admin_region_id
                        RETURNING (xmax = 0) AS inserted
                        """,
                        (
                            first_name,
                            last_name,
                            courier_number,
                            phone_number,
                            email,
                            "bike",
                            admin_region_id,
                        ),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO courier (
                            id, first_name, last_name, courier_number, phone_number, email, active,
                            admin_region_id
                        )
                        VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, true, %s)
                        ON CONFLICT (courier_number) DO UPDATE SET
                            first_name = EXCLUDED.first_name,
                            last_name = EXCLUDED.last_name,
                            phone_number = EXCLUDED.phone_number,
                            email = EXCLUDED.email,
                            active = EXCLUDED.active,
                            admin_region_id = EXCLUDED.admin_region_id
                        RETURNING (xmax = 0) AS inserted
                        """,
                        (
                            first_name,
                            last_name,
                            courier_number,
                            phone_number,
                            email,
                            admin_region_id,
                        ),
                    )

                inserted = cur.fetchone()[0]
                if inserted:
                    created += 1
                else:
                    updated += 1

            conn.commit()

    print(f"Couriers processed: {len(rows)}")
    print(f"Created: {created}")
    print(f"Updated: {updated}")
    print(f"Skipped: {skipped}")


if __name__ == "__main__":
    main()
