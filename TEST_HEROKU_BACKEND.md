# 🧪 Guide de Test du Backend sur Heroku

## ✅ Statut : API FONCTIONNELLE

**URL de l'API** : `https://dringdring-backend-11897a1e3635.herokuapp.com`

---

## 🎯 Méthodes de Test

### 1. Via le Navigateur (Simple)

### 2. Via la Documentation Swagger (Recommandé)

### 3. Via curl (Ligne de commande)

### 4. Via Postman (Avancé)

---

## 🌐 1. Test via le Navigateur

### Documentation Interactive (Swagger UI)

**Ouvrez dans votre navigateur** :
```
https://dringdring-backend-11897a1e3635.herokuapp.com/docs
```

👉 **C'est la meilleure méthode !** Vous pouvez :
- ✅ Voir tous les endpoints disponibles
- ✅ Tester chaque endpoint directement dans le navigateur
- ✅ Voir les réponses en temps réel
- ✅ Comprendre la structure des données

### Documentation Alternative (ReDoc)

```
https://dringdring-backend-11897a1e3635.herokuapp.com/redoc
```

### Health Check

```
https://dringdring-backend-11897a1e3635.herokuapp.com/test/health
```

**Résultat attendu** :
```json
{
  "status": "ok",
  "message": "Test endpoints working"
}
```

---

## 📋 2. Endpoints de Test Disponibles (Sans Authentification)

Tous ces endpoints commencent par `/test/` et ne nécessitent **pas d'authentification** :

### Health Check
```
GET /test/health
```

### Client
```
GET /test/client/stats
GET /test/client/deliveries/upcoming
GET /test/client/deliveries
GET /test/client/delivery-stats
GET /test/client/profile
PUT /test/client/profile
```

### Shop
```
GET /test/shop/deliveries/upcoming
GET /test/shop/deliveries
GET /test/shop/stats
GET /test/shop/profile
```

### HQ Admin
```
GET /test/hq-admin/stats
GET /test/hq-admin/deliveries
GET /test/hq-admin/reports/{period}
GET /test/hq-admin/users
GET /test/hq-admin/profile
PUT /test/hq-admin/profile
```

### Regional Admin
```
GET /test/regional/deliveries
GET /test/regional/shops
GET /test/regional/stats
```

### Super Admin
```
GET /test/super-admin/deliveries
GET /test/super-admin/shops
GET /test/super-admin/users
GET /test/super-admin/stats
```

---

## 💻 3. Test via curl (PowerShell)

### Health Check
```powershell
curl https://dringdring-backend-11897a1e3635.herokuapp.com/test/health
```

### Client Stats
```powershell
curl https://dringdring-backend-11897a1e3635.herokuapp.com/test/client/stats
```

### Shop Deliveries
```powershell
curl https://dringdring-backend-11897a1e3635.herokuapp.com/test/shop/deliveries
```

### HQ Admin Stats
```powershell
curl https://dringdring-backend-11897a1e3635.herokuapp.com/test/hq-admin/stats
```

### HQ Admin Reports (Mois)
```powershell
curl https://dringdring-backend-11897a1e3635.herokuapp.com/test/hq-admin/reports/month
```

### Regional Admin Stats
```powershell
curl https://dringdring-backend-11897a1e3635.herokuapp.com/test/regional/stats
```

### Super Admin Stats
```powershell
curl https://dringdring-backend-11897a1e3635.herokuapp.com/test/super-admin/stats
```

---

## 🔧 4. Test via Postman

### Importer la Collection

1. Ouvrez Postman
2. Cliquez sur **Import**
3. Créez une nouvelle requête
4. Méthode : `GET`
5. URL : `https://dringdring-backend-11897a1e3635.herokuapp.com/test/health`
6. Cliquez sur **Send**

### Exemples de Requêtes

#### GET - Health Check
```
GET https://dringdring-backend-11897a1e3635.herokuapp.com/test/health
```

#### GET - Client Stats
```
GET https://dringdring-backend-11897a1e3635.herokuapp.com/test/client/stats
```

#### GET - HQ Admin Reports (Week)
```
GET https://dringdring-backend-11897a1e3635.herokuapp.com/test/hq-admin/reports/week
```

#### PUT - Update Client Profile
```
PUT https://dringdring-backend-11897a1e3635.herokuapp.com/test/client/profile
Content-Type: application/json

{
  "firstName": "Jean",
  "lastName": "Dupont",
  "phone": "+41 79 123 45 67"
}
```

---

## 🧪 Script de Test Automatique

Créez un fichier `test-heroku.ps1` :

```powershell
# Script de test du backend Heroku
$baseUrl = "https://dringdring-backend-11897a1e3635.herokuapp.com"

Write-Host "🧪 Test du Backend Heroku" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "1. Health Check..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$baseUrl/test/health" -Method GET
Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
Write-Host "   Response: $($response.Content)" -ForegroundColor Cyan
Write-Host ""

# Test 2: Client Stats
Write-Host "2. Client Stats..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$baseUrl/test/client/stats" -Method GET
Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
Write-Host ""

# Test 3: Shop Deliveries
Write-Host "3. Shop Deliveries..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$baseUrl/test/shop/deliveries" -Method GET
Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
Write-Host ""

# Test 4: HQ Admin Stats
Write-Host "4. HQ Admin Stats..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$baseUrl/test/hq-admin/stats" -Method GET
Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
Write-Host ""

# Test 5: HQ Admin Reports (Month)
Write-Host "5. HQ Admin Reports (Month)..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$baseUrl/test/hq-admin/reports/month" -Method GET
Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
Write-Host ""

Write-Host "✅ Tous les tests sont terminés !" -ForegroundColor Green
```

Exécutez-le :
```powershell
.\test-heroku.ps1
```

---

## 📊 Vérification des Logs

### Voir les logs en temps réel
```powershell
heroku logs --tail -a dringdring-backend
```

### Voir les dernières lignes
```powershell
heroku logs --num 50 -a dringdring-backend
```

---

## ✅ Checklist de Test

### Tests de Base
- [ ] Health check fonctionne (`/test/health`)
- [ ] Documentation Swagger accessible (`/docs`)
- [ ] Documentation ReDoc accessible (`/redoc`)

### Tests Client
- [ ] Stats client (`/test/client/stats`)
- [ ] Livraisons à venir (`/test/client/deliveries/upcoming`)
- [ ] Toutes les livraisons (`/test/client/deliveries`)
- [ ] Profil client (`/test/client/profile`)

### Tests Shop
- [ ] Stats magasin (`/test/shop/stats`)
- [ ] Livraisons magasin (`/test/shop/deliveries`)
- [ ] Profil magasin (`/test/shop/profile`)

### Tests HQ Admin
- [ ] Stats HQ (`/test/hq-admin/stats`)
- [ ] Livraisons HQ (`/test/hq-admin/deliveries`)
- [ ] Rapports HQ (`/test/hq-admin/reports/month`)
- [ ] Utilisateurs HQ (`/test/hq-admin/users`)

### Tests Regional Admin
- [ ] Stats régional (`/test/regional/stats`)
- [ ] Magasins régionaux (`/test/regional/shops`)
- [ ] Livraisons régionales (`/test/regional/deliveries`)

### Tests Super Admin
- [ ] Stats super admin (`/test/super-admin/stats`)
- [ ] Tous les magasins (`/test/super-admin/shops`)
- [ ] Tous les utilisateurs (`/test/super-admin/users`)

---

## 🐛 Dépannage

### Erreur : "Connection refused"
- Vérifiez que l'application est bien déployée : `heroku ps -a dringdring-backend`
- Vérifiez les logs : `heroku logs --tail -a dringdring-backend`

### Erreur : "404 Not Found"
- Vérifiez que l'URL est correcte
- Vérifiez que l'endpoint existe dans `/docs`

### Erreur : "500 Internal Server Error"
- Vérifiez les logs : `heroku logs --tail -a dringdring-backend`
- Vérifiez que Firebase est bien configuré

### Réponse lente
- C'est normal au premier démarrage (cold start)
- Les requêtes suivantes seront plus rapides

---

## 🎯 Prochaines Étapes

Une fois les tests réussis :

1. ✅ Backend fonctionne sur Heroku
2. ⏳ Déployer le frontend sur Vercel
3. ⏳ Configurer les variables Firebase dans Vercel
4. ⏳ Tester l'application complète

---

**🎉 Bon test !**

Pour tester rapidement, ouvrez simplement :
👉 **https://dringdring-backend-11897a1e3635.herokuapp.com/docs**

