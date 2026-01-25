import csv
import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

CSV_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'docs', 'clients_Sion.csv')
DEFAULT_CITY_NAME = 'Sion'


def _clean(value):
    if value is None:
        return None
    val = str(value).strip()
    if val in ('', '-', '–', '—'):
        return None
    return val


def import_clients():
    print("Connecting to DB...")
    try:
        # Pooler endpoints can reject server-side prepared statements.
        conn = psycopg.connect(settings.DATABASE_URL, autocommit=True, prepare_threshold=0)
        with conn.cursor() as cur:
            # 0. Clean table for fresh import (DEV ONLY)
            print("Cleaning table 'client'...")
            cur.execute("TRUNCATE TABLE client CASCADE")

            # 1. Ensure City Exists
            cur.execute("SELECT id FROM city WHERE name = %s", (DEFAULT_CITY_NAME,))
            row = cur.fetchone()
            if not row:
                print(f"City '{DEFAULT_CITY_NAME}' not found. Check previous logs.")
                cur.execute("SELECT id FROM city LIMIT 1")
                row = cur.fetchone()
                if not row:
                    print("No city found at all.")
                    return
            default_city_id = row[0]
            print(f"Using default City ID: {default_city_id}")

            # 2. Read CSV with encoding fallback
            encodings = ['utf-8', 'latin-1', 'cp1252']
            rows = []

            for enc in encodings:
                try:
                    print(f"Trying encoding: {enc}")
                    with open(CSV_FILE, 'r', encoding=enc) as f:
                        reader = csv.DictReader(f)
                        rows = list(reader)
                    print(f"Successfully read {len(rows)} rows with {enc}")
                    break
                except UnicodeDecodeError:
                    print(f"Failed with {enc}")
                    continue
                except Exception as e:
                    print(f"Error reading with {enc}: {e}")
                    continue

            if not rows:
                print("Could not read CSV.")
                return

            print(f"Importing {len(rows)} clients...")
            count = 0
            for row in rows:
                try:
                    name = _clean(row.get('Nom Complet'))
                    if not name:
                        continue

                    addr_1 = _clean(row.get('Adresse 1'))
                    num_1 = _clean(row.get('NumAcro 1'))
                    address = " ".join([part for part in [addr_1, num_1] if part]).strip()

                    etage = _clean(row.get('Etage 1'))
                    code_entree = _clean(row.get('Code entrAce'))
                    tel = _clean(row.get('TAcl'))

                    postal_code = _clean(row.get('NPA 1')) or ''
                    city_text = _clean(row.get('Lieu 1')) or DEFAULT_CITY_NAME

                    cms_val = str(row.get('CMS', '')).lower().strip()
                    is_cms = (cms_val in ['oui', 'yes', 'true', '1'])

                    cur.execute("SELECT id FROM city WHERE name = %s", (city_text,))
                    city_lookup = cur.fetchone()
                    city_id_to_use = city_lookup[0] if city_lookup else default_city_id

                    cur.execute(
                        """
                        INSERT INTO client (
                            name, address, postal_code, city_name, city_id, is_cms,
                            floor, door_code, phone, active
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, true)
                        """,
                        (
                            name,
                            address,
                            postal_code,
                            city_text,
                            city_id_to_use,
                            is_cms,
                            etage,
                            code_entree,
                            tel,
                        ),
                    )
                    count += 1
                except Exception as row_err:
                    print(f"Failed to insert row {count}: {row_err} - Data: {row}")

            print(f"Done. Imported {count} clients.")

    except Exception as e:
        print(f"Global Error: {e}")


if __name__ == "__main__":
    import_clients()
