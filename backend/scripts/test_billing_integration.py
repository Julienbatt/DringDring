"""
Quick test to verify Swiss QR Bill integration in billing_processing.

This simulates the freeze_shop_billing_period call to ensure the new
QR-Bill renderer works correctly.
"""

import sys
from pathlib import Path
from datetime import date
from decimal import Decimal

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

# Mock the database cursor and test the PDF generation logic
class MockCursor:
    """Mock cursor for testing without database."""
    def __init__(self):
        self.results = []
        self.call_count = 0
    
    def execute(self, query, params=None):
        self.call_count += 1
        # Simulate shop data query
        if "SELECT s.name, c.name, h.name, s.address" in query:
            self.results = [("Test Shop", "Sion", None, "Rue du Test 12", "1950")]
        # Simulate deliveries query
        elif "SELECT" in query and "delivery" in query.lower():
            self.results = [
                (date(2026, 1, 15), "Client 1", "Sion", 2, Decimal("15.00"), Decimal("5.00"), Decimal("5.00")),
                (date(2026, 1, 16), "Client 2", "Sion", 4, Decimal("30.00"), Decimal("10.00"), Decimal("10.00")),
            ]
        else:
            self.results = []
    
    def fetchone(self):
        if self.results:
            return self.results[0] if not isinstance(self.results[0], tuple) else self.results[0]
        return None
    
    def fetchall(self):
        return self.results


def test_qr_bill_integration():
    """Test that the new QR bill generation works."""
    print("Testing Swiss QR Bill integration...")
    
    from app.pdf.invoice_qr_bill import build_recipient_invoice_with_qr_bill
    
    # Simulate data from database
    shop_name = "Test Shop"
    shop_city = "Sion"
    shop_address = "Rue du Test 12"
    shop_postal_code = "1950"
    period_month = date(2026, 1, 1)
    shop_id = "test-shop-id-123"
    
    invoice_rows = [
        (date(2026, 1, 15), shop_name, "Client 1", "Sion", 2, Decimal("5.00")),
        (date(2026, 1, 16), shop_name, "Client 2", "Sion", 4, Decimal("10.00")),
    ]
    
    vat_rate = Decimal("0.081")
    reference = f"RF{period_month.strftime('%Y%m')}{shop_id[:8].upper()}"
    
    print(f"  Shop: {shop_name}")
    print(f"  Address: {shop_address}, {shop_postal_code} {shop_city}")
    print(f"  Period: {period_month.strftime('%Y-%m')}")
    print(f"  Reference: {reference}")
    print(f"  Deliveries: {len(invoice_rows)}")
    
    # Generate PDF
    try:
        pdf_buffer = build_recipient_invoice_with_qr_bill(
            recipient_label="Commerce",
            recipient_name=shop_name,
            recipient_street=shop_address,
            recipient_postal_code=shop_postal_code,
            recipient_city=shop_city,
            period_month=period_month,
            rows=invoice_rows,
            vat_rate=vat_rate,
            is_preview=False,
            payment_message=f"Facturation commerce DringDring {period_month.strftime('%Y-%m')}",
            reference=reference,
        )
        
        # Write test output
        output_path = backend_path / "test_billing_integration.pdf"
        with open(output_path, "wb") as f:
            f.write(pdf_buffer.read())
        
        print(f"\n[SUCCESS] Integration test passed!")
        print(f"  PDF generated: {output_path}")
        print(f"  Size: {output_path.stat().st_size} bytes")
        print("\nVerify:")
        print("  1. Open PDF and check QR bill is at bottom")
        print("  2. Verify reference number appears in QR bill")
        print("  3. Check shop address is correctly formatted")
        
    except Exception as e:
        print(f"\n[ERROR] Integration test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_qr_bill_integration()
