# ✅ Checklist de Déploiement Vercel - Prêt à l'Emploi

## 🎯 Statut : Code Prêt pour Déploiement

✅ Code commité et poussé sur GitHub  
✅ Types TypeScript corrigés  
✅ Sécurité Firebase mise à jour  
✅ Backend Heroku fonctionnel  

---

## 📋 ÉTAPES POUR DÉPLOYER SUR VERCEL

### Étape 1 : Aller sur Vercel

👉 **https://vercel.com**

1. Connectez-vous avec GitHub
2. Autorisez Vercel à accéder à vos repositories

---

### Étape 2 : Créer le Projet

1. Cliquez sur **"Add New Project"**
2. Sélectionnez le repository **`DringDring`**
3. Cliquez sur **"Import"**

---

### Étape 3 : Configuration (CRITIQUE)

#### ⚠️ Root Directory
1. Cliquez sur **"Edit"** à côté de "Root Directory"
2. Entrez : **`frontend`**
3. Cliquez sur **"Continue"**

#### Framework
- Next.js (auto-détecté) ✅

#### Build Settings
- Build Command : `npm run build` ✅
- Output Directory : `.next` ✅

---

### Étape 4 : Variables d'Environnement

**⚠️ AJOUTEZ CES 8 VARIABLES AVANT DE DÉPLOYER !**

Cliquez sur **"Environment Variables"** et ajoutez :

#### 1. API Backend
```
Nom : NEXT_PUBLIC_API_BASE_URL
Valeur : https://dringdring-backend-11897a1e3635.herokuapp.com
Environnements : ☑ Production ☑ Preview ☑ Development
```

#### 2. Firebase API Key
```
Nom : NEXT_PUBLIC_FIREBASE_API_KEY
Valeur : VOTRE_FIREBASE_API_KEY (récupérer depuis Firebase Console)
Environnements : ☑ Production ☑ Preview ☑ Development
```

#### 3. Firebase Auth Domain
```
Nom : NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
Valeur : dringdring-11a84.firebaseapp.com
Environnements : ☑ Production ☑ Preview ☑ Development
```

#### 4. Firebase Project ID
```
Nom : NEXT_PUBLIC_FIREBASE_PROJECT_ID
Valeur : dringdring-11a84
Environnements : ☑ Production ☑ Preview ☑ Development
```

#### 5. Firebase Storage Bucket
```
Nom : NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
Valeur : dringdring-11a84.firebasestorage.app
Environnements : ☑ Production ☑ Preview ☑ Development
```

#### 6. Firebase Messaging Sender ID
```
Nom : NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Valeur : 992333150262
Environnements : ☑ Production ☑ Preview ☑ Development
```

#### 7. Firebase App ID
```
Nom : NEXT_PUBLIC_FIREBASE_APP_ID
Valeur : 1:992333150262:web:8ac2c2f09ca9f1ba2a8097
Environnements : ☑ Production ☑ Preview ☑ Development
```

#### 8. Firebase Measurement ID
```
Nom : NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
Valeur : G-TJXL6QTPJ1
Environnements : ☑ Production ☑ Preview ☑ Development
```

---

### Étape 5 : Déployer

1. Vérifiez que toutes les 8 variables sont ajoutées
2. Cliquez sur **"Deploy"**
3. Attendez 2-5 minutes
4. **Notez l'URL Vercel** (ex: `https://dringdring-xxx.vercel.app`)

---

### Étape 6 : Mettre à Jour CORS

Une fois l'URL Vercel obtenue, exécutez :

```powershell
heroku config:set CORS_ORIGIN=https://VOTRE-URL-VERCEL.vercel.app -a dringdring-backend
heroku restart -a dringdring-backend
```

**Remplacez `VOTRE-URL-VERCEL.vercel.app` par votre vraie URL !**

---

### Étape 7 : Tester

1. Ouvrez votre URL Vercel
2. Testez la connexion
3. Vérifiez la console (F12)
4. Testez les fonctionnalités

---

## ✅ Checklist Finale

- [ ] Projet créé sur Vercel
- [ ] Root Directory = `frontend`
- [ ] 8 variables d'environnement ajoutées
- [ ] Déploiement réussi
- [ ] URL Vercel obtenue
- [ ] CORS mis à jour dans Heroku
- [ ] Application testée

---

**🎉 Votre application sera en ligne !**

