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


def build_hq_monthly_pdf(
    *,
    hq_name: str,
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
    elements = []

    elements.extend(build_logo_flowables())
    elements.append(Paragraph("<b>DringDring</b>", styles["Title"]))
    elements.append(
        Paragraph(
            f"<b>Releve mensuel HQ - {period_month.strftime('%B %Y')}</b>",
            styles["Heading2"],
        )
    )
    elements.append(Paragraph(f"<b>HQ :</b> {hq_name}", styles["Normal"]))
    status_label = "PERIODE NON GELEE (PREVIEW)" if is_preview else "PERIODE GELEE"
    elements.append(Paragraph(f"<b>Statut :</b> {status_label}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    table_data = [
        [
            "Commerce",
            "Commune partenaire",
            "Livraisons",
            "Montant HQ (CHF)",
        ]
    ]

    total_deliveries = 0
    total_due = Decimal("0.00")

    for (
        _hq_name,
        _shop_id,
        shop_name,
        city_name,
        deliveries,
        total_hq_due,
        _is_frozen,
    ) in rows:
        table_data.append(
            [
                shop_name or "",
                city_name or "",
                deliveries or 0,
                f"{Decimal(str(total_hq_due)):.2f}",
            ]
        )
        total_deliveries += int(deliveries or 0)
        total_due += Decimal(str(total_hq_due or 0))

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

    elements.append(Paragraph("<b>Totaux mensuels</b>", styles["Heading3"]))
    elements.append(
        Paragraph(f"Total livraisons : {total_deliveries}", styles["Normal"])
    )
    elements.append(Paragraph(f"Total facture : CHF {total_due:.2f}", styles["Normal"]))
    elements.append(Spacer(1, 24))
    elements.extend(
        build_payment_flowables(
            amount=total_due,
            vat_rate=vat_rate,
            debtor_name=hq_name,
            debtor_city="",
            message=f"Facturation HQ DringDring {period_month.strftime('%Y-%m')}",
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
