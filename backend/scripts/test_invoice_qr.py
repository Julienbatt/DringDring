"""
Test script for invoice with Swiss QR Bill integration.

This script generates a sample invoice PDF with QR bill for visual inspection.
"""

import sys
from pathlib import Path
from decimal import Decimal
from datetime import date

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from app.pdf.invoice_qr_bill import build_recipient_invoice_with_qr_bill


def main():
    """Generate a test invoice with QR bill."""
    output_path = backend_path / "test_invoice_qr.pdf"
    
    print("Generating test invoice with Swiss QR Bill...")
    print(f"Output: {output_path}")
    
    # Sample delivery data
    sample_deliveries = [
        (date(2026, 1, 15), "Migros Sion", "Marie Dubois", "Sion", 2, Decimal("15.00")),
        (date(2026, 1, 16), "Migros Sion", "Jean Martin", "Sion", 4, Decimal("30.00")),
        (date(2026, 1, 18), "Coop Centre", "Anna Schmidt", "Sion", 2, Decimal("15.00")),
        (date(2026, 1, 20), "Migros Sion", "Pierre Favre", "Sion", 6, Decimal("45.00")),
    ]
    
    pdf_buffer = build_recipient_invoice_with_qr_bill(
        recipient_label="Commerce",
        recipient_name="Migros Sion",
        recipient_street="Avenue de la Gare",
        recipient_house_num="25",
        recipient_postal_code="1950",
        recipient_city="Sion",
        period_month=date(2026, 1, 1),
        rows=sample_deliveries,
        vat_rate=Decimal("0.081"),
        is_preview=False,
        payment_message="Facturation DringDring Janvier 2026",
        reference="RF18 5390 0754 7034 3",
    )
    
    # Write to file
    with open(output_path, "wb") as f:
        f.write(pdf_buffer.read())
    
    print(f"[SUCCESS] Invoice PDF generated: {output_path}")
    print("\nVerification checklist:")
    print("1. Open PDF and verify header/table layout")
    print("2. Check QR bill is at bottom of page")
    print("3. Measure QR bill section (should be 210mm x 105mm)")
    print("4. Verify Swiss Cross is visible in QR code")
    print("5. Scan QR code with banking app")
    print("6. Verify amount matches invoice total (105.00 CHF)")


if __name__ == "__main__":
    main()
