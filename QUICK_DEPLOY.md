# ⚡ Déploiement Rapide - DringDring

## 🎯 Déploiement en 5 Minutes

### ✅ Prérequis
- [x] Git installé
- [x] Heroku CLI installé (`heroku --version`)
- [x] Compte Heroku créé
- [x] Compte Vercel créé (via GitHub)
- [x] Compte Firebase créé

---

## 🔧 BACKEND (Heroku) - 3 Étapes

### 1️⃣ Se connecter à Heroku
```powershell
cd backend
heroku login
```
👉 Appuyez sur une touche pour ouvrir le navigateur

### 2️⃣ Créer l'application
```powershell
heroku create dringdring-backend
```
👉 Remplacez `dringdring-backend` par un nom unique

### 3️⃣ Déployer via GitHub
1. Allez sur https://dashboard.heroku.com
2. Sélectionnez votre app
3. **Deploy** → **Connect to GitHub**
4. Sélectionnez votre repo `DringDring`
5. Sélectionnez la branche `main`
6. Cliquez sur **Deploy Branch**

### 4️⃣ Configurer les variables d'environnement
Dans Heroku Dashboard → **Settings** → **Config Vars**, ajoutez :
```
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_PRIVATE_KEY_ID=votre-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=votre-email@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=votre-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
CORS_ORIGIN=https://votre-frontend.vercel.app
```

👉 **Où trouver ces valeurs ?** Firebase Console → Project Settings → Service Accounts → Generate New Private Key

---

## 🎨 FRONTEND (Vercel) - 2 Étapes

### 1️⃣ Déployer via GitHub
1. Allez sur https://vercel.com
2. **Add New Project**
3. Importez votre repo GitHub `DringDring`
4. Configurez :
   - **Root Directory** : `frontend`
   - **Framework** : Next.js (détecté automatiquement)
5. Ajoutez les variables d'environnement :
   ```
   NEXT_PUBLIC_API_URL=https://dringdring-backend.herokuapp.com
   NEXT_PUBLIC_FIREBASE_API_KEY=votre-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=votre-app-id
   ```
6. Cliquez sur **Deploy**

### 2️⃣ Mettre à jour CORS dans Heroku
Après le déploiement Vercel, mettez à jour dans Heroku :
```
CORS_ORIGIN=https://votre-app.vercel.app
```

---

## 🔐 FIREBASE - Configuration

1. Allez sur https://console.firebase.google.com
2. Créez un projet (ou utilisez un existant)
3. Activez **Authentication** → **Email/Password**
4. Créez **Firestore Database** (mode Production)
5. Dans **Project Settings** → **Service Accounts** → **Generate New Private Key**
6. Utilisez le JSON téléchargé pour configurer Heroku

---

## ✅ Vérification

### Backend
```powershell
heroku logs --tail
```
👉 Visitez : `https://dringdring-backend.herokuapp.com/docs`

### Frontend
👉 Visitez votre URL Vercel et testez la connexion

---

## 🐛 Problèmes Courants

### "Application Error" sur Heroku
```powershell
heroku logs --tail
```
👉 Vérifiez les logs pour identifier l'erreur

### CORS Error
👉 Vérifiez que `CORS_ORIGIN` dans Heroku = URL Vercel

### Variables d'environnement manquantes
👉 Vérifiez dans Heroku Dashboard → Settings → Config Vars

---

## 📞 Support

Pour plus de détails, consultez `DEPLOYMENT_GUIDE.md`

