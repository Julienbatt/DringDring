import argparse
import datetime as dt
import random
import string
from uuid import uuid4

import psycopg

from app.core.config import settings
from app.core.tariff_engine import compute_financials, parse_rule


TIME_WINDOWS = ["08:00-12:00", "12:00-16:00", "16:00-20:00"]


def month_range(month: str):
    start = dt.datetime.strptime(month, "%Y-%m").date().replace(day=1)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def get_default_month() -> str:
    today = dt.date.today()
    prev_month = today.replace(day=1) - dt.timedelta(days=1)
    return prev_month.strftime("%Y-%m")


def random_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(3))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--month", default=get_default_month(), help="YYYY-MM")
    parser.add_argument("--per-shop", type=int, default=8, help="Deliveries per shop")
    parser.add_argument("--seed-tag", default="seed:velocite_sion", help="Notes tag")
    args = parser.parse_args()

    month_start, month_end = month_range(args.month)

    with psycopg.connect(settings.DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, admin_region_id
                FROM city
                WHERE lower(name) = lower(%s)
                LIMIT 1
                """,
                ("Sion",),
            )
            city_row = cur.fetchone()
            if not city_row:
                raise SystemExit("City 'Sion' not found.")
            city_id, admin_region_id = city_row

            cur.execute(
                """
                SELECT id, name, address, postal_code, city_name, is_cms
                FROM client
                WHERE city_id = %s AND active = true
                """,
                (city_id,),
            )
            clients = cur.fetchall()
            if not clients:
                raise SystemExit("No active clients found for city Sion.")

            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'delivery_logistics'
                """
            )
            logistics_cols = {row[0] for row in cur.fetchall()}
            has_notes = "notes" in logistics_cols
            has_short_code = "short_code" in logistics_cols

            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'shop'
                """
            )
            shop_cols = {row[0] for row in cur.fetchall()}
            shop_select = ["id", "name", "hq_id", "city_id", "tariff_version_id"]
            if "canton_id" in shop_cols:
                shop_select.append("canton_id")

            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'delivery'
                """
            )
            delivery_cols = {row[0] for row in cur.fetchall()}
            has_delivery_canton = "canton_id" in delivery_cols

            cur.execute(
                f"""
                SELECT {", ".join(shop_select)}
                FROM shop
                WHERE city_id = %s
                ORDER BY name
                """,
                (city_id,),
            )
            shops = cur.fetchall()
            if not shops:
                raise SystemExit("No shops found for city Sion.")

            total_inserted = 0
            for shop_row in shops:
                shop_id = shop_row[0]
                shop_name = shop_row[1]
                hq_id = shop_row[2]
                _city_id = shop_row[3]
                tariff_version_id = shop_row[4]
                canton_id = shop_row[5] if len(shop_row) > 5 else None
                if not tariff_version_id:
                    print(f"Skip {shop_name}: no tariff_version_id")
                    continue

                cur.execute(
                    """
                    SELECT id, rule_type, rule, share
                    FROM tariff_version
                    WHERE id = %s
                    """,
                    (tariff_version_id,),
                )
                tariff_row = cur.fetchone()
                if not tariff_row:
                    print(f"Skip {shop_name}: tariff version not found")
                    continue

                _, rule_type, rule, share = tariff_row
                rule_data = parse_rule(rule)
                share_data = parse_rule(share)

                for _ in range(args.per_shop):
                    client_id, client_name, client_address, client_postal, client_city, client_is_cms = random.choice(clients)
                    delivery_date = month_start + dt.timedelta(days=random.randint(0, (month_end - month_start).days - 1))
                    bags = random.randint(1, 6)
                    order_amount = None
                    if rule_type == "order_amount":
                        order_amount = round(random.uniform(25, 160), 2)

                    total_price, s_client, s_shop, s_city, s_admin = compute_financials(
                        rule_type=rule_type,
                        rule=rule_data,
                        share=share_data,
                        bags=bags,
                        order_amount=order_amount,
                        is_cms=client_is_cms,
                    )

                    delivery_id = uuid4()

                    delivery_fields = [
                        "id",
                        "shop_id",
                        "hq_id",
                        "admin_region_id",
                        "city_id",
                        "delivery_date",
                        "client_id",
                    ]
                    delivery_values = [
                        delivery_id,
                        shop_id,
                        hq_id,
                        admin_region_id,
                        city_id,
                        delivery_date,
                        client_id,
                    ]
                    if has_delivery_canton:
                        delivery_fields.append("canton_id")
                        delivery_values.append(canton_id)

                    cur.execute(
                        f"""
                        INSERT INTO delivery (
                            {", ".join(delivery_fields)}
                        ) VALUES (
                            {", ".join(["%s"] * len(delivery_fields))}
                        )
                        """,
                        delivery_values,
                    )

                    logistics_fields = [
                        "delivery_id",
                        "client_name",
                        "address",
                        "postal_code",
                        "city_name",
                        "time_window",
                        "bags",
                        "order_amount",
                        "is_cms",
                    ]
                    logistics_values = [
                        delivery_id,
                        client_name,
                        client_address,
                        client_postal,
                        client_city,
                        random.choice(TIME_WINDOWS),
                        bags,
                        order_amount,
                        client_is_cms,
                    ]
                    if has_notes:
                        logistics_fields.append("notes")
                        logistics_values.append(args.seed_tag)
                    if has_short_code:
                        logistics_fields.append("short_code")
                        logistics_values.append(random_code())

                    cur.execute(
                        f"""
                        INSERT INTO delivery_logistics (
                            {", ".join(logistics_fields)}
                        ) VALUES (
                            {", ".join(["%s"] * len(logistics_fields))}
                        )
                        """,
                        logistics_values,
                    )

                    cur.execute(
                        """
                        INSERT INTO delivery_financial (
                            delivery_id, tariff_version_id, total_price, share_client, share_shop, share_city, share_admin_region
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            delivery_id,
                            tariff_version_id,
                            total_price,
                            s_client,
                            s_shop,
                            s_city,
                            s_admin,
                        ),
                    )

                    cur.execute(
                        """
                        INSERT INTO delivery_status (delivery_id, status)
                        VALUES (%s, 'created')
                        """,
                        (delivery_id,),
                    )

                    total_inserted += 1

            print(
                f"Seed complete for {args.month}: {total_inserted} deliveries created "
                f"across {len(shops)} shop(s)."
            )


if __name__ == "__main__":
    main()
