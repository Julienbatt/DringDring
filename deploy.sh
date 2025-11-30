#!/bin/bash

echo "🚀 Déploiement de DringDring en cours..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier si Heroku CLI est installé
if ! command -v heroku &> /dev/null; then
    print_error "Heroku CLI n'est pas installé. Installez-le depuis: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Vérifier si Vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI n'est pas installé. Installation..."
    npm install -g vercel
fi

print_status "Début du déploiement..."

# 1. Déploiement Backend sur Heroku
print_status "Déploiement du backend sur Heroku..."
cd backend

# Initialiser git si nécessaire
if [ ! -d ".git" ]; then
    git init
    git add .
    git commit -m "Initial commit for deployment"
fi

# Créer l'app Heroku si elle n'existe pas
if ! heroku apps:info dringdring-backend &> /dev/null; then
    print_status "Création de l'application Heroku..."
    heroku create dringdring-backend
fi

# Configurer les variables d'environnement
print_status "Configuration des variables d'environnement..."
heroku config:set SECRET_KEY="$(openssl rand -hex 32)" --app dringdring-backend
heroku config:set JWT_SECRET_KEY="$(openssl rand -hex 32)" --app dringdring-backend
heroku config:set ALLOWED_ORIGINS="https://dringdring-frontend.vercel.app" --app dringdring-backend

# Déployer
print_status "Déploiement en cours..."
git add .
git commit -m "Deploy backend" || true
git push heroku main

print_status "Backend déployé sur: https://dringdring-backend.herokuapp.com"

# 2. Déploiement Frontend sur Vercel
print_status "Déploiement du frontend sur Vercel..."
cd ../frontend

# Déployer sur Vercel
vercel --prod --yes

print_status "Frontend déployé sur Vercel"

# 3. Mise à jour de l'URL API
print_status "Mise à jour de l'URL API dans Vercel..."
vercel env add NEXT_PUBLIC_API_URL production
echo "https://dringdring-backend.herokuapp.com" | vercel env add NEXT_PUBLIC_API_URL production

print_status "🎉 Déploiement terminé !"
print_status "Backend: https://dringdring-backend.herokuapp.com"
print_status "Frontend: Vérifiez l'URL dans Vercel Dashboard"
print_status "Documentation API: https://dringdring-backend.herokuapp.com/docs"


