import urllib.error
import urllib.request

from app.core.config import settings


def upload_pdf_bytes(*, bucket: str, path: str, data: bytes) -> str:
    supabase_url = settings.SUPABASE_URL
    service_key = settings.SUPABASE_SERVICE_KEY
    if not supabase_url or not service_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

    base_url = supabase_url.rstrip("/")
    object_url = f"{base_url}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
    }
    request = urllib.request.Request(
        object_url,
        data=data,
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"Supabase upload failed ({exc.code}): {detail}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Supabase upload failed: {exc.reason}") from exc

    return path
