# 🧪 Guide de Test DringDring - Tous les Rôles

## 🚀 Démarrage Rapide

### 1. Backend
```bash
cd backend
docker-compose up -d
```

### 2. Frontend
```bash
cd frontend
npm run dev
```

### 3. Accès
- **Frontend** : http://localhost:3000
- **Backend** : http://localhost:8000
- **API Docs** : http://localhost:8000/docs

---

## 👤 RÔLE 1 : CLIENT

### 🔗 Accès
- **URL** : http://localhost:3000
- **Clic** : Carte "Client" → "Se connecter"

### ✅ Tests à Effectuer

#### **Dashboard Client**
1. **Vérifier les statistiques calculées** :
   - [ ] Nombre total de livraisons
   - [ ] Livraisons du mois
   - [ ] Nombre total de sacs
   - [ ] Moyenne des sacs par livraison
   - [ ] Livraisons à venir
   - [ ] Dernière livraison

2. **Tester les liens rapides** :
   - [ ] "Mes Livraisons" → Page des livraisons
   - [ ] "Mes Statistiques détaillées" → Page statistiques
   - [ ] "Nouvelle livraison" → Page création

#### **Page Livraisons Client**
1. **Filtres avancés** :
   - [ ] Filtre par date (aujourd'hui, semaine, mois)
   - [ ] Filtre par statut
   - [ ] Filtre par magasin
   - [ ] Filtre par montant
   - [ ] Filtre par nombre de sacs
   - [ ] Recherche textuelle

2. **Tri et pagination** :
   - [ ] Tri par date, montant, client, statut
   - [ ] Pagination (25, 50, 100 éléments)
   - [ ] Navigation entre pages

3. **Modification des livraisons** :
   - [ ] Bouton "Modifier" sur livraisons futures
   - [ ] Modal de modification s'ouvre
   - [ ] Validation : pas de modification des livraisons passées
   - [ ] Sauvegarde des modifications

4. **Export CSV** :
   - [ ] Bouton "Exporter CSV"
   - [ ] Téléchargement du fichier
   - [ ] Données correctes dans le CSV

#### **Page Statistiques Client**
1. **Sélection de période** :
   - [ ] Semaine, mois, trimestre, année
   - [ ] Recalcul automatique des données

2. **Métriques calculées** :
   - [ ] Livraisons par magasin
   - [ ] Livraisons par statut
   - [ ] Tendances mensuelles
   - [ ] Magasin préféré
   - [ ] Calcul des économies

---

## 🏪 RÔLE 2 : MAGASIN

### 🔗 Accès
- **URL** : http://localhost:3000
- **Clic** : Carte "Magasin" → "Se connecter"

### ✅ Tests à Effectuer

#### **Dashboard Magasin**
1. **Statistiques calculées** :
   - [ ] Livraisons aujourd'hui
   - [ ] Clients actifs
   - [ ] CA ce mois
   - [ ] Livraisons ce mois
   - [ ] CA total
   - [ ] Moyenne par commande
   - [ ] Livraisons à venir

2. **Actions rapides** :
   - [ ] "Livraison +" → Création livraison
   - [ ] "Clients +" → Ajout client
   - [ ] "Edit Profile" → Profil magasin

#### **Page Livraisons Magasin**
1. **Filtres et recherche** :
   - [ ] Tous les filtres avancés
   - [ ] Recherche intelligente
   - [ ] Tri dynamique

2. **Actions en lot** :
   - [ ] Sélection multiple
   - [ ] Actions groupées
   - [ ] Annulation en lot

3. **Modification des livraisons** :
   - [ ] Bouton "Modifier" fonctionnel
   - [ ] Modal de modification
   - [ ] Validation des conditions

4. **Export et rapports** :
   - [ ] Export CSV
   - [ ] Page rapports détaillés

#### **Page Rapports Magasin**
1. **Analyses par période** :
   - [ ] Livraisons par jour
   - [ ] Livraisons par statut
   - [ ] Top clients
   - [ ] Revenus par mois

---

## 🏢 RÔLE 3 : HQ ADMIN

### 🔗 Accès
- **URL** : http://localhost:3000
- **Clic** : Carte "HQ Admin" → "Se connecter"

### ✅ Tests à Effectuer

#### **Dashboard HQ Admin**
1. **Vue multi-magasins** :
   - [ ] Total magasins
   - [ ] Livraisons aujourd'hui
   - [ ] Revenus totaux
   - [ ] Magasins actifs
   - [ ] Performance par région

2. **Livraisons récentes** :
   - [ ] Liste des 10 dernières livraisons
   - [ ] Informations complètes
   - [ ] Tri par date

#### **Page Livraisons HQ Admin**
1. **Filtres avancés** :
   - [ ] Filtre par magasin
   - [ ] Filtre par région
   - [ ] Tous les autres filtres

2. **Gestion centralisée** :
   - [ ] Modification des livraisons
   - [ ] Vue d'ensemble multi-magasins
   - [ ] Export global

#### **Page Rapports HQ Admin**
1. **Analyses régionales** :
   - [ ] Top magasins
   - [ ] Performance par région
   - [ ] Tendances globales

---

## 🌍 RÔLE 4 : REGIONAL ADMIN

### 🔗 Accès
- **URL** : http://localhost:3000
- **Clic** : Carte "Admin Régional" → "Se connecter"

### ✅ Tests à Effectuer

#### **Dashboard Regional Admin**
1. **Statistiques régionales** :
   - [ ] Total magasins
   - [ ] Total livraisons
   - [ ] Revenus totaux
   - [ ] Coursiers actifs
   - [ ] Cette semaine (livraisons + revenus)
   - [ ] Performance régionale

2. **Données des magasins** :
   - [ ] Tableau des magasins
   - [ ] Livraisons par magasin
   - [ ] Revenus par magasin
   - [ ] Dernière livraison
   - [ ] Statut actif/inactif

3. **Actions rapides** :
   - [ ] Gestion des magasins
   - [ ] Gestion des coursiers
   - [ ] Suivi des livraisons
   - [ ] Analyses régionales

---

## 👑 RÔLE 5 : SUPER ADMIN

### 🔗 Accès
- **URL** : http://localhost:3000
- **Clic** : Carte "Admin" → "Se connecter"

### ✅ Tests à Effectuer

#### **Dashboard Super Admin**
1. **Vue système globale** :
   - [ ] Total utilisateurs
   - [ ] Total magasins
   - [ ] Total livraisons
   - [ ] Revenus totaux
   - [ ] Régions actives
   - [ ] Santé du système

2. **Métriques avancées** :
   - [ ] Performance globale
   - [ ] Ratio d'adoption
   - [ ] Croissance

3. **Alertes système** :
   - [ ] Alertes générées dynamiquement
   - [ ] Types d'alertes (info, warning, error)
   - [ ] Timestamps corrects

4. **Gestion système** :
   - [ ] Gestion des utilisateurs
   - [ ] Gestion des régions
   - [ ] Gestion des enseignes
   - [ ] Configuration système

---

## 🔧 Tests Techniques

### **Backend API**
1. **Endpoints de santé** :
   - [ ] GET /health → 200 OK
   - [ ] GET /docs → Documentation Swagger

2. **Endpoints d'authentification** :
   - [ ] POST /auth/login → Token JWT
   - [ ] GET /auth/me → Informations utilisateur

3. **Endpoints de données** :
   - [ ] GET /test/client/deliveries → Données client
   - [ ] GET /test/shop/deliveries → Données magasin
   - [ ] GET /test/hq-admin/deliveries → Données HQ
   - [ ] GET /test/regional/deliveries → Données régionales
   - [ ] GET /test/super-admin/deliveries → Données globales

4. **Endpoints de modification** :
   - [ ] PUT /client/deliveries/{id} → Modification client
   - [ ] PUT /shop/deliveries/{id} → Modification magasin
   - [ ] PUT /hq-admin/deliveries/{id} → Modification HQ
   - [ ] PUT /regional/deliveries/{id} → Modification régionale
   - [ ] PUT /super-admin/deliveries/{id} → Modification globale

### **Frontend**
1. **Navigation** :
   - [ ] Tous les liens fonctionnent
   - [ ] Breadcrumbs corrects
   - [ ] Retour en arrière

2. **Responsive** :
   - [ ] Mobile (320px+)
   - [ ] Tablette (768px+)
   - [ ] Desktop (1024px+)

3. **Performance** :
   - [ ] Chargement rapide
   - [ ] Pas d'erreurs console
   - [ ] Animations fluides

---

## 🐛 Problèmes Courants

### **Backend ne démarre pas**
```bash
cd backend
docker-compose down
docker-compose up -d
```

### **Frontend ne démarre pas**
```bash
cd frontend
npm install
npm run dev
```

### **Erreurs d'authentification**
- Vérifier la configuration Firebase
- Vérifier les variables d'environnement
- Redémarrer le backend

### **Données ne se chargent pas**
- Vérifier la console du navigateur
- Vérifier les endpoints backend
- Tester avec Postman/curl

---

## ✅ Checklist Finale

- [ ] **Client** : Dashboard + Livraisons + Statistiques
- [ ] **Magasin** : Dashboard + Livraisons + Rapports
- [ ] **HQ Admin** : Dashboard + Livraisons + Rapports
- [ ] **Regional Admin** : Dashboard + Gestion
- [ ] **Super Admin** : Dashboard + Système
- [ ] **Backend** : Tous les endpoints fonctionnels
- [ ] **Frontend** : Navigation + Responsive + Performance

---

## 🎯 Résultat Attendu

**Tous les rôles doivent avoir :**
- ✅ Statistiques calculées en temps réel
- ✅ Modification des livraisons fonctionnelle
- ✅ Filtres et recherche avancés
- ✅ Export CSV opérationnel
- ✅ Interface responsive et moderne
- ✅ Navigation intuitive

**L'application est prête pour la production !** 🚀


