# Swiss QR Bill Renderer - Usage Guide

## Overview
The Swiss QR Bill renderer provides strict SIX Interbank Clearing compliance for invoice generation. It uses ReportLab Canvas for pixel-perfect positioning.

## Quick Start

### Standalone QR Bill
```python
from app.pdf.swiss_qr_renderer import generate_qr_bill_pdf
from decimal import Decimal

generate_qr_bill_pdf(
    output_path="invoice.pdf",
    creditor_iban="CH93 0076 2011 6238 5295 7",
    creditor_name="Vélocité Sion",
    creditor_street="Avenue de la Gare",
    creditor_house_num="12",
    creditor_postal_code="1950",
    creditor_city="Sion",
    debtor_name="Jean Dupont",
    debtor_street="Rue du Rhône",
    debtor_house_num="45",
    debtor_postal_code="1950",
    debtor_city="Sion",
    amount=Decimal("45.00"),
    currency="CHF",
    reference="RF18 5390 0754 7034 3",
    message="Facturation DringDring 2026-01",
)
```

### Full Invoice with QR Bill
```python
from app.pdf.invoice_qr_bill import build_recipient_invoice_with_qr_bill
from datetime import date
from decimal import Decimal

pdf_buffer = build_recipient_invoice_with_qr_bill(
    recipient_label="Commerce",
    recipient_name="Migros Sion",
    recipient_street="Avenue de la Gare",
    recipient_house_num="25",
    recipient_postal_code="1950",
    recipient_city="Sion",
    period_month=date(2026, 1, 1),
    rows=[
        (date(2026, 1, 15), "Shop", "Client", "City", 2, Decimal("15.00")),
    ],
    vat_rate=Decimal("0.081"),
    reference="RF18 5390 0754 7034 3",
)
```

## Configuration

Add to `.env`:
```bash
BILLING_CREDITOR_NAME="Vélocité Sion"
BILLING_CREDITOR_IBAN="CH93 0076 2011 6238 5295 7"
BILLING_CREDITOR_STREET="Avenue de la Gare"
BILLING_CREDITOR_HOUSE_NUM="12"
BILLING_CREDITOR_POSTAL_CODE="1950"
BILLING_CREDITOR_CITY="Sion"
BILLING_CREDITOR_COUNTRY="CH"
```

## Testing

### Generate Test PDFs
```bash
# Standalone QR bill
python scripts/test_qr_bill.py

# Full invoice with QR bill
python scripts/test_invoice_qr.py
```

### Manual Verification Checklist
1. **Visual Layout**
   - Open generated PDF
   - Verify QR bill is at bottom of page
   - Check receipt (left) and payment (right) sections

2. **Dimensions** (requires ruler or PDF measurement tool)
   - Payment section: 210mm x 105mm
   - QR code: 46mm x 46mm
   - Swiss Cross: 7mm x 7mm

3. **QR Code Scanning**
   - Use Swiss banking app (PostFinance, UBS, Credit Suisse, etc.)
   - Scan QR code
   - Verify all payment details are correct:
     - IBAN
     - Amount
     - Reference
     - Creditor/Debtor names and addresses

4. **Compliance**
   - Swiss Cross is visible and centered
   - Scissors line is present
   - All text is readable
   - Addresses are properly formatted

## Integration with Billing

To use in billing process, update `billing_processing.py`:

```python
from app.pdf.invoice_qr_bill import build_recipient_invoice_with_qr_bill

# Replace build_recipient_invoice_pdf with:
pdf_buffer = build_recipient_invoice_with_qr_bill(
    recipient_label="Commerce",
    recipient_name=shop_name,
    recipient_street=shop_street,  # Add to shop data
    recipient_house_num=shop_house_num,
    recipient_postal_code=shop_postal_code,
    recipient_city=shop_city,
    period_month=period_month,
    rows=invoice_rows,
    vat_rate=vat_rate,
    reference=generate_reference(),  # Implement reference generation
)
```

## Known Limitations

1. **QR-IBAN Support**: Currently uses regular IBAN. QR-IBAN (for QRR references) requires additional validation.
2. **Multi-language**: Only French labels implemented. German/Italian/English can be added.
3. **Alternative Schemes**: Only supports basic payment scheme. Swico/structured info not yet implemented.

## Next Steps

1. Add reference number generation (RF format)
2. Implement QR-IBAN detection and validation
3. Add multi-language support
4. Create unit tests for QR data payload
5. Integrate into production billing flow
