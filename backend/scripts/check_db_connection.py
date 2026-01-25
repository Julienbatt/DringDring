import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.config import settings


def main():
    try:
        conn = psycopg.connect(settings.DATABASE_URL, connect_timeout=5)
        conn.close()
        print("DB connection OK")
    except Exception as exc:
        print(f"DB connection failed: {exc}")


if __name__ == "__main__":
    main()
