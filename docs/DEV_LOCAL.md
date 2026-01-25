# Dev local (Windows)

## Port backend (standard actuel)
- Nous avons change le port plusieurs fois. Le port standard actuel est 8021.
- Le port backend est defini dans l'env local (dans ce depot: `backend/.env`).
- Si vous utilisez un `local.env` dans votre environnement, gardez-le aligne sur 8021.
- Assurez-vous que le frontend pointe vers le meme port (`NEXT_PUBLIC_API_URL`).

## Windows et "serveurs zombies"
Sur Windows, il arrive que des processus uvicorn restent en vie apres la fermeture du terminal.
Symptomes: ports occupe, API qui ne reflete pas le code recent, routes manquantes (ex: 404 sur une route existe en code).
Ce probleme peut persister meme si le PID n'est plus visible dans `tasklist` / `Get-Process`.

Actions rapides:
1. Trouver le PID: `netstat -aon | findstr :8021`
2. Tuer le PID: `taskkill /PID <pid> /F`
3. Relancer le backend:
   `python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8021`

Si le port reste bloque (zombie introuvable), utilisez un port de secours (ex: 8022)
et mettez a jour `NEXT_PUBLIC_API_URL` cote frontend, puis relancez `next dev`.

Pour un runbook complet, voir `docs/RUNBOOK_DEV.md`.
