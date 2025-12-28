from contextlib import contextmanager
import psycopg
from app.core.config import settings

@contextmanager
def get_db_connection(jwt_claims: str):
    """
    Manage the PostgreSQL connection with the JWT passed in the session.
    """
    # Force IPv4 by adding hostaddr (resolved manually).
    # Parse DATABASE_URL to extract components and inject hostaddr.
    import re
    
    # Parse DATABASE_URL
    # Format: postgresql://user:pass@host:port/dbname
    match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', settings.DATABASE_URL)
    
    if not match:
        raise ValueError("DATABASE_URL format invalide")
    
    user, password, host, port, dbname = match.groups()
    
    # Manual DNS resolution to force IPv4.
    import socket
    try:
        # Forcer IPv4 avec AF_INET
        ipv4 = socket.getaddrinfo(host, None, socket.AF_INET)[0][4][0]
        print(f"Resolved {host} -> IPv4: {ipv4}")
    except socket.gaierror:
        print(f"Unable to resolve {host} to IPv4, using hostname fallback...")
        ipv4 = host  # Fallback to hostname on failure.
    
    # Construire la connection string avec hostaddr
    conn_params = {
        "user": user,
        "password": password,
        "host": host,
        "hostaddr": ipv4,  # FORCE l'utilisation de l'IPv4
        "port": port,
        "dbname": dbname.split('?')[0],  # Remove query params (e.g. ?pgbouncer=true).
        "options": f"-c search_path=public -c statement_timeout=30000 -c request.jwt.claims='{jwt_claims}'",
    }
    
    conn = psycopg.connect(**conn_params)
    try:
        yield conn
    finally:
        conn.close()
