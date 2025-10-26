#!/bin/bash
# Script de maintenance pour DringDring

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour afficher l'aide
show_help() {
    echo "🔧 Script de maintenance DringDring"
    echo ""
    echo "Usage: $0 [COMMANDE]"
    echo ""
    echo "Commandes disponibles:"
    echo "  status      - Afficher le statut de l'application"
    echo "  logs        - Afficher les logs en temps réel"
    echo "  restart     - Redémarrer l'application"
    echo "  update      - Mettre à jour l'application"
    echo "  backup      - Créer une sauvegarde"
    echo "  cleanup     - Nettoyer les ressources Docker"
    echo "  health      - Vérifier la santé de l'application"
    echo "  help        - Afficher cette aide"
}

# Vérifier le statut
check_status() {
    log_info "Vérification du statut de l'application..."
    
    if docker-compose ps | grep -q "Up"; then
        log_info "✅ Application en cours d'exécution"
        docker-compose ps
    else
        log_error "❌ Application arrêtée"
        exit 1
    fi
}

# Afficher les logs
show_logs() {
    log_info "Affichage des logs en temps réel..."
    log_warn "Appuyez sur Ctrl+C pour arrêter"
    docker-compose logs -f
}

# Redémarrer l'application
restart_app() {
    log_info "Redémarrage de l'application..."
    docker-compose restart
    log_info "✅ Application redémarrée"
}

# Mettre à jour l'application
update_app() {
    log_info "Mise à jour de l'application..."
    
    # Arrêter l'application
    log_info "Arrêt de l'application..."
    docker-compose down
    
    # Mettre à jour le code
    log_info "Mise à jour du code..."
    git pull origin main
    
    # Reconstruire et redémarrer
    log_info "Reconstruction et redémarrage..."
    docker-compose up -d --build
    
    log_info "✅ Application mise à jour"
}

# Créer une sauvegarde
create_backup() {
    log_info "Création d'une sauvegarde..."
    
    BACKUP_DIR="backups"
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    
    # Créer le dossier de sauvegarde
    mkdir -p $BACKUP_DIR
    
    # Sauvegarder les fichiers de configuration
    tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
        .env.production \
        credentials/ \
        docker-compose.yml \
        Dockerfile
    
    log_info "✅ Sauvegarde créée: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
}

# Nettoyer les ressources Docker
cleanup_docker() {
    log_info "Nettoyage des ressources Docker..."
    
    # Supprimer les conteneurs arrêtés
    docker container prune -f
    
    # Supprimer les images inutilisées
    docker image prune -f
    
    # Supprimer les volumes inutilisés
    docker volume prune -f
    
    # Supprimer les réseaux inutilisés
    docker network prune -f
    
    log_info "✅ Nettoyage terminé"
}

# Vérifier la santé de l'application
check_health() {
    log_info "Vérification de la santé de l'application..."
    
    # Vérifier que l'application répond
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_info "✅ Application en bonne santé"
        
        # Afficher des informations supplémentaires
        echo ""
        echo "📊 Informations système:"
        echo "  - Mémoire utilisée: $(docker stats --no-stream --format 'table {{.MemUsage}}' dringdring_backend_1 2>/dev/null || echo 'N/A')"
        echo "  - CPU utilisé: $(docker stats --no-stream --format 'table {{.CPUPerc}}' dringdring_backend_1 2>/dev/null || echo 'N/A')"
        echo "  - Uptime: $(docker inspect --format='{{.State.StartedAt}}' dringdring_backend_1 2>/dev/null || echo 'N/A')"
        
    else
        log_error "❌ Application ne répond pas"
        exit 1
    fi
}

# Script principal
case "${1:-help}" in
    status)
        check_status
        ;;
    logs)
        show_logs
        ;;
    restart)
        restart_app
        ;;
    update)
        update_app
        ;;
    backup)
        create_backup
        ;;
    cleanup)
        cleanup_docker
        ;;
    health)
        check_health
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Commande inconnue: $1"
        show_help
        exit 1
        ;;
esac


