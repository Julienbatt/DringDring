# 🚀 Guide de Déploiement Complet - DringDring

## 📋 Prérequis
- ✅ Heroku CLI installé (`heroku --version`)
- ✅ Git installé (`git --version`)
- ✅ Compte Heroku créé
- ✅ Compte Vercel créé (pour le frontend)
- ✅ Compte Firebase créé (pour l'authentification)

---

## 🔧 PARTIE 1 : DÉPLOIEMENT BACKEND (Heroku)

### Étape 1 : Connexion à Heroku
```powershell
heroku login
```
👉 Appuyez sur une touche pour ouvrir le navigateur et vous connecter

### Étape 2 : Créer l'application Heroku
```powershell
cd backend
heroku create dringdring-backend
```
👉 Remplacez `dringdring-backend` par le nom que vous souhaitez (doit être unique)

### Étape 3 : Configurer les variables d'environnement
```powershell
# Variables Firebase (à récupérer depuis Firebase Console)
heroku config:set FIREBASE_PROJECT_ID=votre-project-id
heroku config:set FIREBASE_PRIVATE_KEY_ID=votre-private-key-id
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
heroku config:set FIREBASE_CLIENT_EMAIL=votre-client-email
heroku config:set FIREBASE_CLIENT_ID=votre-client-id
heroku config:set FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
heroku config:set FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
heroku config:set FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
heroku config:set FIREBASE_CLIENT_X509_CERT_URL=votre-cert-url

# URL de l'API (sera mise à jour après déploiement)
heroku config:set API_URL=https://dringdring-backend.herokuapp.com

# CORS (URL du frontend Vercel)
heroku config:set CORS_ORIGIN=https://votre-frontend.vercel.app
```

### Étape 4 : Déployer le backend
**Option A : Via Git (si le repo est déjà sur GitHub)**
```powershell
# Initialiser Git si ce n'est pas déjà fait
git init
git add .
git commit -m "Initial commit for Heroku deployment"

# Ajouter le remote Heroku
heroku git:remote -a dringdring-backend

# Pousser vers Heroku
git push heroku main
```

**Option B : Via GitHub Integration (RECOMMANDÉ)**
1. Allez sur https://dashboard.heroku.com
2. Sélectionnez votre app `dringdring-backend`
3. Allez dans l'onglet **"Deploy"**
4. Cliquez sur **"Connect to GitHub"**
5. Autorisez Heroku à accéder à votre compte GitHub
6. Sélectionnez votre repository `DringDring`
7. Sélectionnez la branche `main` (ou `master`)
8. Cliquez sur **"Enable Automatic Deploys"** (optionnel)
9. Cliquez sur **"Deploy Branch"**

### Étape 5 : Vérifier le déploiement
```powershell
heroku logs --tail
```
👉 Vérifiez qu'il n'y a pas d'erreurs

### Étape 6 : Tester l'API
```powershell
heroku open
```
👉 Ou visitez : `https://dringdring-backend.herokuapp.com/docs`

---

## 🎨 PARTIE 2 : DÉPLOIEMENT FRONTEND (Vercel)

### Étape 1 : Installer Vercel CLI (optionnel)
```powershell
npm install -g vercel
```

### Étape 2 : Se connecter à Vercel
```powershell
cd frontend
vercel login
```

### Étape 3 : Créer le fichier `.env.local`
Créez `frontend/.env.local` avec :
```env
NEXT_PUBLIC_API_URL=https://dringdring-backend.herokuapp.com
NEXT_PUBLIC_FIREBASE_API_KEY=votre-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=votre-app-id
```

### Étape 4 : Déployer sur Vercel
**Option A : Via Vercel CLI**
```powershell
vercel
```
👉 Suivez les instructions interactives

**Option B : Via GitHub Integration (RECOMMANDÉ)**
1. Allez sur https://vercel.com
2. Cliquez sur **"Add New Project"**
3. Importez votre repository GitHub `DringDring`
4. Configurez :
   - **Framework Preset** : Next.js
   - **Root Directory** : `frontend`
   - **Build Command** : `npm run build` (ou laissez par défaut)
   - **Output Directory** : `.next` (ou laissez par défaut)
5. Ajoutez les variables d'environnement (voir Étape 3)
6. Cliquez sur **"Deploy"**

### Étape 5 : Mettre à jour les variables d'environnement
Après le déploiement, mettez à jour :
- Dans Vercel : Variables d'environnement → Ajoutez `NEXT_PUBLIC_API_URL`
- Dans Heroku : Mettez à jour `CORS_ORIGIN` avec l'URL Vercel

---

## 🔐 PARTIE 3 : CONFIGURATION FIREBASE

### Étape 1 : Créer un projet Firebase
1. Allez sur https://console.firebase.google.com
2. Créez un nouveau projet (ou utilisez un existant)
3. Activez **Authentication** → **Sign-in method** → Activez **Email/Password**

### Étape 2 : Récupérer les clés de service
1. Allez dans **Project Settings** → **Service Accounts**
2. Cliquez sur **"Generate New Private Key"**
3. Téléchargez le fichier JSON
4. Utilisez ces valeurs pour configurer Heroku (voir Partie 1, Étape 3)

### Étape 3 : Configurer Firestore
1. Allez dans **Firestore Database**
2. Créez une base de données en mode **Production**
3. Configurez les règles de sécurité :
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles à adapter selon vos besoins
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## ✅ PARTIE 4 : VÉRIFICATIONS POST-DÉPLOIEMENT

### Backend (Heroku)
```powershell
# Vérifier les logs
heroku logs --tail

# Vérifier les variables d'environnement
heroku config

# Tester l'API
curl https://dringdring-backend.herokuapp.com/test/health
```

### Frontend (Vercel)
1. Visitez votre URL Vercel (ex: `https://dringdring.vercel.app`)
2. Testez la connexion
3. Vérifiez que les appels API fonctionnent (Onglet Réseau du navigateur)

---

## 🔄 PARTIE 5 : MISE À JOUR CONTINUE

### Backend
Si vous utilisez GitHub Integration :
- Poussez vos changements sur GitHub
- Heroku déploiera automatiquement (si activé)

Sinon :
```powershell
git push heroku main
```

### Frontend
Si vous utilisez GitHub Integration :
- Poussez vos changements sur GitHub
- Vercel déploiera automatiquement

Sinon :
```powershell
vercel --prod
```

---

## 🐛 DÉPANNAGE

### Erreur : "Application Error" sur Heroku
```powershell
# Vérifier les logs
heroku logs --tail

# Vérifier que le Procfile est correct
cat Procfile

# Vérifier que requirements.txt est à jour
pip freeze > requirements.txt
```

### Erreur : CORS sur le frontend
- Vérifiez que `CORS_ORIGIN` dans Heroku correspond à l'URL Vercel
- Vérifiez que `NEXT_PUBLIC_API_URL` dans Vercel correspond à l'URL Heroku

### Erreur : Variables d'environnement manquantes
```powershell
# Backend
heroku config

# Frontend (dans Vercel Dashboard)
# Vérifiez dans Settings → Environment Variables
```

---

## 📝 RÉSUMÉ DES URLS

Après déploiement, vous aurez :
- **Backend API** : `https://dringdring-backend.herokuapp.com`
- **Frontend** : `https://dringdring.vercel.app` (ou votre nom personnalisé)
- **API Docs** : `https://dringdring-backend.herokuapp.com/docs`

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Déployer le backend sur Heroku
2. ✅ Déployer le frontend sur Vercel
3. ✅ Configurer Firebase
4. ✅ Tester toutes les fonctionnalités
5. ✅ Configurer un domaine personnalisé (optionnel)

---

**Besoin d'aide ?** Consultez :
- [Documentation Heroku](https://devcenter.heroku.com/)
- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Firebase](https://firebase.google.com/docs)
