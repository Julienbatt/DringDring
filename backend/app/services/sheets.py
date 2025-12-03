from __future__ import annotations

from typing import List, Dict, Any
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os


SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def _get_credentials():
    """
    Get Google Sheets credentials from either file or environment variables.
    Supports both service account JSON file and individual env vars for Docker/Cloud deployments.
    """
    key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    
    # Try file-based credentials first
    if key_path and os.path.exists(key_path):
        return service_account.Credentials.from_service_account_file(key_path, scopes=SHEETS_SCOPES)
    
    # Try environment variable-based credentials
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    
    if project_id and private_key and client_email:
        credentials_dict = {
            "type": "service_account",
            "project_id": project_id,
            "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID", ""),
            "private_key": private_key.replace("\\n", "\n"),
            "client_email": client_email,
            "client_id": os.getenv("FIREBASE_CLIENT_ID", ""),
            "auth_uri": os.getenv("FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
            "token_uri": os.getenv("FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token"),
        }
        return service_account.Credentials.from_service_account_info(credentials_dict, scopes=SHEETS_SCOPES)
    
    raise RuntimeError(
        "Google Sheets credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS or "
        "Firebase environment variables (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)"
    )


def _get_service_and_ensure_sheet(spreadsheet_id: str, sheet_name: str):
    creds = _get_credentials()
    service = build("sheets", "v4", credentials=creds)
    # Ensure sheet exists (create if missing)
    try:
        sheets_meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheet_titles = {s["properties"]["title"] for s in sheets_meta.get("sheets", [])}
        if sheet_name not in sheet_titles:
            batch_update_request_body = {
                "requests": [
                    {"addSheet": {"properties": {"title": sheet_name}}}
                ]
            }
            service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=batch_update_request_body).execute()
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f"Failed to access spreadsheet: {e}")
    return service


def _get_sheet_id(service, spreadsheet_id: str, sheet_name: str) -> int | None:
    try:
        meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        for s in meta.get("sheets", []):
            if s["properties"].get("title") == sheet_name:
                return s["properties"].get("sheetId")
        return None
    except Exception:
        return None


def _ensure_date_time_formats(service, spreadsheet_id: str, sheet_name: str) -> None:
    """Ensure column A (Date) and B (Time) have proper number formats.
    Keeps values as real dates/times so Sheets formulas/pivots work.
    """
    try:
        sheet_id = _get_sheet_id(service, spreadsheet_id, sheet_name)
        if sheet_id is None:
            return
        requests = [
            {
                "repeatCell": {
                    "range": {"sheetId": sheet_id, "startColumnIndex": 0, "endColumnIndex": 1},
                    "cell": {"userEnteredFormat": {"numberFormat": {"type": "DATE", "pattern": "dd.mm.yyyy"}}},
                    "fields": "userEnteredFormat.numberFormat",
                }
            },
            {
                "repeatCell": {
                    "range": {"sheetId": sheet_id, "startColumnIndex": 1, "endColumnIndex": 2},
                    "cell": {"userEnteredFormat": {"numberFormat": {"type": "TIME", "pattern": "HH:mm"}}},
                    "fields": "userEnteredFormat.numberFormat",
                }
            },
        ]
        service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body={"requests": requests}).execute()
    except Exception:
        # Formatting is best-effort; ignore if it fails
        pass


def _sort_by_date_time(service, spreadsheet_id: str, sheet_name: str) -> None:
    try:
        sheet_id = _get_sheet_id(service, spreadsheet_id, sheet_name)
        if sheet_id is None:
            return
        # Sort range A2:T by A asc then B asc
        service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={
                "requests": [
                    {
                        "sortRange": {
                            "range": {
                                "sheetId": sheet_id,
                                "startRowIndex": 1,
                                "startColumnIndex": 0,
                                "endColumnIndex": 20,
                            },
                            "sortSpecs": [
                                {"dimensionIndex": 0, "sortOrder": "ASCENDING"},
                                {"dimensionIndex": 1, "sortOrder": "ASCENDING"},
                            ],
                        }
                    }
                ]
            },
        ).execute()
    except Exception:
        pass


def upsert_sheet(spreadsheet_id: str, sheet_name: str, headers: List[str], rows: List[List[Any]]) -> None:
    service = _get_service_and_ensure_sheet(spreadsheet_id, sheet_name)

    # Clear data rows only (preserve header formatting in row 1)
    service.spreadsheets().values().clear(
        spreadsheetId=spreadsheet_id,
        range=f"{sheet_name}!A2:T",
        body={}
    ).execute()

    # Ensure date/time formats on columns A/B
    _ensure_date_time_formats(service, spreadsheet_id, sheet_name)

    # Optionally ensure headers exist when the sheet is empty
    # We don't overwrite styling; only set headers if missing
    try:
        meta = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range=f"{sheet_name}!A1:T1"
        ).execute()
        have_headers = bool(meta.get("values"))
        if not have_headers:
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption="USER_ENTERED",
                body={"values": [headers]},
            ).execute()
    except Exception:
        pass

    # Write data starting at A2
    if rows:
        body = {"values": rows}
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"{sheet_name}!A2",
            valueInputOption="USER_ENTERED",
            body=body,
        ).execute()
        _sort_by_date_time(service, spreadsheet_id, sheet_name)


def append_rows(spreadsheet_id: str, sheet_name: str, rows: List[List[Any]]) -> int | None:
    """Append rows at the first completely empty row after existing data.
    Returns the 1-based row index of the first inserted row.
    """
    service = _get_service_and_ensure_sheet(spreadsheet_id, sheet_name)
    _ensure_date_time_formats(service, spreadsheet_id, sheet_name)
    try:
        col = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range=f"{sheet_name}!L:L"
        ).execute()
        values = col.get("values", [])
        last = 0
        for idx, v in enumerate(values, start=1):
            if v and any(cell for cell in v):
                last = idx
        start_row = max(2, last + 1)  # keep header at row 1
    except Exception:
        start_row = 2
    # Write rows at computed start_row
    first_row_index = start_row
    rng = f"{sheet_name}!A{start_row}"
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=rng,
        valueInputOption="USER_ENTERED",
        body={"values": rows},
    ).execute()
    return first_row_index


def update_row(spreadsheet_id: str, sheet_name: str, row_index: int, row: List[Any]) -> None:
    service = _get_service_and_ensure_sheet(spreadsheet_id, sheet_name)
    _ensure_date_time_formats(service, spreadsheet_id, sheet_name)
    rng = f"{sheet_name}!A{row_index}:T{row_index}"
    body = {"values": [row]}
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=rng,
        valueInputOption="USER_ENTERED",
        body=body,
    ).execute()


def clear_row(spreadsheet_id: str, sheet_name: str, row_index: int) -> None:
    service = _get_service_and_ensure_sheet(spreadsheet_id, sheet_name)
    rng = f"{sheet_name}!A{row_index}:T{row_index}"
    service.spreadsheets().values().clear(
        spreadsheetId=spreadsheet_id,
        range=rng,
        body={},
    ).execute()


def find_row_by_delivery_id(spreadsheet_id: str, sheet_name: str, delivery_id: str) -> int | None:
    service = _get_service_and_ensure_sheet(spreadsheet_id, sheet_name)
    col = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id, range=f"{sheet_name}!L:L"
    ).execute()
    values = col.get("values", [])
    for idx, v in enumerate(values, start=1):
        if v and len(v) > 0 and v[0] == delivery_id:
            return idx
    return None


def delete_row_by_delivery_id(spreadsheet_id: str, sheet_name: str, delivery_id: str) -> bool:
    service = _get_service_and_ensure_sheet(spreadsheet_id, sheet_name)
    meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    sheet_id = None
    for s in meta.get("sheets", []):
        if s["properties"].get("title") == sheet_name:
            sheet_id = s["properties"].get("sheetId")
            break
    if sheet_id is None:
        return False
    row_index = find_row_by_delivery_id(spreadsheet_id, sheet_name, delivery_id)
    if not row_index or row_index <= 1:
        return False
    # Delete the row (0-based indices in API)
    service.spreadsheets().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body={
            "requests": [
                {
                    "deleteDimension": {
                        "range": {
                            "sheetId": sheet_id,
                            "dimension": "ROWS",
                            "startIndex": row_index - 1,
                            "endIndex": row_index,
                        }
                    }
                }
            ]
        },
    ).execute()
    return True


