# Plan de Refonte : Facturation Multi-Payeurs & Swiss QR Bill
Status: **DRAFT**
Date: 2026-01-20

Ce document détaille le plan de mise à niveau du système de facturation pour supporter l'agrégation multi-payeurs (HQ, Communes, Indépendants) et la conformité stricte Swiss QR Bill.

## 1. Objectifs
1.  **Facturer les bons payeurs** : Ne plus facturer par Shop, mais regrouper par Entité Payeuse (Siège, Commune, Indépendant).
2.  **Conformité Bancaire** : Produire des QR-Factures strictement conformes aux normes SIX (Dimensions, Croix Suisse, Adresses structurées).
3.  **Reporting Commune** : Fournir aux communes une facture propre pour leurs subventions, séparée des commerces.

## 2. Architecture de Données (Phase 1)
Nous devons passer d'un modèle "Shop-Centric" à un modèle "Payeur-Centric".

### Nouvelle Table : `invoices`
Cette table centralise tous les documents de facturation générés.

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT UNIQUE NOT NULL,  -- Référence unique pour le QR (ex: RF...)
    
    -- Le Payeur
    recipient_type TEXT NOT NULL,           -- 'HQ', 'CITY', 'SHOP'
    recipient_id UUID NOT NULL,             -- ID de la table correspondante
    recipient_name TEXT NOT NULL,           -- Snapshot du nom au moment de la facture
    recipient_address JSONB NOT NULL,       -- Snapshot de l'adresse structurée
    
    -- Détails financiers
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount_total NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CHF',
    
    -- Métadonnées
    status TEXT NOT NULL DEFAULT 'DRAFT',   -- DRAFT, GENERATED, SENT, PAID, CANCELLED
    pdf_url TEXT,                           -- Chemin dans le stockage (S3/Supabase)
    created_at TIMESTAMPTZ DEFAULT now(),
    generated_at TIMESTAMPTZ
);
```

### Table de liaison (Optionnelle mais recommandée)
Pour lier les livraisons à une facture (auditabilité).
`invoice_items` ou modification de `delivery_financial`.

## 3. Logique d'Agrégation (Phase 2)
Un nouveau service `BillingAggregator` sera responsable de :
1.  Scanner les `billing_period` gelées (ou les livraisons validées).
2.  Grouper les coûts selon les règles :
    *   **Part Shop** : 
        *   Si Shop Indépendant -> Facture SHOP.
        *   Si Shop lié à un HQ -> Facture HQ (agrégée).
    *   **Part Client** :
        *   Si encaissé par Shop -> Ajouté à la facture Shop/HQ.
        *   Si encaissé par Coursier -> Hors facture (déjà payé).
    *   **Part Commune** : -> Facture CITY.
    *   **Part Admin Région** : C'est le revenu, pas une facture (sauf si commission inverse, mais hors scope ici).

## 4. Moteur PDF & QR Bill (Phase 3)
Refonte complète de `backend/app/pdf` pour utiliser des coordonnées absolues et respecter le layout 210x105mm.

### Spécifications Techniques
*   **Librairie** : ReportLab (existante).
*   **QR Code** : Utilisation stricte de la logique de génération de trame QR (déjà présente mais à vérifier) + Dessin vectoriel de la Croix Suisse.
*   **Mise en page** : 
    *   La section QR doit être en bas de la page A4.
    *   Doit inclure la ligne de séparation (ciseaux) si imprimé sur A4 blanc.
    *   Support des adresses structurées (Rue / Numéro séparés).

## 5. Interface Admin (Phase 4)
Mise à jour de la page `/admin/billing`.
*   Vue "Factures" (Liste des `invoices` générées).
*   Filtres par Type de Payeur (HQ, Mairie, Shop).
*   Bouton "Générer les factures du mois" (Lance l'agrégateur).

## 6. Étapes d'Implémentation
1.  **Migration DB** : Créer la table `invoices`.
2.  **Service Agrégation** : Coder la logique Python de regroupement.
3.  **Service PDF** : Coder le `SwissQRRenderer`.
4.  **API Endpoints** : Exposer les factures au frontend.
5.  **Frontend Update** : Afficher et télécharger les factures.
