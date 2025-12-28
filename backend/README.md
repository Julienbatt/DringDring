# Backend DringDring

API FastAPI gérant la logique métier, la tarification et la sécurité de DringDring.

## Installation

```bash
pip install -r requirements.txt
```

## Développement

Lancer le serveur de dev :

```bash
uvicorn app.main:app --reload
```

## Tests

Lancer la suite de tests (`pytest`) :

```bash
python -m pytest tests -v
```

## Seeding (Données de test)

Pour peupler la base de données avec des utilisateurs et des configurations de test :

```bash
python scripts/seed.py
```

### Utilisateurs créés
Tous les mots de passe sont : `password`

| Rôle | Email | Contexte |
|------|-------|----------|
| **Super Admin** | `superadmin@dringdring.ch` | Accès total |
| **Admin Région** | `admin_vs@dringdring.ch` | Vélocité Valais |
| **Ville** | `sion@dringdring.ch` | Commune de Sion |
| **HQ** | `migros@dringdring.ch` | Migros Valais |
| **Shop** | `shop_metropole@dringdring.ch` | Migros Métropole (Sion) |
| **Shop (Indé)** | `shop_mario@dringdring.ch` | Chez Mario (Sion, sans HQ) |
| **Client** | `client@dringdring.ch` | Client final (Vue perso) |
