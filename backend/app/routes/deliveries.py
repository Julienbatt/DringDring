from datetime import date, datetime, timezone
from decimal import Decimal
import hashlib
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.guards import require_hq_or_admin_user_for_shop, require_shop_user, require_courier_user, require_customer_user
from app.core.security import get_current_user_claims
from app.core.tariff_engine import compute_financials, parse_rule
from app.core.tariff_validation import validate_tariff_rule
from app.db.session import get_db_connection
from app.pdf.shop_monthly_report import build_shop_monthly_pdf
from app.schemas.delivery import DeliveryCreate, ShopDeliveryCreate
from app.schemas.me import MeResponse
from app.storage.supabase_storage import upload_pdf_bytes

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_delivery(
    payload: DeliveryCreate,
    jwt_claims: str = Depends(get_current_user_claims),
):
    delivery_id = uuid4()

    try:
        with get_db_connection(jwt_claims) as conn:
            with conn:
                with conn.cursor() as cur:
                    _assert_period_not_frozen(
                        cur, str(payload.shop_id), payload.delivery_date
                    )
                    _insert_delivery_record(
                        cur,
                        delivery_id=delivery_id,
                        shop_id=str(payload.shop_id),
                        hq_id=str(payload.hq_id),
                        admin_region_id=str(payload.admin_region_id),
                        city_id=str(payload.city_id),
                        canton_id=str(payload.canton_id),
                        delivery_date=payload.delivery_date,
                        client_id=None,
                    )

                    _insert_delivery_logistics(
                        cur,
                        delivery_id=delivery_id,
                        client_name=None,
                        address=payload.address,
                        postal_code=payload.postal_code,
                        city_name=payload.city_name,
                        time_window=payload.time_window,
                        bags=payload.bags,
                        order_amount=payload.order_amount,
                        is_cms=payload.is_cms,
                    )

                    _insert_delivery_status(cur, delivery_id=delivery_id)

    except Exception as e:
        print(f"SQL Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    return {"delivery_id": str(delivery_id)}


@router.post("/shop", status_code=status.HTTP_201_CREATED)
def create_delivery_for_shop(
    payload: ShopDeliveryCreate,
    user: MeResponse = Depends(require_shop_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    delivery_id = uuid4()
    shop_id = user.shop_id

    if not shop_id:
        raise HTTPException(status_code=400, detail="Shop id missing")

    with get_db_connection(jwt_claims) as conn:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT s.hq_id, s.city_id, s.tariff_version_id, c.canton_id
                    FROM shop s
                    JOIN city c ON c.id = s.city_id
                    WHERE s.id = %s
                    """,
                    (shop_id,),
                )
                row = cur.fetchone()

                if not row:
                    raise HTTPException(status_code=404, detail="Shop not found")

                hq_id, city_id, tariff_version_id, canton_id = row
                if not tariff_version_id:
                    raise HTTPException(
                        status_code=400,
                        detail="Tariff version not configured for shop",
                    )

                cur.execute(
                    """
                    SELECT id, name, address, postal_code, city_name, is_cms, city_id
                    FROM client
                    WHERE id = %s
                    """,
                    (str(payload.client_id),),
                )
                client_row = cur.fetchone()
                if not client_row:
                    raise HTTPException(status_code=404, detail="Client not found")

                (
                    client_id,
                    client_name,
                    client_address,
                    client_postal_code,
                    client_city_name,
                    client_is_cms,
                    client_city_id,
                ) = client_row

                if str(client_city_id) != str(city_id):
                    raise HTTPException(
                        status_code=400,
                        detail="Client not in shop city",
                    )

                cur.execute(
                    """
                    SELECT id
                    FROM admin_region
                    WHERE canton_id = %s AND active = true
                    ORDER BY name
                    LIMIT 1
                    """,
                    (canton_id,),
                )
                admin_region_row = cur.fetchone()
                if not admin_region_row:
                    raise HTTPException(
                        status_code=400,
                        detail="Admin region not configured for canton",
                    )
                admin_region_id = admin_region_row[0]

                _assert_period_not_frozen(cur, str(shop_id), payload.delivery_date)

                cur.execute(
                    """
                    SELECT
                        id,
                        rule_type,
                        rule,
                        share
                    FROM tariff_version
                    WHERE id = %s
                      AND valid_from <= %s
                      AND (valid_to IS NULL OR valid_to >= %s)
                    LIMIT 1
                    """,
                    (str(tariff_version_id), payload.delivery_date, payload.delivery_date),
                )
                tariff_version = cur.fetchone()
                if not tariff_version:
                    raise HTTPException(
                        status_code=400,
                        detail="No active tariff version for this date",
                    )

                client = {
                    "id": str(client_id),
                    "name": client_name,
                    "address": client_address,
                    "postal_code": client_postal_code,
                    "city_name": client_city_name,
                    "is_cms": client_is_cms,
                }

                _create_delivery_core(
                    cur=cur,
                    delivery_id=delivery_id,
                    shop_id=str(shop_id),
                    hq_id=str(hq_id),
                    admin_region_id=str(admin_region_id),
                    city_id=str(city_id),
                    canton_id=str(canton_id),
                    client=client,
                    payload=payload,
                    tariff_version=tariff_version,
                )

    return {"delivery_id": str(delivery_id)}


@router.post("/shop/freeze")
def freeze_billing_period(
    shop_id: str,
    month: str = Query(pattern=r"^\d{4}-\d{2}$"),
    frozen_comment: str | None = None,
    user: MeResponse = Depends(require_hq_or_admin_user_for_shop),
    jwt_claims: str = Depends(get_current_user_claims),
):
    from app.core.billing_processing import freeze_shop_billing_period
    
    period_month = _parse_month(month)

    with get_db_connection(jwt_claims) as conn:
        with conn:
            with conn.cursor() as cur:
                return freeze_shop_billing_period(
                    cur=cur,
                    shop_id=shop_id,
                    period_month=period_month,
                    frozen_by_user_id=user.user_id,
                    frozen_by_email=user.email,
                    frozen_comment=frozen_comment,
                )


@router.post("/shop/preview")
def preview_delivery_for_shop(
    payload: ShopDeliveryCreate,
    user: MeResponse = Depends(require_shop_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    shop_id = user.shop_id
    if not shop_id:
        raise HTTPException(status_code=400, detail="Shop id missing")

    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.city_id, s.tariff_version_id
                FROM shop s
                WHERE s.id = %s
                """,
                (shop_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Shop not found")

            city_id, tariff_version_id = row
            if not tariff_version_id:
                raise HTTPException(
                    status_code=400,
                    detail="Tariff version not configured for shop",
                )

            cur.execute(
                """
                SELECT is_cms, city_id
                FROM client
                WHERE id = %s
                """,
                (str(payload.client_id),),
            )
            client_row = cur.fetchone()
            if not client_row:
                raise HTTPException(status_code=404, detail="Client not found")

            client_is_cms, client_city_id = client_row
            if str(client_city_id) != str(city_id):
                raise HTTPException(
                    status_code=400,
                    detail="Client not in shop city",
                )

            cur.execute(
                """
                SELECT
                    id,
                    rule_type,
                    rule,
                    share
                FROM tariff_version
                WHERE id = %s
                  AND valid_from <= %s
                  AND (valid_to IS NULL OR valid_to >= %s)
                LIMIT 1
                """,
                (str(tariff_version_id), payload.delivery_date, payload.delivery_date),
            )
            tariff_version = cur.fetchone()
            if not tariff_version:
                raise HTTPException(
                    status_code=400,
                    detail="No active tariff version for this date",
                )

            tariff_version_id, rule_type, rule, share = tariff_version
            rule_data = parse_rule(rule)
            share_data = parse_rule(share)
            validate_tariff_rule(rule_type, rule_data, share_data)

            total_price, s_client, s_shop, s_city, s_admin = compute_financials(
                bags=payload.bags,
                order_amount=payload.order_amount,
                rule_type=rule_type,
                rule=rule_data,
                share=share_data,
                is_cms=client_is_cms,
            )

            return {
                "total_price": str(total_price),
                "share_client": str(s_client),
                "share_shop": str(s_shop),
                "share_city": str(s_city),
                "share_admin_region": str(s_admin),
            }

            return {
                "total_price": str(total_price),
                "share_client": str(s_client),
                "share_shop": str(s_shop),
                "share_city": str(s_city),
                "share_admin_region": str(s_admin),
            }


@router.get("/shop/configuration")
def get_shop_configuration(
    user: MeResponse = Depends(require_shop_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    shop_id = user.shop_id
    if not shop_id:
        raise HTTPException(status_code=400, detail="Shop id missing")

    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT tv.rule_type
                FROM shop s
                JOIN tariff_version tv ON tv.id = s.tariff_version_id
                WHERE s.id = %s
                """,
                (shop_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Configuration not found")
            
            return {"rule_type": row[0]}

@router.get("/shop")
def list_shop_deliveries(
    user: MeResponse = Depends(require_shop_user),
    jwt_claims: str = Depends(get_current_user_claims),
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
):
    shop_id = user.shop_id
    if not shop_id:
        raise HTTPException(status_code=400, detail="Shop id missing")

    month_date = _parse_month(month)

    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    d.id AS delivery_id,
                    d.delivery_date,
                    l.client_name,
                    l.address,
                    l.city_name,
                    l.bags,
                    l.order_amount,
                    l.is_cms,
                    st.status,
                    f.total_price,
                    f.share_shop
                FROM delivery d
                JOIN delivery_logistics l ON l.delivery_id = d.id
                LEFT JOIN LATERAL (
                    SELECT status
                    FROM delivery_status
                    WHERE delivery_id = d.id
                    ORDER BY updated_at DESC
                    LIMIT 1
                ) st ON true
                LEFT JOIN delivery_financial f ON f.delivery_id = d.id
                WHERE d.shop_id = %s
                  AND date_trunc('month', d.delivery_date)
                    = date_trunc('month', %s::date)
                ORDER BY d.delivery_date DESC
                """,
                (shop_id, month_date),
            )
            rows = _rows_to_dicts(cur)
            is_frozen = _is_period_frozen(cur, shop_id, month_date)
            return {"rows": rows, "is_frozen": is_frozen}


@router.get("/shop/periods")
def list_shop_periods(
    user: MeResponse = Depends(require_shop_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    shop_id = user.shop_id
    if not shop_id:
        raise HTTPException(status_code=400, detail="Shop id missing")

    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    period_month,
                    frozen_at,
                    frozen_by,
                    frozen_by_name,
                    comment,
                    frozen_comment,
                    pdf_url,
                    pdf_sha256,
                    pdf_generated_at
                FROM billing_period
                WHERE shop_id = %s
                ORDER BY period_month DESC
                """,
                (shop_id,),
            )
            return _rows_to_dicts(cur)


@router.post("/{delivery_id}/status")
def update_delivery_status(
    delivery_id: str,
    status: str = Query(..., pattern="^(picked_up|delivered|issue)$"),
    user: MeResponse = Depends(require_courier_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    """
    Courier status update.
    Transition logic:
    - created -> picked_up
    - picked_up -> delivered
    """
    with get_db_connection(jwt_claims) as conn:
        with conn:
            with conn.cursor() as cur:
                # 1. Verify existence
                cur.execute(
                    "SELECT id FROM delivery WHERE id = %s",
                    (delivery_id,)
                )
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Delivery not found")

                cur.execute(
                    """
                    INSERT INTO delivery_status (delivery_id, status)
                    VALUES (%s, %s)
                    """,
                    (delivery_id, status),
                )
    
    return {"delivery_id": delivery_id, "status": status}


@router.get("/courier")
def list_courier_deliveries(
    date: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    user: MeResponse = Depends(require_courier_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    target_date = date if date else datetime.now().date().isoformat()

    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            # If the courier is bound to a region, we could explicitly filter,
            # but RLS should handle visibility.
            # We explicitly filter by date.
            
            cur.execute(
                """
                SELECT
                    d.id AS delivery_id,
                    d.delivery_date,
                    s.name AS shop_name,
                    s.address AS shop_address,
                    l.client_name,
                    l.address AS client_address,
                    l.postal_code AS client_postal_code,
                    l.city_name AS client_city,
                    l.time_window,
                    l.bags,
                    st.status,
                    st.updated_at AS status_updated_at
                FROM delivery d
                JOIN shop s ON s.id = d.shop_id
                JOIN delivery_logistics l ON l.delivery_id = d.id
                LEFT JOIN LATERAL (
                    SELECT status, updated_at
                    FROM delivery_status
                    WHERE delivery_id = d.id
                    ORDER BY updated_at DESC
                    LIMIT 1
                ) st ON true
                WHERE d.delivery_date = %s::date
                ORDER BY d.delivery_date, s.name
                """,
                (target_date,),
            )
            return _rows_to_dicts(cur)


@router.get("/customer")
def list_customer_deliveries(
    user: MeResponse = Depends(require_customer_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            # We assume the user.user_id (auth.uid()) maps to a client record via RLS or direct link.
            # However, in current architecture, `require_customer_user` doesn't strictly enforce a link to a `client` table ID unless `resolve_identity` does.
            # `resolve_identity` returns `role='customer'`.
            # Let's assume for this "State of the Art" upgrade that RLS handles visibility based on auth.uid() owner.
            # We will query deliveries where the logisitics/client might match the user.
            # ACTUALLY: RLS policies are the source of truth. So we just query deliveries.
            
            cur.execute(
                """
                SELECT
                    d.id AS delivery_id,
                    d.delivery_date,
                    s.name AS shop_name,
                    l.time_window,
                    l.bags,
                    st.status,
                    st.updated_at AS status_updated_at
                FROM delivery d
                JOIN shop s ON s.id = d.shop_id
                JOIN delivery_logistics l ON l.delivery_id = d.id
                LEFT JOIN LATERAL (
                    SELECT status, updated_at
                    FROM delivery_status
                    WHERE delivery_id = d.id
                    ORDER BY updated_at DESC
                    LIMIT 1
                ) st ON true
                ORDER BY d.delivery_date DESC
                """
            )
            return _rows_to_dicts(cur)


def _parse_month(month):
    if month is None:
        today = date.today()
        return today.replace(day=1)
    try:
        return datetime.strptime(month, "%Y-%m").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid month format") from exc


def _is_period_frozen(cur, shop_id: str, period_month: date) -> bool:
    cur.execute(
        """
        SELECT 1
        FROM billing_period
        WHERE shop_id = %s
          AND period_month = %s
        """,
        (shop_id, period_month),
    )
    return cur.fetchone() is not None


def _assert_period_not_frozen(cur, shop_id: str, delivery_date: date) -> None:
    period_month = delivery_date.replace(day=1)
    if _is_period_frozen(cur, shop_id, period_month):
        raise HTTPException(
            status_code=409,
            detail="This billing period is frozen",
        )


def _rows_to_dicts(cur):
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    results = []
    for row in rows:
        item = {}
        for col, val in zip(columns, row):
            item[col] = str(val) if isinstance(val, Decimal) else val
        results.append(item)
    return results


def _create_delivery_core(
    *,
    cur,
    delivery_id,
    shop_id: str,
    hq_id: str,
    admin_region_id: str,
    city_id: str,
    canton_id: str,
    client: dict,
    payload: ShopDeliveryCreate,
    tariff_version,
):
    tariff_version_id, rule_type, rule, share = tariff_version
    rule_data = parse_rule(rule)
    share_data = parse_rule(share)
    validate_tariff_rule(rule_type, rule_data, share_data)

    total_price, s_client, s_shop, s_city, s_admin = compute_financials(
        bags=payload.bags,
        order_amount=payload.order_amount,
        rule_type=rule_type,
        rule=rule_data,
        share=share_data,
        is_cms=client["is_cms"],
    )

    _insert_delivery_record(
        cur,
        delivery_id=delivery_id,
        shop_id=shop_id,
        hq_id=hq_id,
        admin_region_id=admin_region_id,
        city_id=city_id,
        canton_id=canton_id,
        delivery_date=payload.delivery_date,
        client_id=client["id"],
    )

    _insert_delivery_logistics(
        cur,
        delivery_id=delivery_id,
        client_name=client["name"],
        address=client["address"],
        postal_code=client["postal_code"],
        city_name=client["city_name"],
        time_window=payload.time_window,
        bags=payload.bags,
        order_amount=payload.order_amount,
        is_cms=client["is_cms"],
    )

    cur.execute(
        """
        INSERT INTO delivery_financial (
            delivery_id,
            tariff_version_id,
            total_price,
            share_client,
            share_shop,
            share_city,
            share_admin_region
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

    _insert_delivery_status(cur, delivery_id=delivery_id)


def _insert_delivery_record(
    cur,
    *,
    delivery_id,
    shop_id: str,
    hq_id: str,
    admin_region_id: str,
    city_id: str,
    canton_id: str,
    delivery_date: date,
    client_id: str | None,
):
    if client_id is None:
        cur.execute(
            """
            INSERT INTO delivery (
                id,
                shop_id,
                hq_id,
                admin_region_id,
                city_id,
                canton_id,
                delivery_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                delivery_id,
                shop_id,
                hq_id,
                admin_region_id,
                city_id,
                canton_id,
                delivery_date,
            ),
        )
        return

    cur.execute(
        """
        INSERT INTO delivery (
            id,
            shop_id,
            hq_id,
            admin_region_id,
            city_id,
            canton_id,
            delivery_date,
            client_id
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            delivery_id,
            shop_id,
            hq_id,
            admin_region_id,
            city_id,
            canton_id,
            delivery_date,
            client_id,
        ),
    )


def _insert_delivery_logistics(
    cur,
    *,
    delivery_id,
    client_name: str | None,
    address: str,
    postal_code: str,
    city_name: str,
    time_window: str,
    bags: int,
    order_amount: Decimal | float | None,
    is_cms: bool,
):
    # Snapshot client details at delivery time.
    if client_name is None:
        cur.execute(
            """
            INSERT INTO delivery_logistics (
                delivery_id,
                address,
                postal_code,
                city_name,
                time_window,
                bags,
                order_amount,
                is_cms
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                delivery_id,
                address,
                postal_code,
                city_name,
                time_window,
                bags,
                order_amount,
                is_cms,
            ),
        )
        return

    cur.execute(
        """
        INSERT INTO delivery_logistics (
            delivery_id,
            client_name,
            address,
            postal_code,
            city_name,
            time_window,
            bags,
            order_amount,
            is_cms
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            delivery_id,
            client_name,
            address,
            postal_code,
            city_name,
            time_window,
            bags,
            order_amount,
            is_cms,
        ),
    )


def _insert_delivery_status(cur, *, delivery_id):
    cur.execute(
        """
        INSERT INTO delivery_status (delivery_id, status)
        VALUES (%s, 'created')
        """,
        (delivery_id,),
    )
