# 🚀 Script de Déploiement Complet - DringDring
# State of the Art - Automatisation Complète

Write-Host "🚀 Déploiement Complet DringDring - State of the Art" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Fonctions utilitaires
function Write-Step {
    param($Message)
    Write-Host "`n📋 $Message" -ForegroundColor Yellow
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

# Vérification des prérequis
Write-Step "Vérification des prérequis..."

# Vérifier Git
try {
    $gitVersion = git --version
    Write-Success "Git détecté : $gitVersion"
} catch {
    Write-Error "Git n'est pas installé. Installez-le depuis: https://git-scm.com"
    exit 1
}

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Success "Node.js détecté : $nodeVersion"
} catch {
    Write-Error "Node.js n'est pas installé. Installez-le depuis: https://nodejs.org"
    exit 1
}

# Vérifier Heroku CLI
try {
    $herokuVersion = heroku --version
    Write-Success "Heroku CLI détecté : $herokuVersion"
} catch {
    Write-Error "Heroku CLI n'est pas installé. Installez-le depuis: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
}

# Étape 1 : Préparer le code
Write-Step "Étape 1 : Préparation du code Git"

$currentBranch = git branch --show-current
Write-Info "Branche actuelle : $currentBranch"

# Vérifier s'il y a des changements non commités
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Info "Changements détectés, commit en cours..."
    git add .
    git commit -m "chore: Prepare for production deployment - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Success "Changements commités"
} else {
    Write-Success "Aucun changement à commiter"
}

# Push vers GitHub
Write-Info "Push vers GitHub..."
try {
    git push origin $currentBranch
    Write-Success "Code poussé vers GitHub"
} catch {
    Write-Error "Erreur lors du push vers GitHub. Vérifiez votre connexion."
    exit 1
}

# Étape 2 : Vérifier le backend Heroku
Write-Step "Étape 2 : Vérification du backend Heroku"

try {
    $herokuApps = heroku apps --json | ConvertFrom-Json
    $backendApp = $herokuApps | Where-Object { $_.name -eq "dringdring-backend" }
    
    if ($backendApp) {
        Write-Success "Application Heroku trouvée : $($backendApp.name)"
        Write-Info "URL : $($backendApp.web_url)"
        
        # Vérifier les variables d'environnement Firebase
        Write-Info "Vérification des variables Firebase..."
        $config = heroku config -a dringdring-backend --json | ConvertFrom-Json
        
        $requiredVars = @(
            "FIREBASE_PROJECT_ID",
            "FIREBASE_PRIVATE_KEY",
            "FIREBASE_CLIENT_EMAIL",
            "FIREBASE_CLIENT_ID"
        )
        
        $missingVars = @()
        foreach ($var in $requiredVars) {
            if (-not $config.$var) {
                $missingVars += $var
            }
        }
        
        if ($missingVars.Count -gt 0) {
            Write-Error "Variables Firebase manquantes : $($missingVars -join ', ')"
            Write-Info "Configurez-les avec le script update-firebase-heroku.ps1"
        } else {
            Write-Success "Toutes les variables Firebase sont configurées"
        }
        
        # Tester l'API
        Write-Info "Test de l'API backend..."
        try {
            $response = Invoke-WebRequest -Uri "$($backendApp.web_url)/health" -Method GET -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Success "Backend API fonctionnel (Status: $($response.StatusCode))"
            }
        } catch {
            Write-Error "Impossible de contacter le backend API"
        }
    } else {
        Write-Error "Application Heroku 'dringdring-backend' non trouvée"
        Write-Info "Créez-la avec : heroku create dringdring-backend"
    }
} catch {
    Write-Error "Erreur lors de la vérification Heroku : $_"
}

# Étape 3 : Préparer le frontend
Write-Step "Étape 3 : Préparation du frontend"

Set-Location "frontend"

# Vérifier que package.json existe
if (-not (Test-Path "package.json")) {
    Write-Error "package.json non trouvé dans le dossier frontend"
    exit 1
}

# Vérifier les dépendances
if (-not (Test-Path "node_modules")) {
    Write-Info "Installation des dépendances..."
    npm install
    Write-Success "Dépendances installées"
}

# Test de build local (optionnel mais recommandé)
Write-Info "Test de build local..."
try {
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Build local réussi"
    } else {
        Write-Error "Erreur lors du build local"
        Write-Info "Vérifiez les erreurs ci-dessus"
    }
} catch {
    Write-Error "Erreur lors du build : $_"
}

Set-Location ".."

# Étape 4 : Instructions pour Vercel
Write-Step "Étape 4 : Déploiement sur Vercel"

Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "📋 INSTRUCTIONS POUR VERCEL" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Cyan

Write-Host @"

1. Allez sur : https://vercel.com
2. Connectez-vous avec GitHub
3. Cliquez sur "Add New Project"
4. Sélectionnez le repository : DringDring
5. Configuration IMPORTANTE :
   - Root Directory : frontend ⚠️
   - Framework : Next.js (auto-détecté)
   - Build Command : npm run build
   - Output Directory : .next

6. Variables d'environnement (ajoutez AVANT de déployer) :

   NEXT_PUBLIC_API_BASE_URL
   = https://dringdring-backend-11897a1e3635.herokuapp.com

   NEXT_PUBLIC_FIREBASE_API_KEY
   = VOTRE_FIREBASE_API_KEY_ICI

   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   = dringdring-11a84.firebaseapp.com

   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   = dringdring-11a84

   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   = dringdring-11a84.firebasestorage.app

   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   = 992333150262

   NEXT_PUBLIC_FIREBASE_APP_ID
   = 1:992333150262:web:8ac2c2f09ca9f1ba2a8097

   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
   = G-TJXL6QTPJ1

7. Cochez Production, Preview, et Development pour chaque variable
8. Cliquez sur "Deploy"
9. Attendez 2-5 minutes
10. Notez l'URL Vercel obtenue

"@ -ForegroundColor White

# Étape 5 : Script pour mettre à jour CORS
Write-Step "Étape 5 : Script de mise à jour CORS"

$corsUpdateScript = @"
# Script pour mettre à jour CORS après déploiement Vercel
# Remplacez YOUR_VERCEL_URL par votre URL Vercel

`$vercelUrl = "YOUR_VERCEL_URL"  # Exemple: https://dringdring-xxx.vercel.app

Write-Host "Mise à jour de CORS_ORIGIN dans Heroku..." -ForegroundColor Yellow
heroku config:set CORS_ORIGIN=`$vercelUrl -a dringdring-backend

Write-Host "Redémarrage de l'application..." -ForegroundColor Yellow
heroku restart -a dringdring-backend

Write-Host "✅ CORS mis à jour avec succès !" -ForegroundColor Green
"@

$corsScriptPath = "update-cors-after-vercel.ps1"
$corsUpdateScript | Out-File -FilePath $corsScriptPath -Encoding UTF8
Write-Success "Script de mise à jour CORS créé : $corsScriptPath"

# Résumé final
Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "✅ PRÉPARATION TERMINÉE" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

Write-Host @"

📋 Checklist :

✅ Code préparé et poussé sur GitHub
✅ Backend Heroku vérifié
✅ Frontend préparé
✅ Script de mise à jour CORS créé

📋 Actions restantes (manuelles) :

1. Déployer sur Vercel (suivez les instructions ci-dessus)
2. Une fois l'URL Vercel obtenue, exécutez :
   .\update-cors-after-vercel.ps1
   (N'oubliez pas de remplacer YOUR_VERCEL_URL)

3. Tester l'application complète

🔗 URLs importantes :

- Backend : https://dringdring-backend-11897a1e3635.herokuapp.com
- Vercel Dashboard : https://vercel.com/dashboard
- Firebase Console : https://console.firebase.google.com/project/dringdring-11a84

"@ -ForegroundColor White

Write-Host "`n🎉 Prêt pour le déploiement !" -ForegroundColor Green

