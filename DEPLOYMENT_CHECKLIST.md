# ✅ Checklist de Déploiement - DringDring

## 🎯 Statut Actuel

### ✅ Backend (Heroku)
- [x] Application créée : `dringdring-backend`
- [x] Code déployé
- [x] Firebase configuré
- [x] API fonctionnelle : https://dringdring-backend-11897a1e3635.herokuapp.com
- [x] Tests réussis

### ⏳ Frontend (Vercel)
- [ ] À déployer
- [ ] Variables d'environnement à configurer

---

## 🚀 Étapes pour Déployer le Frontend

### 1. Préparer le Code (Si nécessaire)

```powershell
cd frontend
git status
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Aller sur Vercel

👉 **https://vercel.com**

### 3. Créer un Nouveau Projet

1. Cliquez sur **"Add New Project"**
2. Connectez-vous avec GitHub si nécessaire
3. Sélectionnez votre repository `DringDring`

### 4. Configurer le Projet

**IMPORTANT** :
- **Root Directory** : `frontend` ⚠️
- **Framework** : Next.js (détecté automatiquement)
- **Build Command** : `npm run build` (par défaut)
- **Output Directory** : `.next` (par défaut)

### 5. Ajouter les Variables d'Environnement

**AVANT de cliquer sur "Deploy"**, ajoutez ces variables :

#### API Backend
```
NEXT_PUBLIC_API_BASE_URL=https://dringdring-backend-11897a1e3635.herokuapp.com
```

#### Firebase (À récupérer depuis Firebase Console)

1. Allez sur : https://console.firebase.google.com/project/dringdring-11a84/settings/general
2. Dans **"Your apps"**, trouvez ou créez une app web
3. Copiez les valeurs et ajoutez-les :

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dringdring-11a84.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dringdring-11a84
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dringdring-11a84.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 6. Déployer

Cliquez sur **"Deploy"** et attendez 2-5 minutes.

### 7. Obtenir l'URL Vercel

Une fois déployé, vous obtiendrez une URL comme :
`https://dringdring-xxx.vercel.app`

### 8. Mettre à jour CORS dans Heroku

```powershell
cd backend
heroku config:set CORS_ORIGIN=https://votre-app.vercel.app -a dringdring-backend
```

### 9. Configurer Firebase

1. Allez sur : https://console.firebase.google.com/project/dringdring-11a84/authentication/settings
2. Dans **"Authorized domains"**, ajoutez votre domaine Vercel

### 10. Tester

1. Ouvrez votre URL Vercel
2. Testez la connexion
3. Vérifiez la console du navigateur (F12)

---

## 📋 Variables d'Environnement Résumé

### Backend (Heroku) ✅
- `FIREBASE_PROJECT_ID` ✅
- `FIREBASE_PRIVATE_KEY` ✅
- `FIREBASE_CLIENT_EMAIL` ✅
- `FIREBASE_CLIENT_ID` ✅
- `FIREBASE_AUTH_URI` ✅
- `FIREBASE_TOKEN_URI` ✅
- `API_URL` ✅
- `CORS_ORIGIN` ⏳ (à mettre à jour avec l'URL Vercel)

### Frontend (Vercel) ⏳
- `NEXT_PUBLIC_API_BASE_URL` ⏳
- `NEXT_PUBLIC_FIREBASE_API_KEY` ⏳
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` ⏳
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` ⏳
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` ⏳
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` ⏳
- `NEXT_PUBLIC_FIREBASE_APP_ID` ⏳

---

## 🔗 URLs Importantes

- **Backend API** : https://dringdring-backend-11897a1e3635.herokuapp.com
- **API Docs** : https://dringdring-backend-11897a1e3635.herokuapp.com/docs
- **Firebase Console** : https://console.firebase.google.com/project/dringdring-11a84
- **Vercel Dashboard** : https://vercel.com/dashboard
- **Frontend** : `https://votre-app.vercel.app` (à obtenir après déploiement)

---

## 📚 Documentation

- `DEPLOY_FRONTEND_VERCEL.md` : Guide détaillé pour Vercel
- `FIREBASE_CONFIG_GUIDE.md` : Guide de configuration Firebase
- `TEST_HEROKU_BACKEND.md` : Guide de test du backend

---

**🎯 Prochaine étape : Déployer le frontend sur Vercel !**

