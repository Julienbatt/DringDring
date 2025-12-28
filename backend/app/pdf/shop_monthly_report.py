from datetime import date
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def build_shop_monthly_pdf(
    *,
    shop_name: str,
    shop_city: str,
    hq_name: str | None,
    period_month: date,
    frozen_at,
    frozen_by,
    frozen_by_name: str | None,
    deliveries: list[tuple],
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

    elements.append(Paragraph("<b>DringDring</b>", styles["Title"]))
    elements.append(
        Paragraph(
            f"<b>Releve mensuel des livraisons - {period_month.strftime('%B %Y')}</b>",
            styles["Heading2"],
        )
    )
    elements.append(Spacer(1, 12))

    elements.append(Paragraph(f"<b>Shop :</b> {shop_name}", styles["Normal"]))
    elements.append(Paragraph(f"{shop_city}", styles["Normal"]))
    if hq_name:
        elements.append(Paragraph(f"<b>HQ :</b> {hq_name}", styles["Normal"]))
    elements.append(Spacer(1, 8))

    if frozen_at:
        frozen_at_text = frozen_at.strftime("%d.%m.%Y %H:%M")
    else:
        frozen_at_text = "N/A"
    elements.append(
        Paragraph(
            f"<b>Periode gelee le :</b> {frozen_at_text}",
            styles["Normal"],
        )
    )
    frozen_by_label = frozen_by_name or (str(frozen_by) if frozen_by else "")
    if frozen_by_label:
        elements.append(
            Paragraph(
                f"<b>Gelee par :</b> {frozen_by_label}",
                styles["Normal"],
            )
        )
    elements.append(Spacer(1, 16))

    table_data = [
        [
            "Date",
            "Client",
            "Ville",
            "Sacs",
            "Total CHF",
            "Part shop",
            "Part ville",
        ]
    ]

    total_total = Decimal("0.00")
    total_shop = Decimal("0.00")
    total_city = Decimal("0.00")
    for (
        delivery_date,
        client_name,
        city_name,
        bags,
        total_price,
        share_shop,
        share_city,
    ) in deliveries:
        table_data.append(
            [
                delivery_date.strftime("%d.%m.%Y"),
                client_name or "",
                city_name or "",
                bags,
                f"{total_price:.2f}",
                f"{share_shop:.2f}",
                f"{share_city:.2f}",
            ]
        )

        total_total += Decimal(str(total_price))
        total_shop += Decimal(str(share_shop))
        total_city += Decimal(str(share_city))

    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]
        )
    )

    elements.append(table)
    elements.append(Spacer(1, 16))

    elements.append(Paragraph("<b>Totaux mensuels</b>", styles["Heading3"]))
    elements.append(
        Paragraph(f"Total facture : CHF {total_total:.2f}", styles["Normal"])
    )
    elements.append(
        Paragraph(f"Total part shop : CHF {total_shop:.2f}", styles["Normal"])
    )
    elements.append(
        Paragraph(f"Total part ville : CHF {total_city:.2f}", styles["Normal"])
    )
    elements.append(Spacer(1, 24))

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
