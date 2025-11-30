# 🔥 Guide de Configuration Firebase - DringDring

## 📋 Vue d'ensemble

DringDring utilise **Firebase** pour :
- ✅ **Authentification** (Backend + Frontend)
- ✅ **Base de données Firestore** (Backend)
- ✅ **Gestion des utilisateurs et rôles**

---

## 🔍 Projet Firebase Identifié

**Projet Firebase** : `dringdring-11a84`

---

## ⚙️ Configuration Backend (Heroku)

### Variables d'environnement nécessaires

Le backend utilise **Firebase Admin SDK** pour :
- Vérifier les tokens d'authentification
- Accéder à Firestore (base de données)

### Configuration dans Heroku

Exécutez ces commandes pour configurer Firebase sur Heroku :

```powershell
cd backend
heroku config:set FIREBASE_PROJECT_ID=dringdring-11a84 -a dringdring-backend
heroku config:set FIREBASE_PRIVATE_KEY_ID=2def90ea931318524b66c72cae35155bb0446fd0 -a dringdring-backend
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDMJ5k/olVDgI5i\nQjvqDeCkTLSu3s+kn1I34AniD8ZrQODTTe3FeEuwQX3LoGcfDkkZ4ZN8pow/XG8c\n10pO+uPILyMUoDftj+GgHa1/zdV5U41GJ9qcJcUo58M74ErXbAggDoVX9caJ4pmC\nLb+dHzsIUNw++oeWIEnKeKFBGoP17U5avkRs/TRxORa2GHyZcNDoHETPFmTsH5/7\na6wRO9NBpteGPRlLcrjD5JuUMG44j67ZrUfITJT+PfdOg4b6ehbv+WrW3wvMWrwz\nOULQXZSA/25dTKV0az+DTxwhb2wYPheDu4oJMndJFY8zC87BbzexM0djiBMdT+UN\nR8CPtTRfAgMBAAECggEAGTMcGfw2LRZdvOgzEBF1dKJZPSqYk9fspKP9ZE+RLOT9\nu2dnnZPbN97lobBjejRftpefBmhicGG+/17dt8EFQ8z5tg6OyL6VWZfANkHYg1ja\nW9oIhHSvEP0GnsnxQwT9PcO9Ft3qC1QSobx25fSYa07b2NRAzzmeEiVwtiIJPt46\n2xc0skW4sxX4h9gkGLYL/JkBcXLAzOBCwNKzGuAsCnXYZayXDkbAJmvdUatEgNyy\n+XthwfhSgPuQVRMnC4E0BoSYP1YC54eGMWp2qlfpzih5peDh0ts9jL690b/VZxaO\nPq59ZD5ywXRHOkLJ1N4GJ0PWCEikmDr5VXpmaBn9xQKBgQDz1aW9JxMEyOq6F8Ah\nko3kxCAik49BYVrSx7M5+knNLpWvlCy7ePHd08Ak7bYnrm6TG1BnvhY123AUKMnj\nqsg8RksaCTxwCrCgHguwabVndyvAc0b0MeNkFSxEoc7RPu+7FmZJlJKxP/2mHiss\nr/YRNndh1lqksvFLzoSbZLDWvQKBgQDWVyTYbgtiN8ygIA520RVwXl83R09OuAlP\nnMVP4MI9sCU1ULu0zjCWa0rPjv5cPp2b1zmpVCaQtyyX+9unTz5sr6RzE/nZRmPR\nJaEDho23F3UYgJvMc7jpTrPTYoYo7QXZgA9b/vgxQU+2Xh8dd30S4aWf1OXBzn7D\nw1XsPKWnSwKBgQCV3jYNaavV4Avtr1VnDSXreuRpfBqry8PAFABD3WNpGn3kOgW4\ngKDggBr0V6sC/sJ15m7oJLyQA70ClwNnzHtgGLBmY1DjaJ6g+3ahyoc1/dhFZFUz\nGEq0JBNeZ7mvgKhmbGEYTppPGY60gIx23fw3HiwIVXDHFDkdJ+T3gc7zXQKBgQC/\nCosXsPXKhCuJaSkbM/6k2iiJz7BbXGNIJ1YifRUEALUZUS0M2V6rI1RZrXz/YPv/\nhBSr3QpGoE1J5b0A4fukyeSMgXiG9VtQdfaOeuZjE7BVt4Ol9lsQ8AoN1dn4LlKx\napfGCnrTBAB1bmzTScYcBy0lSY/DbzbDa55w4hlQAwKBgQClHr6WAhtxWi3vmR7O\nq+zchuL8RH55eYD4L6dxpCebCU/1Uce8NEuehHr+6cIJ8eGk6ltx+H6txuZsWEeD\ntgaNLkIYEe0dHVqcylUM253eSTF9LC6VBWJDjimjs82u4p6geJWQCvdaGNX6XX6D\npgXlLifcHeTO29Lr1A8sF2Kdnw==\n-----END PRIVATE KEY-----\n" -a dringdring-backend
heroku config:set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@dringdring-11a84.iam.gserviceaccount.com -a dringdring-backend
heroku config:set FIREBASE_CLIENT_ID=106222191146330144676 -a dringdring-backend
heroku config:set FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth -a dringdring-backend
heroku config:set FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token -a dringdring-backend
heroku config:set FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs -a dringdring-backend
heroku config:set FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40dringdring-11a84.iam.gserviceaccount.com -a dringdring-backend
```

### Alternative : Configuration via Dashboard

1. Allez sur https://dashboard.heroku.com/apps/dringdring-backend/settings
2. Cliquez sur **"Reveal Config Vars"**
3. Ajoutez chaque variable une par une (voir valeurs ci-dessus)

---

## 🎨 Configuration Frontend (Vercel)

### Variables d'environnement nécessaires

Le frontend utilise **Firebase Client SDK** pour l'authentification.

### Où trouver ces valeurs ?

1. Allez sur https://console.firebase.google.com
2. Sélectionnez le projet `dringdring-11a84`
3. Allez dans **Project Settings** (⚙️ en haut à gauche)
4. Dans l'onglet **General**, trouvez la section **"Your apps"**
5. Si vous avez déjà une app web, cliquez dessus
6. Sinon, créez une nouvelle app web (icône `</>`)
7. Copiez les valeurs de configuration

### Configuration dans Vercel

Une fois le frontend déployé sur Vercel :

1. Allez sur https://vercel.com
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez ces variables (avec le préfixe `NEXT_PUBLIC_`) :

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza... (votre clé API)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dringdring-11a84.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dringdring-11a84
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dringdring-11a84.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... (votre sender ID)
NEXT_PUBLIC_FIREBASE_APP_ID=... (votre app ID)
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=... (optionnel, pour Analytics)
```

---

## 🗄️ Configuration Firestore

### Activer Firestore

1. Allez sur https://console.firebase.google.com/project/dringdring-11a84
2. Dans le menu de gauche, cliquez sur **Firestore Database**
3. Si ce n'est pas encore activé, cliquez sur **"Create database"**
4. Choisissez le mode **Production** (ou **Test** pour le développement)
5. Choisissez une région (ex: `europe-west`)

### Règles de sécurité Firestore

Configurez les règles de sécurité dans **Firestore Database** → **Rules** :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles de base - À adapter selon vos besoins
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Exemple de règles plus spécifiques :
    // match /users/{userId} {
    //   allow read, write: if request.auth != null && request.auth.uid == userId;
    // }
  }
}
```

---

## ✅ Vérification

### Backend

Testez que Firebase fonctionne sur Heroku :

```powershell
heroku logs --tail -a dringdring-backend
```

Vérifiez qu'il n'y a pas d'erreurs de type :
- `Firebase Admin SDK could not initialize`
- `Invalid token`

### Frontend

1. Ouvrez votre application frontend
2. Essayez de vous connecter
3. Vérifiez la console du navigateur (F12) pour les erreurs

---

## 🔐 Sécurité

### ⚠️ Important

- **Ne commitez JAMAIS** les clés privées Firebase dans Git
- Les variables d'environnement doivent rester **privées**
- Le fichier `docker-compose.yml` contient des clés - **ne le partagez pas publiquement**

### Bonnes pratiques

1. ✅ Utilisez des variables d'environnement
2. ✅ Ne partagez pas les clés privées
3. ✅ Configurez les règles Firestore correctement
4. ✅ Activez l'authentification dans Firebase Console

---

## 📚 Documentation

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Admin SDK Python](https://firebase.google.com/docs/admin/setup)
- [Firebase Client SDK JavaScript](https://firebase.google.com/docs/web/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

## 🐛 Dépannage

### Erreur : "Firebase Admin SDK could not initialize"

- Vérifiez que toutes les variables `FIREBASE_*` sont configurées dans Heroku
- Vérifiez que `FIREBASE_PRIVATE_KEY` contient bien les `\n` pour les retours à la ligne
- Vérifiez les logs : `heroku logs --tail -a dringdring-backend`

### Erreur : "Invalid token" sur le frontend

- Vérifiez que les variables `NEXT_PUBLIC_FIREBASE_*` sont configurées dans Vercel
- Vérifiez que l'authentification est activée dans Firebase Console
- Vérifiez que le domaine est autorisé dans Firebase Console → Authentication → Settings → Authorized domains

### Erreur : "Permission denied" sur Firestore

- Vérifiez les règles de sécurité Firestore
- Vérifiez que l'utilisateur est bien authentifié
- Vérifiez que les rôles sont correctement configurés

---

**🎉 Une fois configuré, votre application DringDring utilisera Firebase pour l'authentification et la base de données !**

