# 🚀 Démarrage rapide DringDring

## ⚡ En 5 minutes, votre app est en ligne !

### **🎯 Option 1 : Déploiement local (pour tester)**

```bash
# 1. Cloner le projet
git clone https://github.com/votre-username/DringDring.git
cd DringDring/backend

# 2. Configurer (copier l'exemple)
cp env.production.example .env.production

# 3. Éditer la configuration
# Ouvrir .env.production et remplir avec vos valeurs Firebase

# 4. Démarrer avec Docker
docker-compose up -d

# 5. Tester
# Ouvrir http://localhost:8000/docs
```

### **☁️ Option 2 : Déploiement sur Heroku (le plus simple)**

```bash
# 1. Installer Heroku CLI
# Télécharger depuis https://devcenter.heroku.com/articles/heroku-cli

# 2. Se connecter
heroku login

# 3. Créer l'app
heroku create dringdring-votre-nom

# 4. Configurer Firebase
heroku config:set FIREBASE_PROJECT_ID=votre-projet
heroku config:set FIREBASE_PRIVATE_KEY="votre-clé-privée"
# ... autres variables

# 5. Déployer
git push heroku main

# 6. Ouvrir
heroku open
```

### **🌐 Option 3 : Déploiement sur un serveur**

```bash
# 1. Se connecter au serveur
ssh root@votre-serveur-ip

# 2. Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Cloner et configurer
git clone https://github.com/votre-username/DringDring.git
cd DringDring/backend
cp env.production.example .env.production
nano .env.production  # Éditer avec vos valeurs

# 4. Démarrer
docker-compose -f docker-compose.production.yml up -d

# 5. Vérifier
curl http://localhost:8000/health
```

---

## 🔧 Configuration Firebase (OBLIGATOIRE)

### **1. Créer un projet Firebase**
1. Aller sur [console.firebase.google.com](https://console.firebase.google.com)
2. Cliquer "Créer un projet"
3. Nommer le projet (ex: "dringdring-prod")
4. Activer Google Analytics (optionnel)

### **2. Activer Firestore**
1. Dans le menu gauche : "Firestore Database"
2. Cliquer "Créer une base de données"
3. Choisir "Mode test" (pour commencer)
4. Choisir une région (ex: "europe-west1")

### **3. Créer un compte de service**
1. Aller dans "Paramètres du projet" > "Comptes de service"
2. Cliquer "Générer une nouvelle clé privée"
3. Télécharger le fichier JSON
4. Copier les valeurs dans votre `.env.production`

### **4. Configurer les règles Firestore**
```javascript
// Dans Firebase Console > Firestore > Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🎯 Variables d'environnement essentielles

```bash
# Firebase (OBLIGATOIRE)
FIREBASE_PROJECT_ID=votre-projet-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_PRIVEE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=votre-service-account@votre-projet.iam.gserviceaccount.com

# Sécurité (OBLIGATOIRE)
SECRET_KEY=votre-clé-secrète-très-longue
JWT_SECRET_KEY=une-autre-clé-secrète

# Environnement
ENVIRONMENT=production
DEBUG=false
```

---

## ✅ Vérification que tout fonctionne

### **1. Test de santé**
```bash
curl http://votre-domaine.com/health
# Doit retourner: {"status": "healthy"}
```

### **2. Test de l'API**
```bash
curl http://votre-domaine.com/docs
# Doit afficher la documentation Swagger
```

### **3. Test de connexion Firebase**
- Aller sur votre app
- Essayer de créer un magasin
- Vérifier dans Firebase Console que les données apparaissent

---

## 🆘 Problèmes courants

### **❌ "Application ne démarre pas"**
```bash
# Vérifier les logs
docker-compose logs

# Vérifier la configuration
docker-compose config
```

### **❌ "Erreur Firebase"**
- Vérifier que les clés Firebase sont correctes
- Vérifier que le projet Firebase existe
- Vérifier que Firestore est activé

### **❌ "Erreur CORS"**
- Vérifier la configuration CORS dans le code
- Vérifier que votre domaine frontend est autorisé

---

## 🎉 Félicitations !

Votre application DringDring est maintenant en ligne ! 

### **Prochaines étapes :**
1. **Tester l'API** : http://votre-domaine.com/docs
2. **Configurer le frontend** : Connecter votre interface
3. **Former les utilisateurs** : Utiliser le système d'onboarding
4. **Monitorer** : Surveiller avec Sentry

### **Commandes utiles :**
```bash
# Voir les logs
docker-compose logs -f

# Redémarrer
docker-compose restart

# Mettre à jour
git pull && docker-compose up -d --build

# Arrêter
docker-compose down
```

**Bon déploiement ! 🚀**


