import json
import urllib.error
import urllib.request

from app.core.config import settings


def upload_file_bytes(*, bucket: str, path: str, data: bytes, content_type: str) -> str:
    supabase_url = settings.SUPABASE_URL
    service_key = settings.SUPABASE_SERVICE_KEY
    if not supabase_url or not service_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

    base_url = supabase_url.rstrip("/")

    def _upload() -> None:
        object_url = f"{base_url}/storage/v1/object/{bucket}/{path}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        request = urllib.request.Request(
            object_url,
            data=data,
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()

    try:
        _upload()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        if "Bucket not found" in detail:
            _ensure_bucket(base_url=base_url, service_key=service_key, bucket=bucket)
            _upload()
        else:
            raise RuntimeError(
                f"Supabase upload failed ({exc.code}): {detail}"
            ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Supabase upload failed: {exc.reason}") from exc

    return path


def upload_pdf_bytes(*, bucket: str, path: str, data: bytes) -> str:
    return upload_file_bytes(
        bucket=bucket,
        path=path,
        data=data,
        content_type="application/pdf",
    )


def download_pdf_bytes(*, bucket: str, path: str) -> bytes:
    supabase_url = settings.SUPABASE_URL
    service_key = settings.SUPABASE_SERVICE_KEY
    if not supabase_url or not service_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

    base_url = supabase_url.rstrip("/")
    object_url = f"{base_url}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
    }
    
    request = urllib.request.Request(
        object_url,
        headers=headers,
        method="GET",
    )
    
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"Supabase download failed ({exc.code}): {detail}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Supabase download failed: {exc.reason}") from exc


def download_file_bytes(*, bucket: str, path: str) -> bytes:
    return download_pdf_bytes(bucket=bucket, path=path)


def _ensure_bucket(*, base_url: str, service_key: str, bucket: str) -> None:
    bucket_url = f"{base_url}/storage/v1/bucket"
    payload = json.dumps({"id": bucket, "name": bucket, "public": False}).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json",
    }
    request = urllib.request.Request(
        bucket_url,
        data=payload,
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        if exc.code in (400, 409):
            return
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"Supabase bucket create failed ({exc.code}): {detail}"
        ) from exc
