# 🚀 Guide de déploiement DringDring

## 📋 Table des matières
1. [Prérequis](#prérequis)
2. [Déploiement local avec Docker](#déploiement-local)
3. [Déploiement sur un serveur](#déploiement-serveur)
4. [Déploiement sur le cloud](#déploiement-cloud)
5. [Configuration de production](#configuration-production)
6. [Monitoring et maintenance](#monitoring)

---

## 🔧 Prérequis

### **Sur votre ordinateur :**
- **Docker Desktop** : [Télécharger ici](https://www.docker.com/products/docker-desktop)
- **Git** : [Télécharger ici](https://git-scm.com/downloads)
- **Un éditeur de code** : VS Code recommandé

### **Comptes nécessaires :**
- **Firebase** : [Console Firebase](https://console.firebase.google.com)
- **Google Cloud** : [Console Google Cloud](https://console.cloud.google.com)
- **Sentry** (optionnel) : [Sentry.io](https://sentry.io) pour le monitoring

---

## 🐳 Déploiement local avec Docker

### **Étape 1 : Cloner le projet**
```bash
git clone https://github.com/votre-username/DringDring.git
cd DringDring/backend
```

### **Étape 2 : Configuration**
1. Copiez le fichier d'exemple :
```bash
cp env.production.example .env.production
```

2. Éditez `.env.production` avec vos vraies valeurs :
```bash
# Remplacez par vos vraies valeurs
FIREBASE_PROJECT_ID=votre-projet-firebase
FIREBASE_PRIVATE_KEY="votre-clé-privée"
# ... etc
```

### **Étape 3 : Construire et démarrer**
```bash
# Construire l'image Docker
docker build -t dringdring-backend .

# Démarrer l'application
docker-compose up -d
```

### **Étape 4 : Vérifier**
- Ouvrez votre navigateur : http://localhost:8000
- Documentation API : http://localhost:8000/docs

---

## 🖥️ Déploiement sur un serveur

### **Option A : Serveur VPS (DigitalOcean, Linode, etc.)**

#### **1. Préparer le serveur**
```bash
# Se connecter au serveur
ssh root@votre-serveur-ip

# Mettre à jour le système
apt update && apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installer Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### **2. Déployer l'application**
```bash
# Cloner le projet
git clone https://github.com/votre-username/DringDring.git
cd DringDring/backend

# Configurer l'environnement
cp env.production.example .env.production
nano .env.production  # Éditer avec vos valeurs

# Déployer
docker-compose up -d
```

#### **3. Configurer un domaine (optionnel)**
```bash
# Installer Nginx
apt install nginx -y

# Configurer le reverse proxy
nano /etc/nginx/sites-available/dringdring
```

Configuration Nginx :
```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## ☁️ Déploiement sur le cloud

### **Option A : Heroku (Le plus simple)**

#### **1. Installer Heroku CLI**
- [Télécharger Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

#### **2. Préparer l'application**
```bash
# Créer un fichier Procfile
echo "web: uvicorn app.main:app --host 0.0.0.0 --port \$PORT" > Procfile

# Créer un runtime.txt
echo "python-3.10.0" > runtime.txt
```

#### **3. Déployer**
```bash
# Se connecter à Heroku
heroku login

# Créer l'application
heroku create dringdring-app

# Configurer les variables d'environnement
heroku config:set FIREBASE_PROJECT_ID=votre-projet
heroku config:set FIREBASE_PRIVATE_KEY="votre-clé"
# ... etc

# Déployer
git push heroku main
```

### **Option B : Google Cloud Run (Recommandé)**

#### **1. Installer Google Cloud CLI**
- [Télécharger Google Cloud CLI](https://cloud.google.com/sdk/docs/install)

#### **2. Configurer**
```bash
# Se connecter
gcloud auth login

# Configurer le projet
gcloud config set project VOTRE-PROJET-ID

# Activer les APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

#### **3. Déployer**
```bash
# Construire et déployer
gcloud run deploy dringdring-backend \
  --source . \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated
```

### **Option C : AWS (Pour les gros projets)**

#### **1. Installer AWS CLI**
- [Télécharger AWS CLI](https://aws.amazon.com/cli/)

#### **2. Utiliser AWS Elastic Beanstalk**
```bash
# Installer EB CLI
pip install awsebcli

# Initialiser
eb init

# Créer l'environnement
eb create production

# Déployer
eb deploy
```

---

## 🔐 Configuration de production

### **1. Sécurité**

#### **Variables d'environnement sensibles**
```bash
# Générer des clés secrètes
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Utiliser dans .env.production
SECRET_KEY=votre-clé-secrète-générée
JWT_SECRET_KEY=une-autre-clé-secrète
```

#### **CORS (Cross-Origin Resource Sharing)**
```python
# Dans app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://votre-frontend.com"],  # Votre domaine frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### **2. Base de données Firebase**

#### **Créer un projet Firebase**
1. Aller sur [Console Firebase](https://console.firebase.google.com)
2. Créer un nouveau projet
3. Activer Firestore Database
4. Générer une clé de service

#### **Configurer les règles Firestore**
```javascript
// Dans Firebase Console > Firestore > Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles de sécurité pour DringDring
    match /shops/{shopId} {
      allow read, write: if request.auth != null && 
        (request.auth.token.role == 'admin' || 
         request.auth.token.shop_id == shopId);
    }
    
    match /deliveries/{deliveryId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### **3. Monitoring avec Sentry**

#### **Configurer Sentry**
1. Créer un compte sur [Sentry.io](https://sentry.io)
2. Créer un nouveau projet Python
3. Récupérer le DSN

```python
# Dans app/main.py (déjà configuré)
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="VOTRE-SENTRY-DSN",
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
    environment="production"
)
```

---

## 📊 Monitoring et maintenance

### **1. Logs**
```bash
# Voir les logs en temps réel
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f backend
```

### **2. Sauvegarde**
```bash
# Sauvegarder la base de données Firebase
# (Firebase fait des sauvegardes automatiques)

# Sauvegarder les fichiers de configuration
tar -czf backup-$(date +%Y%m%d).tar.gz .env.production credentials/
```

### **3. Mise à jour**
```bash
# Arrêter l'application
docker-compose down

# Mettre à jour le code
git pull origin main

# Reconstruire et redémarrer
docker-compose up -d --build
```

### **4. Surveillance**
- **Sentry** : Erreurs et performances
- **Firebase Console** : Utilisation de la base de données
- **Google Cloud Monitoring** : Métriques serveur

---

## 🆘 Dépannage

### **Problèmes courants**

#### **L'application ne démarre pas**
```bash
# Vérifier les logs
docker-compose logs

# Vérifier les variables d'environnement
docker-compose config
```

#### **Erreur de connexion Firebase**
- Vérifier que les clés Firebase sont correctes
- Vérifier que le projet Firebase existe
- Vérifier les permissions du compte de service

#### **Erreur CORS**
- Vérifier la configuration CORS dans `app/main.py`
- Vérifier que le domaine frontend est autorisé

### **Commandes utiles**
```bash
# Redémarrer l'application
docker-compose restart

# Voir l'état des conteneurs
docker-compose ps

# Entrer dans le conteneur
docker-compose exec backend bash

# Nettoyer les images inutilisées
docker system prune -a
```

---

## 🎉 Félicitations !

Votre application DringDring est maintenant en production ! 

### **Prochaines étapes :**
1. **Tester** : Vérifier que tout fonctionne
2. **Configurer le frontend** : Connecter votre interface utilisateur
3. **Former les utilisateurs** : Utiliser le système d'onboarding
4. **Monitorer** : Surveiller les performances et erreurs

### **Support :**
- 📚 Documentation : http://votre-domaine.com/docs
- 🐛 Bugs : Créer une issue sur GitHub
- 💬 Questions : Utiliser le système d'aide intégré

**Bon déploiement ! 🚀**


