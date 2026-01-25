from datetime import date
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.pdf.logo import build_logo_flowables


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
            f"<b>Releve mensuel des livraisons - {period_month.strftime('%B %Y')}</b>",
            styles["Heading2"],
        )
    )
    elements.append(Spacer(1, 12))

    elements.append(Paragraph(f"<b>Commerce :</b> {shop_name}", styles["Normal"]))
    elements.append(Paragraph(f"{shop_city}", styles["Normal"]))
    if hq_name:
        elements.append(Paragraph(f"<b>HQ :</b> {hq_name}", styles["Normal"]))
    elements.append(Spacer(1, 8))

    status_label = "PERIODE NON GELEE (PREVIEW)" if is_preview else "PERIODE GELEE"
    elements.append(Paragraph(f"<b>Statut :</b> {status_label}", styles["Normal"]))

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
            "Commune partenaire",
            "Sacs",
            "Total CHF",
            "Part entreprise regionale",
            "Part commune",
        ]
    ]

    total_total = Decimal("0.00")
    total_admin_region = Decimal("0.00")
    total_city = Decimal("0.00")
    for (
        delivery_date,
        client_name,
        city_name,
        bags,
        total_price,
        share_admin_region,
        share_city,
    ) in deliveries:
        table_data.append(
            [
                delivery_date.strftime("%d.%m.%Y"),
                client_name or "",
                city_name or "",
                bags,
                f"{total_price:.2f}",
                f"{share_admin_region:.2f}",
                f"{share_city:.2f}",
            ]
        )

        total_total += Decimal(str(total_price))
        total_admin_region += Decimal(str(share_admin_region))
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
        Paragraph(
            f"Total part entreprise regionale : CHF {total_admin_region:.2f}",
            styles["Normal"],
        )
    )
    elements.append(
        Paragraph(f"Total part commune : CHF {total_city:.2f}", styles["Normal"])
    )
    elements.append(Spacer(1, 16))
    elements.append(
        Paragraph(
            "Aucun montant n'est a regler par le commerce. "
            "Les parts commune et entreprise regionale sont facturees separement.",
            styles["Italic"],
        )
    )
    elements.append(Spacer(1, 24))

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
