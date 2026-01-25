import re

from app.core.billing_reference import generate_reference, is_qr_iban


def _mod97(numeric_str: str) -> int:
    remainder = 0
    for ch in numeric_str:
        remainder = (remainder * 10 + int(ch)) % 97
    return remainder


def _alnum_to_numeric(value: str) -> str:
    digits = []
    for ch in value:
        if ch.isdigit():
            digits.append(ch)
        elif ch.isalpha():
            digits.append(str(ord(ch.upper()) - 55))
    return "".join(digits)


def _validate_rf(reference: str) -> bool:
    if not reference.startswith("RF") or len(reference) < 6:
        return False
    base = reference[4:]
    numeric = _alnum_to_numeric(f"{base}RF00")
    check = 98 - _mod97(numeric)
    return reference[2:4] == f"{check:02d}"


def _mod10_recursive(number: str) -> int:
    table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5]
    carry = 0
    for ch in number:
        carry = table[(carry + int(ch)) % 10]
    return (10 - carry) % 10


def _validate_qrr(reference: str) -> bool:
    if not re.fullmatch(r"\d{27}", reference or ""):
        return False
    base = reference[:-1]
    check = _mod10_recursive(base)
    return reference[-1] == str(check)


def main() -> None:
    rf_iban = "CH4431999123000889012"
    qrr_iban = "CH4430000123456789012"
    seed = "SHOP-TEST-123"

    rf_ref = generate_reference(rf_iban, seed)
    qrr_ref = generate_reference(qrr_iban, seed)

    assert rf_ref is not None, "RF reference missing"
    assert _validate_rf(rf_ref), f"Invalid RF reference: {rf_ref}"
    assert not is_qr_iban(rf_iban), "RF IBAN incorrectly detected as QR"

    assert qrr_ref is not None, "QRR reference missing"
    assert _validate_qrr(qrr_ref), f"Invalid QRR reference: {qrr_ref}"
    assert is_qr_iban(qrr_iban), "QR IBAN not detected"

    print("RF reference:", rf_ref)
    print("QRR reference:", qrr_ref)
    print("OK: billing reference tests passed.")


if __name__ == "__main__":
    main()
