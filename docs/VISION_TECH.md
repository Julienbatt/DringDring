# VISION_TECH.md  
## DringDring — Vision technique et architecture

### 1. Objectifs techniques

La stack technique de DringDring doit garantir :
- séparation claire des responsabilités,
- sécurité par défaut,
- évolutivité multi-territoires,
- auditabilité des données,
- déploiement industriel reproductible.

### 2. Architecture générale

DringDring adopte une architecture découplée :

- Frontend : Next.js 16 (React 19, App Router)
- Backend : FastAPI (Python)
- Base de données : Supabase (PostgreSQL + RLS)
- Authentification : Supabase Auth
- Déploiement : Docker (backend), Vercel / Bold.new (frontend)

Chaque couche est déployable indépendamment.

### 3. Modèle de sécurité

La sécurité repose sur :
- RBAC (gestion des rôles)
- ABAC (accès basé sur les attributs métier)

Les règles d’accès sont appliquées :
- côté base de données via Supabase RLS,
- côté backend pour validation métier,
- côté frontend pour l’UX (jamais comme seule barrière).

### 4. Domaines métier backend

Le backend est structuré par domaines :

- auth
- users
- shops
- hq
- admins_regionaux
- cities
- deliveries
- tariffs
- reporting

Chaque domaine expose ses routes, ses règles et ses validations.

### 5. Livraison (modèle central)

Une livraison contient notamment :
- shop_id
- hq_id
- admin_region_id
- city_id
- canton_id
- date
- nombre de sacs
- coûts (total, subventionné, facturable)
- statut (créée, validée, facturée)

Toutes les vues sont dérivées de ce modèle unique.

### 6. Observabilité et qualité

- endpoints `/health` et `/ready`
- logs structurés
- traçabilité des modifications
- migrations versionnées
- séparation stricte runtime / tests

### 7. Évolutivité

L’architecture permet :
- ajout de nouveaux cantons,
- ajout de nouveaux opérateurs,
- ajout de nouvelles villes financeuses,
- extension à d’autres pays sans remise en cause du modèle.
