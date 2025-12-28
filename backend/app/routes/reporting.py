import csv
import io
import zipfile
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse

from app.core.guards import require_city_user, require_hq_or_admin_user, require_hq_user
from app.core.identity import resolve_identity
from app.core.security import get_current_user, get_current_user_claims
from app.db.session import get_db_connection
from app.pdf.city_monthly_report import build_city_monthly_pdf
from app.pdf.hq_monthly_report import build_hq_monthly_pdf
from app.pdf.shop_monthly_report import build_shop_monthly_pdf
from app.schemas.me import MeResponse
from app.storage.supabase_storage import download_pdf_bytes


router = APIRouter(prefix="/reports", tags=["reporting"])


@router.get("/city-billing")
def get_city_billing(
    user: MeResponse = Depends(require_city_user),
    jwt_claims: str = Depends(get_current_user_claims),
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
):
    """
    Returns monthly billing data.
    RLS applies territorial filtering automatically.
    PostgreSQL numeric fields are converted explicitly
    to ensure reliable JSON serialization.
    """
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            month_date = _parse_month(month)
            cur.execute(
                """
                SELECT * FROM view_city_billing
                WHERE date_trunc('month', billing_month) = date_trunc('month', %s::date)
                """,
                (month_date,),
            )
            return _rows_to_dicts(cur)


@router.get("/city-billing-shops")
def get_city_billing_shops(
    user: MeResponse = Depends(require_city_user),
    jwt_claims: str = Depends(get_current_user_claims),
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
):
    """
    Returns monthly billing data split by shop.
    RLS applies territorial filtering automatically.
    """
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            month_date = _parse_month(month)
            cur.execute(
                """
                SELECT * FROM view_city_billing_shops
                WHERE date_trunc('month', billing_month) = date_trunc('month', %s::date)
                """,
                (month_date,),
            )
            return _rows_to_dicts(cur)


@router.get("/hq-billing")
def get_hq_billing(
    user: MeResponse = Depends(require_hq_or_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
    month: str = Query(pattern=r"^\d{4}-\d{2}$"),
):
    """
    HQ official billing status by shop for a single month.
    """
    month_date = _parse_month(month)

    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH period AS (
                    SELECT date_trunc('month', %s::date)::date AS month
                )
                SELECT
                    s.id AS shop_id,
                    s.name AS shop_name,
                    c.name AS city_name,
                    COUNT(d.id) AS total_deliveries,
                    COALESCE(SUM(l.bags), 0) AS total_bags,
                    COALESCE(SUM(f.total_price), 0) AS total_amount,
                    bp.id IS NOT NULL AS is_frozen,
                    bp.frozen_at,
                    bp.frozen_by,
                    COALESCE(bp.frozen_by_name, u.email) AS frozen_by_email,
                    bp.pdf_url,
                    bp.pdf_sha256
                FROM shop s
                JOIN city c ON c.id = s.city_id
                LEFT JOIN delivery d
                  ON d.shop_id = s.id
                 AND date_trunc('month', d.delivery_date) = (SELECT month FROM period)
                LEFT JOIN delivery_logistics l ON l.delivery_id = d.id
                LEFT JOIN delivery_financial f ON f.delivery_id = d.id
                LEFT JOIN billing_period bp
                  ON bp.shop_id = s.id
                 AND bp.period_month = (SELECT month FROM period)
                LEFT JOIN auth.users u ON u.id = bp.frozen_by
                GROUP BY
                    s.id,
                    s.name,
                    c.name,
                    bp.id,
                    bp.frozen_at,
                    bp.frozen_by,
                    bp.frozen_by_name,
                    u.email,
                    bp.pdf_url,
                    bp.pdf_sha256
                ORDER BY c.name, s.name
                """,
                (month_date,),
            )
            rows = _rows_to_dicts(cur)

    for row in rows:
        frozen_by_id = row.pop("frozen_by", None)
        frozen_by_email = row.pop("frozen_by_email", None)
        row["frozen_by"] = (
            {"id": frozen_by_id, "email": frozen_by_email}
            if row.get("is_frozen")
            else None
        )

    return {"month": month, "rows": rows}


@router.get("/hq-billing-shops")
def get_hq_billing_shops(
    user: MeResponse = Depends(require_hq_user),
    jwt_claims: str = Depends(get_current_user_claims),
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
):
    """
    HQ aggregated billing, grouped by shop.
    RLS enforces hq_id filtering.
    """
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            month_date = _parse_month(month)
            cur.execute(
                """
                SELECT * FROM view_hq_billing_shops
                WHERE date_trunc('month', billing_month) = date_trunc('month', %s::date)
                """,
                (month_date,),
            )
            return _rows_to_dicts(cur)


@router.get("/shop-monthly-pdf")
def get_shop_monthly_pdf(
    shop_id: str,
    month: str = Query(pattern=r"^\d{4}-\d{2}$"),
    user: MeResponse = Depends(require_hq_or_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    period_month = _parse_month(month)

    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    bp.frozen_at,
                    bp.frozen_by,
                    COALESCE(bp.frozen_by_name, u.email)
                FROM billing_period bp
                LEFT JOIN auth.users u ON u.id = bp.frozen_by
                WHERE bp.shop_id = %s
                  AND bp.period_month = %s
                """,
                (shop_id, period_month),
            )
            frozen = cur.fetchone()
            if not frozen:
                raise HTTPException(
                    status_code=409,
                    detail="Billing period not frozen",
                )
            frozen_at, frozen_by, frozen_by_name = frozen

            cur.execute(
                """
                SELECT s.name, c.name, h.name
                FROM shop s
                JOIN city c ON c.id = s.city_id
                LEFT JOIN hq h ON h.id = s.hq_id
                WHERE s.id = %s
                """,
                (shop_id,),
            )
            shop_row = cur.fetchone()
            if not shop_row:
                raise HTTPException(status_code=404, detail="Shop not found")
            shop_name, shop_city, hq_name = shop_row

            cur.execute(
                """
                SELECT
                    d.delivery_date,
                    l.client_name,
                    l.city_name,
                    l.bags,
                    f.total_price,
                    f.share_shop,
                    f.share_city
                FROM delivery d
                JOIN delivery_logistics l ON l.delivery_id = d.id
                JOIN delivery_financial f ON f.delivery_id = d.id
                WHERE d.shop_id = %s
                  AND date_trunc('month', d.delivery_date) = %s::date
                ORDER BY d.delivery_date
                """,
                (shop_id, period_month),
            )
            deliveries = cur.fetchall()

    if not deliveries:
        raise HTTPException(status_code=404, detail="No deliveries for this period")

    pdf_buffer = build_shop_monthly_pdf(
        shop_name=shop_name,
        shop_city=shop_city,
        hq_name=hq_name,
        period_month=period_month,
        frozen_at=frozen_at,
        frozen_by=frozen_by,
        frozen_by_name=frozen_by_name,
        deliveries=deliveries,
    )

    safe_shop = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in shop_name)
    filename = f"DringDring_Shop_{safe_shop}_{month}_FROZEN.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/hq-monthly-pdf")
def get_hq_monthly_pdf(
    month: str = Query(pattern=r"^\d{4}-\d{2}$"),
    user: MeResponse = Depends(require_hq_or_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    period_month = _parse_month(month)

    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    hq_name,
                    shop_id,
                    shop_name,
                    city_name,
                    total_deliveries,
                    total_subvention_due,
                    total_volume_chf,
                    is_frozen
                FROM view_hq_billing_shops
                WHERE date_trunc('month', billing_month) = date_trunc('month', %s::date)
                ORDER BY shop_name
                """,
                (period_month,),
            )
            rows = cur.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No data for this period")

    if any(not row[7] for row in rows):
        raise HTTPException(
            status_code=409,
            detail="One or more shops are not frozen for this period",
        )

    hq_name = rows[0][0] or "Groupe HQ"

    pdf_buffer = build_hq_monthly_pdf(
        hq_name=hq_name,
        period_month=period_month,
        rows=rows,
    )

    safe_hq = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in hq_name)
    filename = f"DringDring_HQ_{safe_hq}_{month}_FROZEN.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/city-monthly-pdf")
def get_city_monthly_pdf(
    city_id: str,
    month: str = Query(pattern=r"^\d{4}-\d{2}$"),
    user=Depends(get_current_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    identity = resolve_identity(
        user_id=user.user_id,
        email=user.email,
        jwt_claims=jwt_claims,
    )
    if identity.role == "city":
        if not identity.city_id or str(identity.city_id) != str(city_id):
            raise HTTPException(
                status_code=403,
                detail="City access required",
            )
    elif identity.role not in {"hq", "admin_region", "super_admin"}:
        raise HTTPException(
            status_code=403,
            detail="City access required",
        )

    period_month = _parse_month(month)

    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            _assert_city_period_fully_frozen(cur, city_id, period_month)

            cur.execute(
                """
                SELECT name
                FROM city
                WHERE id = %s
                """,
                (city_id,),
            )
            city_row = cur.fetchone()
            if not city_row:
                raise HTTPException(status_code=404, detail="City not found")
            city_name = city_row[0]

            cur.execute(
                """
                SELECT
                    s.id AS shop_id,
                    s.name AS shop_name,
                    d.delivery_date,
                    l.client_name,
                    l.city_name,
                    l.bags,
                    f.total_price,
                    f.share_city,
                    f.share_shop
                FROM delivery d
                JOIN shop s ON s.id = d.shop_id
                JOIN delivery_logistics l ON l.delivery_id = d.id
                JOIN delivery_financial f ON f.delivery_id = d.id
                WHERE s.city_id = %s
                  AND date_trunc('month', d.delivery_date) = %s::date
                ORDER BY s.name, d.delivery_date
                """,
                (city_id, period_month),
            )
            rows = cur.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No deliveries for this period")

    pdf_buffer = build_city_monthly_pdf(
        city_name=city_name,
        period_month=period_month,
        rows=rows,
    )

    safe_city = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in city_name)
    filename = f"DringDring_City_{safe_city}_{month}_FROZEN.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/city-billing/export")
def export_city_billing(
    user: MeResponse = Depends(require_city_user),
    jwt_claims: str = Depends(get_current_user_claims),
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
):
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            month_date = _parse_month(month)
            cur.execute(
                """
                SELECT * FROM view_city_billing_shops
                WHERE date_trunc('month', billing_month) = date_trunc('month', %s::date)
                """,
                (month_date,),
            )
            return _export_csv(
                cur,
                export_columns=[
                    "shop_name",
                    "city_name",
                    "billing_month",
                    "total_deliveries",
                    "total_subvention_due",
                    "total_volume_chf",
                ],
                column_labels={
                    "shop_name": "Commerce",
                    "city_name": "Ville",
                    "billing_month": "Periode",
                    "total_deliveries": "Livraisons",
                    "total_subvention_due": "Subvention (CHF)",
                    "total_volume_chf": "Total CHF",
                },
                filename_base="facturation-ville",
                month_column="billing_month",
            )


@router.get("/hq-billing/export")
def export_hq_billing(
    user: MeResponse = Depends(require_hq_user),
    jwt_claims: str = Depends(get_current_user_claims),
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
):
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            month_date = _parse_month(month)
            cur.execute(
                """
                SELECT * FROM view_hq_billing_shops
                WHERE date_trunc('month', billing_month) = date_trunc('month', %s::date)
                """,
                (month_date,),
            )
            return _export_csv(
                cur,
                export_columns=[
                    "shop_name",
                    "city_name",
                    "billing_month",
                    "total_deliveries",
                    "total_subvention_due",
                    "total_volume_chf",
                ],
                column_labels={
                    "shop_name": "Commerce",
                    "city_name": "Ville",
                    "billing_month": "Periode",
                    "total_deliveries": "Livraisons",
                    "total_subvention_due": "Subvention (CHF)",
                    "total_volume_chf": "Total CHF",
                },
                filename_base="facturation-groupe",
                month_column="billing_month",
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


def _assert_city_period_fully_frozen(cur, city_id: str, period_month: date) -> None:
    cur.execute(
        """
        SELECT
            COUNT(*) AS total,
            COUNT(bp.shop_id) AS frozen
        FROM shop s
        LEFT JOIN billing_period bp
          ON bp.shop_id = s.id
         AND bp.period_month = %s
        WHERE s.city_id = %s
        """,
        (period_month, city_id),
    )
    total, frozen = cur.fetchone()

    if total == 0:
        raise HTTPException(status_code=404, detail="No shops for this city")

    if total != frozen:
        raise HTTPException(
            status_code=409,
            detail="Not all shops are frozen for this period",
        )


def _export_csv(cur, export_columns, column_labels, filename_base, month_column=None):
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([column_labels.get(col, col) for col in export_columns])

    for row in rows:
        row_dict = dict(zip(columns, row))
        csv_row = []
        for col in export_columns:
            csv_row.append(_csv_value(row_dict.get(col)))
        writer.writerow(csv_row)

    filename = _build_filename(filename_base, rows, columns, month_column)
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response


def _csv_value(value):
    if value is None:
        return ""
    if isinstance(value, Decimal):
        return str(value)
    return str(value)


def _build_filename(filename_base, rows, columns, month_column):
    suffix = None
    if rows and month_column:
        row_dicts = [dict(zip(columns, row)) for row in rows]
        months = [_format_month(row.get(month_column)) for row in row_dicts]
        months = [value for value in months if value]
        if months:
            suffix = sorted(months)[-1]
    if suffix:
        return f"{filename_base}-{suffix}.csv"
    return f"{filename_base}.csv"


def _format_month(value):
    if isinstance(value, datetime):
        return value.strftime("%Y-%m")
    if isinstance(value, date):
        return value.strftime("%Y-%m")
    try:
        as_text = str(value)
    except Exception:
        return ""
    if len(as_text) >= 7:
        return as_text[:7]
    return ""


def _parse_month(month):
    if month is None:
        today = date.today()
        return today.replace(day=1)
    try:
        return datetime.strptime(month, "%Y-%m").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid month format") from exc
