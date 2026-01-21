"""
Enhanced invoice report builder with Swiss QR Bill support.

This module provides invoice generation with strict Swiss QR Bill compliance.
"""

from datetime import date
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.pdfgen import canvas as pdf_canvas

from app.pdf.logo import build_logo_flowables
from app.pdf.swiss_qr_renderer import render_swiss_qr_bill
from app.core.config import settings


def build_recipient_invoice_with_qr_bill(
    *,
    recipient_label: str,
    recipient_name: str,
    recipient_street: str | None = None,
    recipient_house_num: str | None = None,
    recipient_postal_code: str | None = None,
    recipient_city: str | None = None,
    period_month: date,
    rows: list[tuple],
    vat_rate: Decimal | int | float | str | None = None,
    is_preview: bool = False,
    payment_message: str | None = None,
    reference: str | None = None,
) -> BytesIO:
    """
    Build a recipient invoice PDF with Swiss QR Bill payment section.
    
    This function generates a professional invoice with:
    - Header with logo and invoice details
    - Itemized delivery table
    - Totals with VAT breakdown
    - Swiss QR Bill payment section (SIX compliant)
    
    Args:
        recipient_label: Type of recipient (e.g., "Commerce", "HQ", "Commune")
        recipient_name: Name of the recipient
        recipient_street: Street name (for QR bill debtor)
        recipient_house_num: House number (for QR bill debtor)
        recipient_postal_code: Postal code (for QR bill debtor)
        recipient_city: City (for QR bill debtor)
        period_month: Billing period (first day of month)
        rows: List of delivery rows (date, shop, client, city, bags, amount)
        vat_rate: VAT rate (default: 0.081)
        is_preview: Whether this is a preview (non-frozen period)
        payment_message: Custom payment message
        reference: Payment reference number
        
    Returns:
        BytesIO buffer containing the PDF
    """
    buffer = BytesIO()
    
    # Calculate bottom margin to accommodate QR bill (105mm + 5mm safety)
    qr_bill_height = 105 * mm + 5 * mm
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=qr_bill_height,  # Reserve space for QR bill
    )
    
    styles = getSampleStyleSheet()
    elements: list = []
    
    # Header
    elements.extend(build_logo_flowables())
    elements.append(Paragraph("<b>DringDring</b>", styles["Title"]))
    elements.append(
        Paragraph(
            f"<b>Facture mensuelle - {recipient_label} {recipient_name}</b>",
            styles["Heading2"],
        )
    )
    elements.append(
        Paragraph(
            f"Periode : {period_month.strftime('%B %Y')}",
            styles["Normal"],
        )
    )
    
    status_label = "PERIODE NON GELEE (PREVIEW)" if is_preview else "PERIODE GELEE"
    elements.append(Paragraph(f"<b>Statut :</b> {status_label}", styles["Normal"]))
    elements.append(Spacer(1, 12))
    
    # Delivery table
    table_data = [
        [
            "Date",
            "Commerce",
            "Client",
            "Commune partenaire",
            "Sacs",
            "Montant du (CHF)",
        ]
    ]
    
    total_due = Decimal("0.00")
    
    for (
        delivery_date,
        shop_name,
        client_name,
        commune_name,
        bags,
        amount_due,
    ) in rows:
        due_value = Decimal(str(amount_due or 0))
        total_due += due_value
        
        table_data.append(
            [
                delivery_date.strftime("%d.%m.%Y"),
                shop_name or "",
                client_name or "",
                commune_name or "",
                bags or 0,
                f"{due_value:.2f}",
            ]
        )
    
    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ALIGN", (4, 1), (-1, -1), "RIGHT"),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 16))
    
    # Totals
    elements.append(Paragraph("<b>Totaux</b>", styles["Heading3"]))
    
    # VAT breakdown
    if vat_rate:
        vat_rate_decimal = Decimal(str(vat_rate))
        divisor = Decimal("1.00") + vat_rate_decimal
        amount_ht = (total_due / divisor).quantize(Decimal("0.01"))
        vat_amount = (total_due - amount_ht).quantize(Decimal("0.01"))
        
        elements.append(
            Paragraph(
                f"Montant HT : CHF {amount_ht:.2f}",
                styles["Normal"],
            )
        )
        elements.append(
            Paragraph(
                f"TVA ({vat_rate_decimal * 100:.1f}%) : CHF {vat_amount:.2f}",
                styles["Normal"],
            )
        )
    
    elements.append(
        Paragraph(
            f"<b>Montant total TTC : CHF {total_due:.2f}</b>",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 18))
    
    # Note about QR bill
    elements.append(
        Paragraph(
            "<b>Informations de paiement</b>",
            styles["Heading3"],
        )
    )
    elements.append(
        Paragraph(
            "Veuillez utiliser le bulletin de versement QR en bas de page pour effectuer le paiement.",
            styles["Normal"],
        )
    )
    
    if is_preview:
        elements.append(Spacer(1, 12))
        elements.append(
            Paragraph(
                "<i>Document provisoire (periode non gelee). "
                "Les montants peuvent evoluer.</i>",
                styles["Italic"],
            )
        )
    else:
        elements.append(Spacer(1, 12))
        elements.append(
            Paragraph(
                "<i>Ce document est genere automatiquement par DringDring a partir "
                "de donnees gelees. Toute modification ulterieure est impossible.</i>",
                styles["Italic"],
            )
        )
    
    # Build main content
    def add_qr_bill(canvas, doc):
        """Add Swiss QR Bill to the bottom of each page."""
        # Only add QR bill if we have creditor details configured
        if not settings.BILLING_CREDITOR_IBAN or not settings.BILLING_CREDITOR_NAME:
            return
        
        render_swiss_qr_bill(
            canvas,
            y_position=0,  # Bottom of page
            # Creditor
            creditor_iban=settings.BILLING_CREDITOR_IBAN,
            creditor_name=settings.BILLING_CREDITOR_NAME,
            creditor_street=settings.BILLING_CREDITOR_STREET,
            creditor_house_num=settings.BILLING_CREDITOR_HOUSE_NUM,
            creditor_postal_code=settings.BILLING_CREDITOR_POSTAL_CODE or "",
            creditor_city=settings.BILLING_CREDITOR_CITY or "",
            creditor_country=settings.BILLING_CREDITOR_COUNTRY,
            # Debtor
            debtor_name=recipient_name,
            debtor_street=recipient_street,
            debtor_house_num=recipient_house_num,
            debtor_postal_code=recipient_postal_code,
            debtor_city=recipient_city,
            debtor_country="CH",
            # Payment details
            amount=total_due,
            currency="CHF",
            reference=reference,
            message=payment_message or f"Facturation DringDring {period_month.strftime('%Y-%m')}",
            language="fr",
        )
    
    doc.build(elements, onFirstPage=add_qr_bill, onLaterPages=add_qr_bill)
    buffer.seek(0)
    return buffer
