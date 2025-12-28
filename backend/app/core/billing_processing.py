from datetime import date, datetime, timezone
import hashlib

from fastapi import HTTPException

from app.db.session import get_db_connection
from app.pdf.shop_monthly_report import build_shop_monthly_pdf
from app.storage.supabase_storage import upload_pdf_bytes

def freeze_shop_billing_period(
    cur,
    shop_id: str,
    period_month: date,
    frozen_by_user_id: str,
    frozen_by_email: str,
    frozen_comment: str | None = None,
):
    """
    Core logic to freeze a billing period for a shop.
    Generates the PDF, uploads it, and inserts/updates the billing_period record.
    Must be called within an active transaction cursor `cur`.
    """
    # 1. Check if already frozen
    cur.execute(
        """
        SELECT 1
        FROM billing_period
        WHERE shop_id = %s
          AND period_month = %s
        """,
        (shop_id, period_month),
    )
    if cur.fetchone():
        # Already frozen, we can choose to return existing or raise.
        # For bulk ops, better to skip or be idempotent.
        # Here we raise to matching existing behavior, or caller handles check.
        raise HTTPException(status_code=409, detail="Already frozen")

    # 2. Fetch Shop Data
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

    # 3. Fetch Deliveries
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
        # Cannot freeze empty period? Or logic says "No deliveries for this period"
        raise HTTPException(
            status_code=400,
            detail="No deliveries for this period",
        )

    # 4. Global Frozen TS
    frozen_at = datetime.now(timezone.utc)

    # 5. Build PDF
    pdf_buffer = build_shop_monthly_pdf(
        shop_name=shop_name,
        shop_city=shop_city,
        hq_name=hq_name,
        period_month=period_month,
        frozen_at=frozen_at,
        frozen_by=frozen_by_user_id,
        frozen_by_name=frozen_by_email,
        deliveries=deliveries,
    )
    pdf_bytes = pdf_buffer.getvalue()
    pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()
    
    # Format: YYYY-MM
    month_str = period_month.strftime("%Y-%m")
    pdf_path = f"shop/{shop_id}/{month_str}.pdf"

    # 6. Upload
    try:
        upload_pdf_bytes(
            bucket="billing-pdf",
            path=pdf_path,
            data=pdf_bytes,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    # 7. Insert Record
    cur.execute(
        """
        INSERT INTO billing_period (
            shop_id,
            period_month,
            frozen_at,
            frozen_by,
            frozen_by_name,
            pdf_url,
            pdf_sha256,
            pdf_generated_at,
            frozen_comment
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (shop_id, period_month) DO NOTHING
        """,
        (
            shop_id,
            period_month,
            frozen_at,
            frozen_by_user_id,
            frozen_by_email,
            pdf_path,
            pdf_hash,
            frozen_at,
            frozen_comment,
        ),
    )

    return {"status": "frozen", "pdf_path": pdf_path, "pdf_sha256": pdf_hash}
