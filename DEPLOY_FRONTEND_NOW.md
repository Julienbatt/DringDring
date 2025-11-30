# 🚀 Déploiement Frontend Vercel - Guide Étape par Étape

## 📋 Statut Actuel

✅ **Backend Heroku** : Déployé et fonctionnel  
- URL : `https://dringdring-backend-11897a1e3635.herokuapp.com`
- Firebase : Configuré avec la nouvelle clé

⏳ **Frontend Vercel** : À déployer maintenant

---

## 🎯 ÉTAPE 1 : Préparer le Code

### 1.1 Vérifier que tout est commité

```powershell
git status
```

Si des fichiers sont modifiés :

```powershell
git add .
git commit -m "Fix: Update types and prepare for Vercel deployment"
git push origin main
```

---

## 🎯 ÉTAPE 2 : Aller sur Vercel

👉 **https://vercel.com**

1. Connectez-vous avec votre compte GitHub
2. Si c'est votre première fois, autorisez Vercel à accéder à vos repositories

---

## 🎯 ÉTAPE 3 : Créer un Nouveau Projet

1. Cliquez sur **"Add New Project"** ou **"Import Project"**
2. Sélectionnez votre repository **`DringDring`** (ou le nom de votre repo GitHub)
3. Cliquez sur **"Import"**

---

## 🎯 ÉTAPE 4 : Configurer le Projet

**⚠️ CONFIGURATION CRITIQUE** :

### Root Directory
- **Root Directory** : `frontend` ⚠️ **TRÈS IMPORTANT !**
  - Cliquez sur **"Edit"** à côté de "Root Directory"
  - Entrez : `frontend`
  - Cliquez sur **"Continue"**

### Framework
- **Framework Preset** : Next.js (détecté automatiquement) ✅

### Build Settings
- **Build Command** : `npm run build` (par défaut) ✅
- **Output Directory** : `.next` (par défaut) ✅
- **Install Command** : `npm install` (par défaut) ✅

---

## 🎯 ÉTAPE 5 : Configurer les Variables d'Environnement

**⚠️ IMPORTANT : Ajoutez ces variables AVANT de cliquer sur "Deploy" !**

### 5.1 Variables Backend (API)

Cliquez sur **"Environment Variables"** et ajoutez :

```
NEXT_PUBLIC_API_BASE_URL
Valeur : https://dringdring-backend-11897a1e3635.herokuapp.com
Environnements : Production, Preview, Development (cochez les 3)
```

### 5.2 Variables Firebase

Vous avez déjà ces valeurs depuis Firebase Console. Ajoutez-les :

```
NEXT_PUBLIC_FIREBASE_API_KEY
Valeur : VOTRE_FIREBASE_API_KEY (récupérer depuis Firebase Console → Project Settings → General → Your apps)
Environnements : Production, Preview, Development

NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
Valeur : dringdring-11a84.firebaseapp.com
Environnements : Production, Preview, Development

NEXT_PUBLIC_FIREBASE_PROJECT_ID
Valeur : dringdring-11a84
Environnements : Production, Preview, Development

NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
Valeur : dringdring-11a84.firebasestorage.app
Environnements : Production, Preview, Development

NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Valeur : 992333150262
Environnements : Production, Preview, Development

NEXT_PUBLIC_FIREBASE_APP_ID
Valeur : 1:992333150262:web:8ac2c2f09ca9f1ba2a8097
Environnements : Production, Preview, Development

NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
Valeur : G-TJXL6QTPJ1
Environnements : Production, Preview, Development
```

**Comment ajouter :**
1. Cliquez sur **"Add"** pour chaque variable
2. Entrez le nom (ex: `NEXT_PUBLIC_FIREBASE_API_KEY`)
3. Entrez la valeur
4. Cochez **Production**, **Preview**, et **Development**
5. Cliquez sur **"Save"**

---

## 🎯 ÉTAPE 6 : Déployer

1. Une fois toutes les variables ajoutées, cliquez sur **"Deploy"**
2. Attendez 2-5 minutes pendant le build
3. Vous verrez les logs de build en temps réel
4. Une fois terminé, vous obtiendrez une URL comme : `https://dringdring-xxx.vercel.app`

---

## 🎯 ÉTAPE 7 : Mettre à Jour CORS dans Heroku

Une fois que vous avez l'URL Vercel (ex: `https://dringdring-xxx.vercel.app`) :

```powershell
heroku config:set CORS_ORIGIN=https://dringdring-xxx.vercel.app -a dringdring-backend
```

**Remplacez `dringdring-xxx.vercel.app` par votre vraie URL Vercel !**

---

## 🎯 ÉTAPE 8 : Configurer Firebase Authorized Domains

1. Allez sur : https://console.firebase.google.com/project/dringdring-11a84/authentication/settings
2. Dans la section **"Authorized domains"**, vérifiez que `*.vercel.app` est présent
3. Si votre URL Vercel est différente, ajoutez-la manuellement

---

## 🎯 ÉTAPE 9 : Tester l'Application

1. Ouvrez votre URL Vercel dans le navigateur
2. Testez la connexion avec Firebase
3. Ouvrez la console du navigateur (F12) pour vérifier les erreurs
4. Testez quelques fonctionnalités (navigation, API calls, etc.)

---

## 🐛 Dépannage

### Erreur : "Build failed"

**Vérifiez les logs dans Vercel Dashboard :**
- Cliquez sur votre déploiement
- Regardez les logs de build
- Les erreurs courantes :
  - Variables d'environnement manquantes
  - Erreurs TypeScript/ESLint
  - Dépendances manquantes

### Erreur : "Environment variable not found"

- Vérifiez que toutes les variables `NEXT_PUBLIC_*` sont configurées
- Vérifiez que les variables sont ajoutées pour **Production**, **Preview**, et **Development**

### Erreur : "CORS error" dans le navigateur

- Vérifiez que `CORS_ORIGIN` dans Heroku correspond à l'URL Vercel
- Vérifiez que l'URL ne se termine pas par un `/`
- Redémarrez Heroku : `heroku restart -a dringdring-backend`

### Erreur : "Firebase: Error (auth/unauthorized-domain)"

- Ajoutez votre domaine Vercel dans Firebase Console → Authentication → Settings → Authorized domains

---

## ✅ Checklist Finale

- [ ] Code commité et poussé sur GitHub
- [ ] Projet créé sur Vercel
- [ ] Root Directory configuré : `frontend`
- [ ] Variables d'environnement ajoutées (8 variables)
- [ ] Déploiement réussi
- [ ] URL Vercel obtenue
- [ ] CORS_ORIGIN mis à jour dans Heroku
- [ ] Domaine autorisé dans Firebase
- [ ] Application testée et fonctionnelle

---

## 🔗 URLs Importantes

- **Frontend Vercel** : `https://votre-app.vercel.app` (à obtenir après déploiement)
- **Backend Heroku** : `https://dringdring-backend-11897a1e3635.herokuapp.com`
- **Firebase Console** : https://console.firebase.google.com/project/dringdring-11a84
- **Vercel Dashboard** : https://vercel.com/dashboard
- **Heroku Dashboard** : https://dashboard.heroku.com/apps/dringdring-backend

---

**🎉 Une fois ces étapes terminées, votre application DringDring sera complètement déployée et en ligne !**

