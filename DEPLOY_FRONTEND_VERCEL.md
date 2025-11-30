# 🚀 Déploiement Frontend sur Vercel - DringDring

## 📋 Prérequis

- ✅ Compte Vercel créé (via GitHub)
- ✅ Repository GitHub avec le code du frontend
- ✅ Backend déployé sur Heroku (✅ Fait)
- ✅ Variables Firebase récupérées depuis Firebase Console

---

## 🎯 Méthode Recommandée : Via GitHub Integration

### Étape 1 : Préparer le Repository GitHub

Assurez-vous que votre code est sur GitHub :
```powershell
cd frontend
git status
```

Si des changements ne sont pas commités :
```powershell
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Étape 2 : Créer un Projet sur Vercel

1. Allez sur **https://vercel.com**
2. Cliquez sur **"Add New Project"** ou **"Import Project"**
3. Si vous n'êtes pas connecté, connectez-vous avec votre compte GitHub
4. Autorisez Vercel à accéder à vos repositories GitHub

### Étape 3 : Importer le Repository

1. Sélectionnez votre repository `DringDring` (ou le nom de votre repo)
2. Vercel détectera automatiquement que c'est un projet Next.js
3. **Configuration importante** :
   - **Framework Preset** : Next.js (détecté automatiquement)
   - **Root Directory** : `frontend` ⚠️ **IMPORTANT !**
   - **Build Command** : `npm run build` (ou laissez par défaut)
   - **Output Directory** : `.next` (ou laissez par défaut)
   - **Install Command** : `npm install` (ou laissez par défaut)

### Étape 4 : Configurer les Variables d'Environnement

**AVANT de cliquer sur "Deploy"**, ajoutez les variables d'environnement :

#### Variables Backend (API)
```
NEXT_PUBLIC_API_BASE_URL=https://dringdring-backend-11897a1e3635.herokuapp.com
```

#### Variables Firebase (À récupérer depuis Firebase Console)

1. Allez sur https://console.firebase.google.com/project/dringdring-11a84/settings/general
2. Dans la section **"Your apps"**, trouvez ou créez une app web
3. Copiez les valeurs et ajoutez-les dans Vercel :

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza... (votre clé API)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dringdring-11a84.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dringdring-11a84
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dringdring-11a84.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... (votre sender ID)
NEXT_PUBLIC_FIREBASE_APP_ID=... (votre app ID)
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=... (optionnel, pour Analytics)
```

**Comment ajouter les variables dans Vercel :**
1. Dans la page de configuration du projet, trouvez la section **"Environment Variables"**
2. Cliquez sur **"Add"** pour chaque variable
3. Entrez le nom et la valeur
4. Sélectionnez les environnements : **Production**, **Preview**, **Development**

### Étape 5 : Déployer

1. Cliquez sur **"Deploy"**
2. Attendez que le build se termine (2-5 minutes)
3. Une fois terminé, vous obtiendrez une URL comme : `https://dringdring-xxx.vercel.app`

---

## 🔄 Méthode Alternative : Via Vercel CLI

### Installation de Vercel CLI

```powershell
npm install -g vercel
```

### Connexion

```powershell
vercel login
```

### Déploiement

```powershell
cd frontend
vercel
```

Suivez les instructions interactives :
- Link to existing project? → **No** (pour le premier déploiement)
- What's your project's name? → `dringdring-frontend` (ou autre)
- In which directory is your code located? → `./`
- Override settings? → **No** (ou **Yes** pour configurer)

### Configuration des Variables

Après le premier déploiement, configurez les variables :

```powershell
vercel env add NEXT_PUBLIC_API_BASE_URL
# Entrez: https://dringdring-backend-11897a1e3635.herokuapp.com

vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# Entrez votre clé API Firebase

vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
# Entrez: dringdring-11a84.firebaseapp.com

vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
# Entrez: dringdring-11a84

vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
# Entrez: dringdring-11a84.appspot.com

vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
# Entrez votre sender ID

vercel env add NEXT_PUBLIC_FIREBASE_APP_ID
# Entrez votre app ID
```

### Redéployer avec les Variables

```powershell
vercel --prod
```

---

## ✅ Post-Déploiement

### 1. Mettre à jour CORS dans Heroku

Une fois que vous avez l'URL Vercel (ex: `https://dringdring-xxx.vercel.app`), mettez à jour CORS dans Heroku :

```powershell
cd backend
heroku config:set CORS_ORIGIN=https://dringdring-xxx.vercel.app -a dringdring-backend
```

### 2. Tester l'Application

1. Ouvrez votre URL Vercel dans le navigateur
2. Essayez de vous connecter avec Firebase
3. Vérifiez la console du navigateur (F12) pour les erreurs

### 3. Configurer les Domaines Autorisés dans Firebase

1. Allez sur https://console.firebase.google.com/project/dringdring-11a84/authentication/settings
2. Dans **"Authorized domains"**, ajoutez votre domaine Vercel
3. Vercel ajoute automatiquement `*.vercel.app`, mais vous pouvez aussi ajouter votre domaine personnalisé

---

## 🐛 Dépannage

### Erreur : "Build failed"

- Vérifiez les logs de build dans Vercel Dashboard
- Vérifiez que toutes les dépendances sont dans `package.json`
- Vérifiez que `npm run build` fonctionne localement

### Erreur : "Environment variable not found"

- Vérifiez que toutes les variables `NEXT_PUBLIC_*` sont configurées dans Vercel
- Vérifiez que les variables sont ajoutées pour l'environnement correct (Production/Preview/Development)

### Erreur : "CORS error" dans le navigateur

- Vérifiez que `CORS_ORIGIN` dans Heroku correspond à l'URL Vercel
- Vérifiez que l'URL ne se termine pas par un `/`

### Erreur : "Firebase: Error (auth/unauthorized-domain)"

- Ajoutez votre domaine Vercel dans Firebase Console → Authentication → Settings → Authorized domains

---

## 📊 Vérification

### Checklist Post-Déploiement

- [ ] Application déployée sur Vercel
- [ ] URL Vercel obtenue
- [ ] Variables d'environnement configurées
- [ ] CORS_ORIGIN mis à jour dans Heroku
- [ ] Domaine autorisé dans Firebase
- [ ] Application accessible dans le navigateur
- [ ] Connexion Firebase fonctionne
- [ ] Appels API fonctionnent

---

## 🔗 URLs Importantes

- **Frontend Vercel** : `https://votre-app.vercel.app` (à obtenir après déploiement)
- **Backend Heroku** : `https://dringdring-backend-11897a1e3635.herokuapp.com`
- **Firebase Console** : https://console.firebase.google.com/project/dringdring-11a84
- **Vercel Dashboard** : https://vercel.com/dashboard

---

**🎉 Une fois déployé, votre application DringDring sera en ligne !**

