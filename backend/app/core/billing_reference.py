import hashlib
import re


_MOD10_TABLE = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5]


def _clean_iban(value: str | None) -> str:
    return re.sub(r"[^0-9A-Za-z]", "", (value or "").strip()).upper()


def _iban_iid(iban: str | None) -> int | None:
    cleaned = _clean_iban(iban)
    if len(cleaned) < 9:
        return None
    if not cleaned.startswith(("CH", "LI")):
        return None
    iid = cleaned[4:9]
    if not iid.isdigit():
        return None
    return int(iid)


def is_qr_iban(iban: str | None) -> bool:
    iid = _iban_iid(iban)
    return iid is not None and 30000 <= iid <= 31999


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


def generate_rf_reference(seed: str) -> str | None:
    base = re.sub(r"[^0-9A-Z]", "", (seed or "").upper())
    if not base:
        return None
    base = base[:21]
    numeric = _alnum_to_numeric(f"{base}RF00")
    check = 98 - _mod97(numeric)
    return f"RF{check:02d}{base}"


def _mod10_recursive(number: str) -> int:
    carry = 0
    for ch in number:
        carry = _MOD10_TABLE[(carry + int(ch)) % 10]
    return (10 - carry) % 10


def generate_qrr_reference(seed: str) -> str:
    digits = re.sub(r"\\D", "", seed or "")
    if len(digits) < 26:
        hash_int = int(hashlib.sha1((seed or "").encode("utf-8")).hexdigest(), 16)
        digits = (digits + str(hash_int)).zfill(26)
    base = digits[-26:]
    check = _mod10_recursive(base)
    return f"{base}{check}"


def generate_reference(iban: str | None, seed: str) -> str | None:
    if not seed:
        return None
    if is_qr_iban(iban):
        return generate_qrr_reference(seed)
    return generate_rf_reference(seed)
