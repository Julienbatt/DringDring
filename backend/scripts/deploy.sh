#!/bin/bash
# Script de déploiement pour DringDring

set -e  # Arrêter en cas d'erreur

echo "🚀 Démarrage du déploiement de DringDring..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier que Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Étape 1: Construire l'image Docker
log_info "Construction de l'image Docker..."
docker build -t dringdring-backend:latest .

if [ $? -eq 0 ]; then
    log_info "✅ Image Docker construite avec succès"
else
    log_error "❌ Échec de la construction de l'image Docker"
    exit 1
fi

# Étape 2: Arrêter les conteneurs existants
log_info "Arrêt des conteneurs existants..."
docker-compose down

# Étape 3: Démarrer les nouveaux conteneurs
log_info "Démarrage des nouveaux conteneurs..."
docker-compose up -d

if [ $? -eq 0 ]; then
    log_info "✅ Conteneurs démarrés avec succès"
else
    log_error "❌ Échec du démarrage des conteneurs"
    exit 1
fi

# Étape 4: Vérifier que l'application fonctionne
log_info "Vérification de l'application..."
sleep 10  # Attendre que l'application démarre

# Tester l'endpoint de santé
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    log_info "✅ Application accessible et fonctionnelle"
else
    log_warn "⚠️ L'application pourrait ne pas être encore prête"
fi

# Étape 5: Nettoyer les images inutilisées
log_info "Nettoyage des images Docker inutilisées..."
docker image prune -f

log_info "🎉 Déploiement terminé avec succès !"
log_info "🌐 Votre application est accessible sur: http://localhost:8000"
log_info "📚 Documentation API: http://localhost:8000/docs"

echo ""
echo "📋 Commandes utiles:"
echo "  - Voir les logs: docker-compose logs -f"
echo "  - Arrêter l'app: docker-compose down"
echo "  - Redémarrer: docker-compose restart"
echo "  - Mise à jour: ./scripts/deploy.sh"


