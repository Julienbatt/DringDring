from collections import defaultdict
from datetime import date
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def build_city_monthly_pdf(
    *,
    city_name: str,
    period_month: date,
    rows: list[tuple],
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
    elements: list = []

    elements.append(Paragraph("<b>DringDring</b>", styles["Title"]))
    elements.append(
        Paragraph(
            f"<b>Facturation mensuelle - Ville de {city_name}</b>",
            styles["Heading2"],
        )
    )
    elements.append(
        Paragraph(
            f"Periode : {period_month.strftime('%B %Y')}",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 12))

    grouped: dict[str, list[tuple]] = defaultdict(list)
    for row in rows:
        grouped[str(row[0])].append(row)

    total_city = Decimal("0.00")
    total_shop = Decimal("0.00")
    total_city_share = Decimal("0.00")

    for shop_rows in grouped.values():
        shop_name = shop_rows[0][1] or ""
        elements.append(Paragraph(f"<b>Shop : {shop_name}</b>", styles["Heading3"]))

        table_data = [
            [
                "Date",
                "Client",
                "Ville",
                "Sacs",
                "Total CHF",
                "Part ville",
                "Part shop",
            ]
        ]

        subtotal_total = Decimal("0.00")
        subtotal_shop = Decimal("0.00")
        subtotal_city = Decimal("0.00")

        for (
            _shop_id,
            _shop_name,
            delivery_date,
            client_name,
            city_label,
            bags,
            total_price,
            share_city,
            share_shop,
        ) in shop_rows:
            subtotal_total += Decimal(str(total_price))
            subtotal_shop += Decimal(str(share_shop))
            subtotal_city += Decimal(str(share_city))

            table_data.append(
                [
                    delivery_date.strftime("%d.%m.%Y"),
                    client_name or "",
                    city_label or "",
                    bags,
                    f"{Decimal(str(total_price)):.2f}",
                    f"{Decimal(str(share_city)):.2f}",
                    f"{Decimal(str(share_shop)):.2f}",
                ]
            )

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
        elements.append(Spacer(1, 6))

        elements.append(
            Paragraph(
                f"Sous-total {shop_name} : CHF {subtotal_total:.2f}",
                styles["Normal"],
            )
        )
        elements.append(Spacer(1, 12))

        total_city += subtotal_total
        total_shop += subtotal_shop
        total_city_share += subtotal_city

    elements.append(Spacer(1, 6))
    elements.append(Paragraph("<b>Totaux ville</b>", styles["Heading3"]))
    elements.append(
        Paragraph(f"Total facturation : CHF {total_city:.2f}", styles["Normal"])
    )
    elements.append(
        Paragraph(f"Total part ville : CHF {total_city_share:.2f}", styles["Normal"])
    )
    elements.append(
        Paragraph(f"Total part shop : CHF {total_shop:.2f}", styles["Normal"])
    )
    elements.append(Spacer(1, 18))
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
