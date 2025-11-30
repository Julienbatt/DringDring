# DringDring — Product Vision and Technical Overview

DringDring is a web application enabling partner shops in Sion (up to Bramois) to request and manage home deliveries of grocery bags for their clients. Couriers handle deliveries year-round, supporting local commerce and sustainable mobility.

> Note: This vision synthesizes your `vision.txt` and publicly available information about the Dring Dring Sion service.

## Objectives

- Provide shops with a simple, reliable way to schedule deliveries for their customers
- Offer clients a portal to view and manage their delivery information
- Ensure operational visibility via summaries and day/month/year aggregates
- Keep the solution environmentally aligned with bike-based delivery logistics

## Users and Roles

- Shop user
  - Creates and manages deliveries for their customers
  - Manages shop profile, contact persons, and departments
- Delivery-to client (customer)
  - Reviews past and future deliveries
  - Manages own account details
- App owner/manager (implicit)
  - Access to a global “All Deliveries” dataset across shops

## High-Level Requirements

### Authentication and Access

- Sign up / Sign in flow for both roles (Shop, Delivery-to client)
- Use Google Firebase for authentication
- If a user previously signed in, automatically redirect to the app (remembered session)

### Shop Experience

- Post-login main menu with:
  - “Livraison +” to create a new delivery
  - “Clients +” to add a new client (no edit/delete for shops, only admin)
  - “Edit profile” to edit/delete/add shop data (contacts, departments, etc.)
- “Livraisons en cours” section:
  - Editable table for all deliveries of today and the future (edit/delete rows)
- Aggregated summary table (by year/month/day):
  - Columns: Date, Ticket no, Montant du ticket, # Sacs, Secteur, CMS

#### Create a Delivery (Livraison +)

1. Select client with autocomplete (type to search name/family name)
2. If new client, use “Clients +” to add a client (navigates to client creation page)
3. Fill delivery fields:
   - Employé(e): from the shop’s contact persons list
   - Secteur (optional): from the shop’s departments list
   - Ticket no (optional)
   - Montant du (optional)
   - Livraison aujourd’hui: Oui/Non
   - À partir de: time window 08:00–20:00 in 30-minute steps
   - Nombre de sacs: 0–20
4. Submit via “Commander la livraison”

Upon submission:

- Create a new record in the shop’s “Livraison” dataset (with unique ID)
- Create a new record in the global “Toutes les livraisons” dataset (includes client info, delivery info, shop name) with a unique ID
- Edits/deletes must remain consistent in both datasets

### Client Experience

- Main menu after login
- Can edit/delete their own account
- Dashboard with data visualizations summarizing past deliveries
- Table for upcoming deliveries

## Data Inputs and Validation

### Shop Profile

- Nom du magasin
- Personnes de contact (up to 10)
- Adresse, Numéro de l’adresse, NPA (Swiss format), Ville
- Email, Tél (Swiss format)
- Nombre de départements: 1–10
- For each department: Nom du département 1..10
- CSV import supported (list of shops)

### Delivery-to Client Profile

- Nom, Prénom
- Adresse, Numéro de l’adresse, NPA (Swiss format), Ville
- Email, Tél (Swiss format)
- Étage, Code d’entrée
- CMS (Oui/Non) — indicates CMS beneficiary for discount eligibility
- CSV import supported (list of clients)

### Delivery

- Client reference (existing or created via “Clients +”)
- Employé(e) (from shop contact persons)
- Secteur (optional, from departments)
- Ticket no (optional), Montant du (optional)
- Livraison aujourd’hui (Oui/Non)
- Créneau horaire de départ: 08:00–20:00 in 30-minute steps
- Nombre de sacs: 0–20
- Unique ID for each delivery (globally unique)

## Tarification

### Tarif par nombre de sacs (Sion)
- **1-2 sacs** : 15 CHF (5 CHF facturé au client, 5 CHF au magasin, 5 CHF à la ville)
- **3-4 sacs** : 30 CHF (10 CHF facturé au client, 10 CHF au magasin, 10 CHF à la ville)
- **5-6 sacs** : 45 CHF (15 CHF facturé au client, 15 CHF au magasin, 15 CHF à la ville)
- **Logique** : Tarif par tranche de 2 sacs

### Tarif CMS (bénéficiaires)
- **1-2 sacs** : 10 CHF (tarif réduit pour bénéficiaires CMS)
- **3-4 sacs** : 20 CHF
- **5-6 sacs** : 30 CHF
- **Logique** : Tarif réduit par tranche de 2 sacs

### Tarif par montant de commande (autres magasins)
- **≤ 80 CHF** : 15 CHF
- **> 80 CHF** : 30 CHF
- **Logique** : Basé sur le montant total de la commande

### Système de facturation
Vélocité reçoit le tarif total mais doit facturer les contributions aux autres parties :

#### Exemple : Livraison 15 CHF
- **Vélocité reçoit** : 15 CHF (total de la course)
- **Facture magasin** : 5 CHF (participation au service)
- **Facture client** : 5 CHF (coût de la livraison)
- **Facture autorités** : 5 CHF (soutien à l'activité sociale)

#### Processus de facturation
1. **Livraison effectuée** : Vélocité reçoit 15 CHF
2. **Génération des factures** : 3 factures de 5 CHF chacune
3. **Envoi des factures** :
   - Facture au magasin (5 CHF)
   - Facture au client (5 CHF)
   - Facture aux autorités (5 CHF)
4. **Suivi des paiements** : Traçabilité des règlements

#### Exemple : Livraison 30 CHF (3-4 sacs)
- **Vélocité** : 10 CHF
- **Magasin** : 10 CHF
- **Client** : 10 CHF
- **Autorités** : 10 CHF

#### Logique de répartition
- **Vélocité** : Rémunération du service de livraison et maintenance de la plateforme
- **Magasin** : Participation au service, incitation à utiliser le système
- **Client** : Coût direct de la livraison à domicile
- **Autorités** : Soutien financier à l'activité sociale et à la mobilité durable

### Configuration des tarifs
- **Admin Régional** : Peut modifier les tarifs pour sa région (ex: Vélocité Sion)
- **Tarifs par région** : Chaque région peut avoir ses propres tarifs
- **Tarifs par magasin** : Possibilité de tarifs spécifiques par magasin
- **Historique** : Traçabilité des modifications de tarifs

## Stratégie de connexion

### Page d'accueil publique (`/`)
- **Design attractif** : Interface moderne et accueillante
- **Choix du type d'utilisateur** : 4 cartes distinctes
- **Navigation intuitive** : Boutons clairs pour chaque rôle
- **Informations sur le service** : Présentation de DringDring

### Pages de login spécialisées
- **`/login/shop`** : Interface professionnelle pour les magasins
- **`/login/hq-admin`** : Interface pour les HQ Admin (enseignes)
- **`/login/regional`** : Interface pour les admins régionaux

### Logique de redirection
- **Clients** : Accès direct à `/client` (pas de login requis)
- **Magasins** : Login → `/shop`
- **HQ Admin** : Login → `/hq-admin` (gestion multi-magasin par enseigne)
- **Admins régionaux** : Login → `/regional` (gestion régionale)

### Hiérarchie des rôles
1. **Super Admin** (DringDring) : Accès global, toutes les régions
2. **Regional Admin** (Vélocité Sion) : Gestion régionale, tarifs régionaux
3. **HQ Admin** (Migros Valais) : Gestion des magasins de l'enseigne par région
4. **Magasin** (Metropole Migros Sion) : Gestion du magasin individuel

## Architecture and Tech Stack

- Frontend: Next.js + TypeScript + Tailwind CSS (separate project)
- Backend: Python (separate project) exposing a REST API
  - Suggested: FastAPI for modern, typed REST
- Authentication: Google Firebase (ID tokens verified by backend)
- Database: Firebase (Cloud Firestore) as primary store for shops, clients, and deliveries; optionally Firebase Cloud Storage for CSV imports
- Communication: REST API between frontend and backend

### API Considerations (Illustrative)

- Auth
  - Verify Firebase ID tokens on backend for every request
- Shops
  - Create/Read/Update shop profile data; manage contacts and departments
- Clients
  - Create new clients (shop can add; edit/delete reserved for admin)
  - Client self-service endpoints for their own profile (with proper authorization)
- Deliveries
  - CRUD for deliveries scoped to a shop
  - Ensure edits/deletes propagate to both shop dataset and global dataset
- Reporting
  - Aggregations by day/month/year with columns specified (Date, Ticket no, Montant, #Sacs, Secteur, CMS)

## UX Notes

- Autocomplete for client selection in “Livraison +”
- Clear distinction between “Clients +” (creation) and admin-only client edits/deletes
- Data visualization for client dashboards (past deliveries)
- Inline editable table for “livraisons en cours” (today and future)

## Data and IDs

- Use robust unique identifiers for deliveries and entities (e.g., UUIDv4)
- Keep shop-level and global datasets consistent via transactional updates or outbox pattern

## Constraints and Rules

- Validate Swiss formats for NPA and phone numbers
- Limit contacts to 10 and departments to 1–10
- Time selection strictly in the 08:00–20:00 range at 30-minute intervals

## Imports

- CSV imports for shops and clients (admin or guided flows)

## Out of Scope (for initial release)

- Courier routing/dispatch logic (beyond recording delivery time windows)
- Payment processing
- Multi-language translation (default to FR; consider i18n later)

## References

- Dring Dring Sion – service context and value proposition: https://dringdringsion.ch/


