# Script de déploiement PowerShell pour DringDring
Write-Host "🚀 Déploiement de DringDring en cours..." -ForegroundColor Green

# Fonction pour afficher les messages
function Write-Status {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Vérifier si Git est installé
try {
    git --version | Out-Null
    Write-Status "Git détecté"
} catch {
    Write-Error "Git n'est pas installé. Installez-le depuis: https://git-scm.com"
    exit 1
}

# 1. Déploiement Backend
Write-Status "Déploiement du backend..."
Set-Location "backend"

# Initialiser Git si nécessaire
if (!(Test-Path ".git")) {
    git init
    git add .
    git commit -m "Initial commit for deployment"
    Write-Status "Git initialisé"
}

# Instructions pour Heroku
Write-Host "`n📋 ÉTAPES POUR HEROKU :" -ForegroundColor Cyan
Write-Host "1. Ouvrez https://heroku.com et créez un compte" -ForegroundColor White
Write-Host "2. Téléchargez Heroku CLI depuis: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor White
Write-Host "3. Redémarrez PowerShell après installation" -ForegroundColor White
Write-Host "4. Exécutez: heroku login" -ForegroundColor White
Write-Host "5. Exécutez: heroku create dringdring-backend" -ForegroundColor White
Write-Host "6. Exécutez: git push heroku main" -ForegroundColor White

# 2. Déploiement Frontend
Write-Status "Préparation du frontend..."
Set-Location "../frontend"

# Installer Vercel CLI
try {
    vercel --version | Out-Null
    Write-Status "Vercel CLI détecté"
} catch {
    Write-Warning "Installation de Vercel CLI..."
    npm install -g vercel
}

# Instructions pour Vercel
Write-Host "`n📋 ÉTAPES POUR VERCEL :" -ForegroundColor Cyan
Write-Host "1. Ouvrez https://vercel.com et connectez-vous avec GitHub" -ForegroundColor White
Write-Host "2. Cliquez sur 'New Project'" -ForegroundColor White
Write-Host "3. Sélectionnez votre repo GitHub" -ForegroundColor White
Write-Host "4. Choisissez le dossier 'frontend'" -ForegroundColor White
Write-Host "5. Ajoutez les variables d'environnement:" -ForegroundColor White
Write-Host "   - NEXT_PUBLIC_API_URL=https://dringdring-backend.herokuapp.com" -ForegroundColor White
Write-Host "   - Variables Firebase (voir DEPLOYMENT_MANUAL.md)" -ForegroundColor White
Write-Host "6. Cliquez sur 'Deploy'" -ForegroundColor White

Write-Host "`n🎉 Instructions complètes dans DEPLOYMENT_MANUAL.md" -ForegroundColor Green
Write-Host "Temps estimé: 30 minutes" -ForegroundColor Yellow


