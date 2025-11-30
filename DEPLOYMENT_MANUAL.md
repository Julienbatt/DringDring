# 🚀 GUIDE DE DÉPLOIEMENT MANUEL - DRINGDRING

**Date** : 27 Octobre 2025  
**Status** : Prêt pour déploiement  

---

## 📋 PRÉREQUIS

### **1. Comptes nécessaires**
- ✅ **Heroku** : https://heroku.com (gratuit)
- ✅ **Vercel** : https://vercel.com (gratuit)
- ✅ **Firebase** : https://firebase.google.com (gratuit)

### **2. Outils à installer**
- ✅ **Git** : https://git-scm.com
- ✅ **Node.js** : https://nodejs.org (déjà installé)
- ✅ **Heroku CLI** : https://devcenter.heroku.com/articles/heroku-cli

---

## 🎯 DÉPLOIEMENT BACKEND (HEROKU)

### **Étape 1 : Préparation**
```bash
# 1. Aller dans le dossier backend
cd backend

# 2. Initialiser Git (si pas déjà fait)
git init

# 3. Ajouter tous les fichiers
git add .

# 4. Premier commit
git commit -m "Initial commit for deployment"
```

### **Étape 2 : Créer l'application Heroku**
```bash
# 1. Se connecter à Heroku (ouvrir le navigateur)
heroku login

# 2. Créer l'application
heroku create dringdring-backend

# 3. Vérifier que l'app est créée
heroku apps
```

### **Étape 3 : Configurer les variables d'environnement**
```bash
# Variables de base
heroku config:set SECRET_KEY="votre-secret-key-super-securise" --app dringdring-backend
heroku config:set JWT_SECRET_KEY="votre-jwt-secret-different" --app dringdring-backend
heroku config:set ALLOWED_ORIGINS="https://dringdring-frontend.vercel.app" --app dringdring-backend

# Variables Firebase (à remplacer par vos vraies valeurs)
heroku config:set FIREBASE_PROJECT_ID="votre-project-id" --app dringdring-backend
heroku config:set FIREBASE_PRIVATE_KEY_ID="votre-private-key-id" --app dringdring-backend
heroku config:set FIREBASE_PRIVATE_KEY="votre-private-key" --app dringdring-backend
heroku config:set FIREBASE_CLIENT_EMAIL="votre-client-email" --app dringdring-backend
heroku config:set FIREBASE_CLIENT_ID="votre-client-id" --app dringdring-backend
heroku config:set FIREBASE_AUTH_URI="https://accounts.google.com/o/oauth2/auth" --app dringdring-backend
heroku config:set FIREBASE_TOKEN_URI="https://oauth2.googleapis.com/token" --app dringdring-backend
```

### **Étape 4 : Déployer**
```bash
# Déployer sur Heroku
git push heroku main

# Vérifier les logs
heroku logs --tail --app dringdring-backend
```

### **Étape 5 : Tester le backend**
```bash
# Tester l'endpoint de santé
curl https://dringdring-backend.herokuapp.com/health

# Ouvrir la documentation API
# https://dringdring-backend.herokuapp.com/docs
```

---

## 🎨 DÉPLOIEMENT FRONTEND (VERCEL)

### **Étape 1 : Préparation**
```bash
# 1. Aller dans le dossier frontend
cd frontend

# 2. Installer les dépendances
npm install

# 3. Tester localement (optionnel)
npm run dev
```

### **Étape 2 : Créer le compte Vercel**
1. Aller sur https://vercel.com
2. Se connecter avec GitHub
3. Autoriser Vercel à accéder à vos repos

### **Étape 3 : Déployer via Vercel Dashboard**
1. **Importer le projet** :
   - Cliquer sur "New Project"
   - Sélectionner votre repo GitHub
   - Choisir le dossier `frontend`

2. **Configuration** :
   - Framework Preset : Next.js
   - Root Directory : `frontend`
   - Build Command : `npm run build`
   - Output Directory : `.next`

3. **Variables d'environnement** :
   ```
   NEXT_PUBLIC_API_URL=https://dringdring-backend.herokuapp.com
   NEXT_PUBLIC_FIREBASE_API_KEY=votre-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=votre-app-id
   ```

4. **Déployer** :
   - Cliquer sur "Deploy"
   - Attendre la fin du build
   - Noter l'URL générée

### **Étape 4 : Mettre à jour l'URL API**
1. Dans Vercel Dashboard
2. Aller dans Settings > Environment Variables
3. Mettre à jour `NEXT_PUBLIC_API_URL` avec l'URL de votre backend
4. Redéployer

---

## 🔧 CONFIGURATION FIREBASE

### **Étape 1 : Créer un projet Firebase**
1. Aller sur https://console.firebase.google.com
2. Créer un nouveau projet : "DringDring"
3. Activer l'authentification
4. Activer Firestore Database

### **Étape 2 : Configurer l'authentification**
1. Aller dans Authentication > Sign-in method
2. Activer "Email/Password"
3. Activer "Google" (optionnel)

### **Étape 3 : Configurer Firestore**
1. Aller dans Firestore Database
2. Créer une base de données
3. Choisir le mode "Test" (pour commencer)
4. Sélectionner une région (europe-west1)

### **Étape 4 : Récupérer les clés**
1. Aller dans Project Settings > General
2. Dans "Your apps", ajouter une app Web
3. Copier les clés de configuration
4. Les ajouter dans Heroku et Vercel

---

## 🧪 TESTS POST-DÉPLOIEMENT

### **Backend Tests**
```bash
# Test de santé
curl https://dringdring-backend.herokuapp.com/health

# Test des statistiques
curl https://dringdring-backend.herokuapp.com/test/client/stats

# Test de la documentation
# Ouvrir : https://dringdring-backend.herokuapp.com/docs
```

### **Frontend Tests**
1. Ouvrir l'URL Vercel
2. Tester la page d'accueil
3. Tester la navigation
4. Tester l'authentification

---

## 🚨 DÉPANNAGE

### **Problèmes courants**

**Backend ne démarre pas :**
```bash
# Vérifier les logs
heroku logs --tail --app dringdring-backend

# Vérifier les variables
heroku config --app dringdring-backend
```

**Frontend ne se connecte pas au backend :**
- Vérifier `NEXT_PUBLIC_API_URL` dans Vercel
- Vérifier `ALLOWED_ORIGINS` dans Heroku
- Vérifier CORS dans le backend

**Erreurs Firebase :**
- Vérifier les clés Firebase
- Vérifier les règles Firestore
- Vérifier l'authentification

---

## 🎉 RÉSULTAT FINAL

**URLs de production :**
- **Backend** : https://dringdring-backend.herokuapp.com
- **Frontend** : https://dringdring-frontend.vercel.app
- **API Docs** : https://dringdring-backend.herokuapp.com/docs

**Coût mensuel : 0€ (gratuit)**

---

## 📞 SUPPORT

Si vous rencontrez des problèmes :
1. Vérifier les logs Heroku : `heroku logs --tail`
2. Vérifier les logs Vercel dans le Dashboard
3. Tester les endpoints API individuellement
4. Vérifier les variables d'environnement

**L'application DringDring sera en ligne en moins de 30 minutes !** 🚀


