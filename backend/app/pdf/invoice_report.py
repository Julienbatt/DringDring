"""
Compatibility wrapper for recipient invoice PDFs.

Historically, reporting routes imported build_recipient_invoice_pdf from this module.
We now generate all recipient invoices via the Swiss QR Bill renderer to keep
templates consistent across HQ/commune/independent commerce flows.
"""

from datetime import date
from decimal import Decimal
from io import BytesIO

from app.pdf.invoice_qr_bill import build_recipient_invoice_with_qr_bill


def build_recipient_invoice_pdf(
    *,
    recipient_label: str,
    recipient_name: str,
    period_month: date,
    rows: list[tuple],
    vat_rate: Decimal | int | float | str | None = None,
    is_preview: bool = False,
    recipient_street: str | None = None,
    recipient_house_num: str | None = None,
    recipient_postal_code: str | None = None,
    recipient_city: str | None = None,
    payment_message: str | None = None,
    reference: str | None = None,
    creditor_iban: str | None = None,
    creditor_name: str | None = None,
    creditor_street: str | None = None,
    creditor_house_num: str | None = None,
    creditor_postal_code: str | None = None,
    creditor_city: str | None = None,
    creditor_country: str | None = None,
) -> BytesIO:
    return build_recipient_invoice_with_qr_bill(
        recipient_label=recipient_label,
        recipient_name=recipient_name,
        recipient_street=recipient_street,
        recipient_house_num=recipient_house_num,
        recipient_postal_code=recipient_postal_code,
        recipient_city=recipient_city,
        period_month=period_month,
        rows=rows,
        vat_rate=vat_rate,
        is_preview=is_preview,
        payment_message=payment_message,
        reference=reference,
        creditor_iban=creditor_iban,
        creditor_name=creditor_name,
        creditor_street=creditor_street,
        creditor_house_num=creditor_house_num,
        creditor_postal_code=creditor_postal_code,
        creditor_city=creditor_city,
        creditor_country=creditor_country,
    )
