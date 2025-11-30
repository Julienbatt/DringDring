# 🔒 Guide de Correction de Sécurité - Clé Privée Firebase

## ⚠️ PROBLÈME DÉTECTÉ

Une clé privée Firebase a été commitée dans le repository Git. Cette clé doit être **immédiatement régénérée** car elle est maintenant exposée publiquement.

---

## ✅ CORRECTIONS EFFECTUÉES

1. ✅ Création d'un `.gitignore` à la racine pour exclure les fichiers sensibles
2. ✅ Retrait de la clé privée de `docker-compose.yml` (remplacée par des placeholders)
3. ✅ Retrait de la clé privée de `FIREBASE_CONFIG_GUIDE.md`

---

## 🔄 ÉTAPES POUR RÉGÉNÉRER LA CLÉ FIREBASE

### Étape 1 : Aller sur Firebase Console

1. Allez sur : **https://console.firebase.google.com/project/dringdring-11a84/settings/serviceaccounts/adminsdk**
2. Connectez-vous avec votre compte Google

### Étape 2 : Générer une Nouvelle Clé

1. Dans la section **"Service accounts"**, vous verrez votre compte de service
2. Cliquez sur **"Generate new private key"** (ou "Générer une nouvelle clé privée")
3. ⚠️ **ATTENTION** : Cela va **désactiver l'ancienne clé** automatiquement
4. Un fichier JSON sera téléchargé (ex: `dringdring-11a84-xxxxx.json`)

### Étape 3 : Extraire les Valeurs du JSON

Ouvrez le fichier JSON téléchargé. Il contient :

```json
{
  "type": "service_account",
  "project_id": "dringdring-11a84",
  "private_key_id": "NOUVEAU_PRIVATE_KEY_ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\nNOUVELLE_CLE_PRIVEE\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@dringdring-11a84.iam.gserviceaccount.com",
  "client_id": "NOUVEAU_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Copiez ces valeurs** - vous en aurez besoin pour Heroku.

---

## 🔧 ÉTAPE 4 : Mettre à Jour Heroku

Une fois que vous avez la nouvelle clé, mettez à jour Heroku :

```powershell
cd backend
heroku config:set FIREBASE_PROJECT_ID=dringdring-11a84 -a dringdring-backend
heroku config:set FIREBASE_PRIVATE_KEY_ID=NOUVEAU_PRIVATE_KEY_ID -a dringdring-backend
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nNOUVELLE_CLE_PRIVEE\n-----END PRIVATE KEY-----\n" -a dringdring-backend
heroku config:set FIREBASE_CLIENT_EMAIL=NOUVEAU_CLIENT_EMAIL -a dringdring-backend
heroku config:set FIREBASE_CLIENT_ID=NOUVEAU_CLIENT_ID -a dringdring-backend
heroku config:set FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth -a dringdring-backend
heroku config:set FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token -a dringdring-backend
```

**Important** : Pour `FIREBASE_PRIVATE_KEY`, vous devez :
- Garder les `\n` dans la chaîne
- Mettre toute la clé entre guillemets
- La clé doit être sur une seule ligne avec `\n` pour les retours à la ligne

### Exemple de commande complète :

```powershell
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n...\n-----END PRIVATE KEY-----\n" -a dringdring-backend
```

---

## 📝 ÉTAPE 5 : Créer le Fichier .env Local (Pour le Développement)

Créez `backend/.env` (ce fichier est déjà dans .gitignore) :

```env
FIREBASE_PROJECT_ID=dringdring-11a84
FIREBASE_PRIVATE_KEY_ID=votre-nouveau-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=votre-nouveau-client-email@dringdring-11a84.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=votre-nouveau-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
```

---

## ✅ ÉTAPE 6 : Vérifier que Tout Fonctionne

### Vérifier Heroku

```powershell
heroku logs --tail -a dringdring-backend
```

Vérifiez qu'il n'y a pas d'erreurs Firebase.

### Tester l'API

```powershell
curl https://dringdring-backend-11897a1e3635.herokuapp.com/test/health
```

---

## 🗑️ ÉTAPE 7 : Nettoyer l'Historique Git (Optionnel mais Recommandé)

⚠️ **ATTENTION** : Cette étape réécrit l'historique Git. Ne le faites que si vous êtes sûr.

Si vous voulez retirer complètement la clé de l'historique Git :

```powershell
# Installer git-filter-repo (si pas déjà installé)
# pip install git-filter-repo

# Retirer la clé de l'historique
git filter-repo --path backend/docker-compose.yml --invert-paths
```

**OU** utilisez BFG Repo-Cleaner (plus simple) :
1. Téléchargez : https://rtyley.github.io/bfg-repo-cleaner/
2. Exécutez : `java -jar bfg.jar --delete-files docker-compose.yml`
3. Forcez le push : `git push --force`

---

## 📋 CHECKLIST DE SÉCURITÉ

- [ ] Clé Firebase régénérée dans Firebase Console
- [ ] Ancienne clé désactivée automatiquement
- [ ] Nouvelle clé configurée dans Heroku
- [ ] Fichier `.env` créé localement (non commité)
- [ ] `.gitignore` vérifié et fonctionnel
- [ ] Application testée et fonctionnelle
- [ ] Historique Git nettoyé (optionnel)

---

## 🔐 BONNES PRATIQUES POUR L'AVENIR

1. ✅ **JAMAIS** commiter de clés privées dans Git
2. ✅ Toujours utiliser des variables d'environnement
3. ✅ Vérifier `.gitignore` avant chaque commit
4. ✅ Utiliser des fichiers `.env.example` avec des placeholders
5. ✅ Utiliser des secrets managers (Heroku Config Vars, Vercel Env Vars)

---

## 🆘 EN CAS DE PROBLÈME

Si l'application ne fonctionne plus après la régénération :

1. Vérifiez les logs Heroku : `heroku logs --tail -a dringdring-backend`
2. Vérifiez que toutes les variables sont bien configurées : `heroku config -a dringdring-backend`
3. Vérifiez que `FIREBASE_PRIVATE_KEY` contient bien les `\n` pour les retours à la ligne

---

**🔒 Une fois la nouvelle clé configurée, votre application sera sécurisée !**


