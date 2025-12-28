DringDring — Vision technique et architecture de gouvernance territoriale
1. Rôle de l’architecture technique

L’architecture technique de DringDring a pour objectif principal de garantir une neutralité de confiance entre acteurs publics et privés.

Chaque choix technique doit servir :

la territorialité stricte des données,

la non-ambiguïté des responsabilités,

la traçabilité financière,

la maintenabilité long terme.

DringDring n’est pas une application de livraison classique, mais un système de gouvernance territoriale.

2. Principes architecturaux fondamentaux
2.1. Une responsabilité = une source de vérité

Aucune couche ne doit dupliquer la responsabilité d’une autre :

Responsabilité	Source de vérité
Sécurité territoriale	PostgreSQL + RLS (Supabase)
Authentification	Supabase Auth
Logique métier complexe	Backend (FastAPI)
Tarification & versioning	Backend + schéma SCD
UX & visualisation	Frontend (Next.js)
2.2. Écriture centralisée, lecture contrôlée

Toute écriture métier critique (livraisons, tarification, validation) passe exclusivement par le backend

Les lectures peuvent être :

directes depuis Supabase (RLS actif)

ou via le backend pour des vues agrégées

👉 Cette règle évite toute divergence entre logique métier et sécurité.

3. Stack technique retenue
3.1. Frontend

Next.js 16

React 19

App Router

Server Actions

Hébergement : Vercel / Bold.new

Responsabilités :

expérience utilisateur

tableaux de bord par rôle

visualisation et exports

aucune logique métier critique

3.2. Backend

FastAPI (Python)

API REST métier

Hébergement : Fly.io / Railway / Bold.new

Responsabilités :

validation métier

moteur de tarification

orchestration des écritures

génération de snapshots financiers

exposition d’APIs de reporting

3.3. Base de données & Auth

Supabase

PostgreSQL

Row Level Security (RLS)

Supabase Auth

Responsabilités :

stockage durable

sécurité territoriale ultime

auditabilité

reporting SQL

4. Sécurité : articulation Backend ↔ RLS
4.1. Principe clé

Le backend n’est jamais au-dessus de la sécurité de la base.

FastAPI agit au nom de l’utilisateur authentifié, jamais en super-admin opaque.

4.2. Flux d’authentification

L’utilisateur s’authentifie via Supabase Auth

Le frontend reçoit un JWT utilisateur

Le JWT est transmis au backend

FastAPI :

vérifie le JWT

extrait les claims (id, rôle, territoire)

Les requêtes vers PostgreSQL sont exécutées :

avec le contexte JWT actif

ou via des RPC SQL protégées par RLS

👉 Les politiques RLS restent le garde-fou ultime, même en cas de bug backend.

5. Modèle de données : principes directeurs
5.1. Livraison modulaire (éviter la “God Table”)

La livraison est l’objet central, mais décomposé par responsabilité :

delivery : identité, rattachements territoriaux

delivery_logistics : créneaux, sacs, adresse

delivery_financial : snapshot financier (immuable)

delivery_status : états et transitions

👉 Cela permet :

de corriger la logistique sans toucher aux finances

de verrouiller les montants après facturation

d’auditer chaque dimension séparément

5.2. Tarification historisée (SCD Type 2)

Les tarifs sont versionnés

Un tarif n’est jamais modifié, seulement clôturé

Chaque livraison référence une version précise

Les montants calculés sont copiés dans la livraison

👉 Aucune livraison passée n’est jamais recalculée.

6. Moteur de tarification
6.1. Localisation de la logique

Le moteur de tarification vit dans le backend FastAPI.

Raisons :

lisibilité

testabilité

évolutivité

explicabilité pour des acteurs non techniques

6.2. Fonctionnement

Lors de la création ou validation d’une livraison :

Identification du tarif applicable

Application des règles (sacs, CMS, montant)

Calcul du prix total

Calcul de la répartition (client / shop / collectivité)

Création d’un snapshot financier

Persistance définitive

7. Reporting & audit

reporting principalement basé sur SQL

vues matérialisées possibles

exports CSV / PDF générés côté backend

toutes les données financières sont traçables à la ligne de livraison

8. Coût et sobriété technique

Les choix techniques visent :

un coût mensuel faible

une montée en charge progressive

un minimum de services externes

Objectif :

rester compatible avec des budgets associatifs et publics

éviter toute dépendance cloud propriétaire inutile

9. Conclusion

L’architecture technique de DringDring est conçue pour :

garantir la confiance entre acteurs publics et privés

empêcher toute dérive de sécurité territoriale

assurer une traçabilité financière irréprochable

rester maintenable et sobre dans le temps

Ce document constitue le cadre technique de référence du projet.

🔒 Document normatif

Toute implémentation doit être conforme à ce document.
Toute déviation doit être explicitement discutée et justifiée.