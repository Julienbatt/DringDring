"""
Test script for Swiss QR Bill renderer.

This script generates a sample QR bill PDF for visual inspection and testing.
"""

import sys
from pathlib import Path
from decimal import Decimal

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from app.pdf.swiss_qr_renderer import generate_qr_bill_pdf


def main():
    """Generate a test QR bill PDF."""
    output_path = backend_path / "test_qr_bill.pdf"
    
    print("Generating test Swiss QR Bill...")
    print(f"Output: {output_path}")
    
    generate_qr_bill_pdf(
        output_path=str(output_path),
        # Creditor (Velocité Sion example)
        creditor_iban="CH93 0076 2011 6238 5295 7",
        creditor_name="Vélocité Sion",
        creditor_street="Avenue de la Gare",
        creditor_house_num="12",
        creditor_postal_code="1950",
        creditor_city="Sion",
        creditor_country="CH",
        # Debtor (example customer)
        debtor_name="Jean Dupont",
        debtor_street="Rue du Rhône",
        debtor_house_num="45",
        debtor_postal_code="1950",
        debtor_city="Sion",
        debtor_country="CH",
        # Payment details
        amount=Decimal("45.00"),
        currency="CHF",
        reference="RF18 5390 0754 7034 3",
        message="Facturation DringDring 2026-01",
        language="fr",
    )
    
    print(f"[SUCCESS] PDF generated successfully: {output_path}")
    print("\nNext steps:")
    print("1. Open the PDF and verify visual layout")
    print("2. Measure payment section (should be 210mm x 105mm)")
    print("3. Scan QR code with a Swiss banking app")
    print("4. Verify all payment details are correct")


if __name__ == "__main__":
    main()
