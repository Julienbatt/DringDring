from collections import defaultdict
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


def build_city_monthly_pdf(
    *,
    city_name: str,
    period_month: date,
    rows: list[tuple],
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
    elements: list = []

    elements.extend(build_logo_flowables())
    elements.append(Paragraph("<b>DringDring</b>", styles["Title"]))
    elements.append(
        Paragraph(
            f"<b>Facturation mensuelle - Commune partenaire de {city_name}</b>",
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

    grouped: dict[str, list[tuple]] = defaultdict(list)
    for row in rows:
        grouped[str(row[0])].append(row)

    total_city_share = Decimal("0.00")

    for shop_rows in grouped.values():
        shop_name = shop_rows[0][1] or ""
        elements.append(Paragraph(f"<b>Commerce : {shop_name}</b>", styles["Heading3"]))

        table_data = [
            [
                "Date",
                "Client",
                "Commune partenaire",
                "Sacs",
                "Part commune (CHF)",
            ]
        ]

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
            share_admin_region,
        ) in shop_rows:
            subtotal_city += Decimal(str(share_city))

            table_data.append(
                [
                    delivery_date.strftime("%d.%m.%Y"),
                    client_name or "",
                    city_label or "",
                    bags,
                    f"{Decimal(str(share_city)):.2f}",
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
                f"Sous-total {shop_name} : CHF {subtotal_city:.2f}",
                styles["Normal"],
            )
        )
        elements.append(Spacer(1, 12))

        total_city_share += subtotal_city

    elements.append(Spacer(1, 6))
    elements.append(Paragraph("<b>Totaux commune</b>", styles["Heading3"]))
    elements.append(
        Paragraph(
            f"Montant facture commune : CHF {total_city_share:.2f}",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 18))
    elements.extend(
        build_payment_flowables(
            amount=total_city_share,
            vat_rate=vat_rate,
            debtor_name=f"Commune partenaire de {city_name}",
            debtor_city=city_name,
            message=f"Facturation DringDring {period_month.strftime('%Y-%m')}",
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
