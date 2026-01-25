from datetime import date
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.pdf.logo import build_logo_flowables
from app.pdf.payment_details import build_payment_flowables


def build_client_monthly_pdf(
    *,
    client_name: str,
    client_address: str,
    client_postal_code: str,
    client_city: str,
    period_month: date,
    deliveries: list[tuple],
    vat_rate: Decimal | int | float | str | None = None,
    is_preview: bool = False,
) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    elements = []

    elements.extend(build_logo_flowables())
    elements.append(Paragraph("<b>DringDring</b>", styles["Title"]))
    elements.append(
        Paragraph(
            f"<b>Releve client - {period_month.strftime('%B %Y')}</b>",
            styles["Heading2"],
        )
    )
    elements.append(Spacer(1, 8))

    elements.append(Paragraph(f"<b>Client :</b> {client_name}", styles["Normal"]))
    elements.append(Paragraph(f"{client_address}", styles["Normal"]))
    elements.append(Paragraph(f"{client_postal_code} {client_city}", styles["Normal"]))
    elements.append(Spacer(1, 12))
    status_label = "PERIODE NON GELEE (PREVIEW)" if is_preview else "PERIODE GELEE"
    elements.append(Paragraph(f"<b>Statut :</b> {status_label}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    table_data = [["Date", "Commerce", "Sacs", "Total CHF", "Part client"]]

    total_total = Decimal("0.00")
    total_client = Decimal("0.00")

    for delivery_date, shop_name, bags, total_price, share_client in deliveries:
        table_data.append(
            [
                delivery_date.strftime("%d.%m.%Y"),
                shop_name or "",
                bags,
                f"{Decimal(str(total_price)):.2f}",
                f"{Decimal(str(share_client)):.2f}",
            ]
        )
        total_total += Decimal(str(total_price))
        total_client += Decimal(str(share_client))

    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]
        )
    )

    elements.append(table)
    elements.append(Spacer(1, 16))

    elements.append(Paragraph("<b>Totaux</b>", styles["Heading3"]))
    elements.append(
        Paragraph(f"Total livraisons : CHF {total_total:.2f}", styles["Normal"])
    )
    elements.append(
        Paragraph(f"Total part client : CHF {total_client:.2f}", styles["Normal"])
    )
    elements.append(Spacer(1, 16))
    elements.extend(
        build_payment_flowables(
            amount=total_client,
            vat_rate=vat_rate,
            debtor_name=client_name,
            debtor_address=client_address,
            debtor_postal_code=client_postal_code,
            debtor_city=client_city,
            message=f"Facture client DringDring {period_month.strftime('%Y-%m')}",
            styles=styles,
        )
    )

    if is_preview:
        elements.append(
            Paragraph(
                "<i>Document provisoire (periode non gelee). "
                "Les montants peuvent evoluer.</i>",
                styles["Italic"],
            )
        )
    else:
        elements.append(
            Paragraph(
                "<i>Ce document est genere automatiquement par DringDring a partir "
                "de donnees gelees. Toute modification ulterieure est impossible.</i>",
                styles["Italic"],
            )
        )

    doc.build(elements)
    buffer.seek(0)
    return buffer
