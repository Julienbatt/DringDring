Relancer les serveurs (backend + frontend) proprement.

1. Verifier que le port backend standard est 8021 (voir `backend/.env` ou `local.env`).
2. Tuer les processus zombies sur 8021:
   - `netstat -aon | findstr :8021`
   - `taskkill /PID <pid> /F`
3. Relancer le backend depuis la racine:
   - `python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8021`
4. Relancer le frontend depuis `frontend/`:
   - `npm run dev`
5. Verifier:
   - `http://127.0.0.1:8021/api/v1/health`
   - `http://localhost:3000`
