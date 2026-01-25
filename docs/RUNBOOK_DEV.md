# Runbook dev (serveurs)

Ce runbook est pour relancer proprement backend + frontend en local (Windows).

## 1) Verifier le port backend
- Port standard actuel: 8021
- Source: `backend/.env` (ou `local.env` si vous en utilisez un)
- Frontend doit pointer vers `http://127.0.0.1:8021/api/v1`
- Si 8021 est bloque par un zombie, utilisez un port de secours (ex: 8022)
  et mettez a jour `NEXT_PUBLIC_API_URL`.

## 2) Arreter les serveurs zombies (Windows)
Quand un terminal est ferme brutalement, uvicorn peut rester actif.
Symptomes: port occupe, API qui ne correspond pas au code, 404 sur des routes pourtant presentes.

Commandes:
1. Trouver les PIDs:
   `netstat -aon | findstr :8021`
2. Tuer chaque PID:
   `taskkill /PID <pid> /F`

## 3) Relancer le backend
Depuis la racine du depot:
`python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8021`

Option (log files):
`python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8021 > backend-8021.out.log 2> backend-8021.err.log`

Si 8021 reste bloque malgre les kill, utiliser 8022 et mettre a jour:
`NEXT_PUBLIC_API_URL=http://127.0.0.1:8022/api/v1`

## 4) Relancer le frontend
Depuis `frontend/`:
`npm run dev`

## 5) Verification rapide
- Backend: `http://127.0.0.1:8021/api/v1/health`
- Frontend: `http://localhost:3000`
