from io import BytesIO
from pathlib import Path

from reportlab.lib.units import cm
from reportlab.platypus import Image, Spacer


def build_logo_image(width_cm: float = 4.2, logo_bytes: bytes | None = None):
    image_source: str | BytesIO
    if logo_bytes:
        image_source = BytesIO(logo_bytes)
    else:
        logo_path = (
            Path(__file__).resolve().parents[1]
            / "assets"
            / "logo-Dring-Dring2.png"
        )
        if not logo_path.exists():
            return None
        image_source = str(logo_path)

    try:
        image = Image(image_source)
    except Exception:
        return None
    target_width = width_cm * cm
    scale = target_width / image.imageWidth
    image.drawWidth = target_width
    image.drawHeight = image.imageHeight * scale
    image.hAlign = "LEFT"
    return image


def build_logo_flowables(width_cm: float = 4.2, logo_bytes: bytes | None = None):
    image = build_logo_image(width_cm=width_cm, logo_bytes=logo_bytes)
    if not image:
        return []
    return [image, Spacer(1, 12)]
