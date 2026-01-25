from pathlib import Path

from reportlab.lib.units import cm
from reportlab.platypus import Image, Spacer


def build_logo_flowables(width_cm: float = 4.2):
    logo_path = (
        Path(__file__).resolve().parents[1]
        / "assets"
        / "logo-Dring-Dring2.png"
    )
    if not logo_path.exists():
        return []

    image = Image(str(logo_path))
    target_width = width_cm * cm
    scale = target_width / image.imageWidth
    image.drawWidth = target_width
    image.drawHeight = image.imageHeight * scale
    image.hAlign = "LEFT"
    return [image, Spacer(1, 12)]
