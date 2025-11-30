# Script pour mettre à jour les variables Firebase dans Heroku
# Utilise la nouvelle clé Firebase

$appName = "dringdring-backend"

# Nouvelles valeurs depuis le fichier JSON
$FIREBASE_PROJECT_ID = "dringdring-11a84"
$FIREBASE_PRIVATE_KEY_ID = "0c2060f88f047c0a58be957dd6b8cc12d97abf74"
$FIREBASE_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@dringdring-11a84.iam.gserviceaccount.com"
$FIREBASE_CLIENT_ID = "106222191146330144676"
$FIREBASE_AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
$FIREBASE_TOKEN_URI = "https://oauth2.googleapis.com/token"

# Clé privée (avec \n pour les retours à la ligne)
$FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC22/VnBuaCjyEc\nKZaNljOpX3ZejWwZJH8+oXrtSDtLL5lgRBKpmpZJwKB+hQeIRVJ2UQ2KKxA9R5mR\nQxYUKCRIyd3DnPt0GWtK/e2Wik/wyD6U9iHunX5Ei7ixPmEXt9ICR3KFhk0J+Hel\nuJ5RudP87RxEGYcuYbJh5JF9FhNZzHrHrLF7/AGqHphk4LXjgYsttijYoUb+Zvnq\n9mTBb9xx0nyc8gkhXWFdBqm9UyxkTVaPua1MYG+kYE6V48Ma29CXhMBCRzFcvnp7\nubrQpj9E+/GzwT6mCidC+M9mDuuC5zAGcSosnICNTfP9SjgdKDDnN8hASQziz2SB\nHgm1GFhDAgMBAAECggEAQIS4gAsHvw4oRQsJc1iJTtv/ZFoqx25AtUT9ngYr4Zng\nWH58RTplh40/M5TVdQfckiGEEPmjx7NhJEdS3XbSYppTNEdJ04t6d2HD+CdCEHde\n2WlEzK/mEuJnnqYfVOKHZ0V1S1Z5DSkNcjwDJFvYR7gTjpWhRES1T2P5z3RADKEH\n7Djp/qNBKOI0nM7psnBI0gV1cyQRRMw3kbYLgD3MP7NFGUx522TBxBkPMWM5d8rB\ngFl7blJpVsUZac72V/6aQ2INvPEP6ajGYGydCV8NZlvSqXb1OhndCU3wrSBTbn9J\nkYvx35Z9B3TQJeudOh6FxqeyTVfRGO2mLvkhQGXBrQKBgQDhbNMCRHGwffXLCa2V\nLT8jXs6/ZRK3Jr5BpF4+chaKxX2Do434ONx9T4Cwo++XHOB2mF7lE5g/S4UE2bGq\n2AnYPR3u6jywxfwcrJY1qkoISAJlwqGmRnDxrbMhLNOdgVcSawI0+6cceb4STgJ+\nZJ2fVUmF3dcAy/snhRgNRpM+rwKBgQDPqSsWRrXYTERJM6MjcU3PsH/7RZWcDLeI\nxsdMc646ZBJFpq2/Ti8HuaPwYaDL1MQgq2FRAYuHdQhu+TK9oPwuUwkx0Qm+3Frd\nBg52qeNa+EoPaBzydoOw+n0skgsI2PxANLHLUgYKV1RNSV0AlWvdScDyPFZ8lZVn\nUY3rMDfErQKBgCM/6R8JpN18VNsTAFm7YYweXyX+oBaTsFyDX1lUbcH1b9MN2D1g\nZtoRfIYinGx8z3y8Btq7XatIG9zOTcHxVljB9dROPH9H9kxlkHeD0V/KItXWwYBG\ns5KXHtOpNs4CU6NFqGqwj0kcoGQsXqd1BFDN/Vk5f01YmEVtwn0Q9CVxAoGAVqEw\nBF8DRXSrmA4epI6D83yiJ2TkAPGdL0Ydplsr99f/d2cNXJ11KTfcmE9iESZ1m1tj\ngbOvTZcZKZJ0BH/ANGMXltypwCGVFleMeRxuaGjkHIFGci/WyGH3DjzutYYv1Wkm\nMrfJJU9BL+zHC5NKKEq4X1WkjtyoMy3mkpLO8RECgYAvv5nPIURMw7W936vBLkHl\nHuoCvaxTL4jW0wigKt7PBnkI0P7/nuv/C8E9nPpJx3DsB9jKgZOTdL1Ie2xAtJvh\nvAaj8lrSiL2JTrBvqYW90cRD8+6bqWpV0Iq/zP2eNqLc7ojWxFYUn6s8dO+B3j6O\n406DnTgOyLrwpVmc7SrOqQ==\n-----END PRIVATE KEY-----\n"

Write-Host "Mise à jour des variables Firebase dans Heroku..." -ForegroundColor Cyan

# Mise à jour des variables une par une
Write-Host "Mise à jour FIREBASE_PROJECT_ID..." -ForegroundColor Yellow
heroku config:set FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID" -a $appName

Write-Host "Mise à jour FIREBASE_PRIVATE_KEY_ID..." -ForegroundColor Yellow
heroku config:set FIREBASE_PRIVATE_KEY_ID="$FIREBASE_PRIVATE_KEY_ID" -a $appName

Write-Host "Mise à jour FIREBASE_CLIENT_EMAIL..." -ForegroundColor Yellow
heroku config:set FIREBASE_CLIENT_EMAIL="$FIREBASE_CLIENT_EMAIL" -a $appName

Write-Host "Mise à jour FIREBASE_CLIENT_ID..." -ForegroundColor Yellow
heroku config:set FIREBASE_CLIENT_ID="$FIREBASE_CLIENT_ID" -a $appName

Write-Host "Mise à jour FIREBASE_AUTH_URI..." -ForegroundColor Yellow
heroku config:set FIREBASE_AUTH_URI="$FIREBASE_AUTH_URI" -a $appName

Write-Host "Mise à jour FIREBASE_TOKEN_URI..." -ForegroundColor Yellow
heroku config:set FIREBASE_TOKEN_URI="$FIREBASE_TOKEN_URI" -a $appName

Write-Host "Mise à jour FIREBASE_PRIVATE_KEY (cela peut prendre quelques secondes)..." -ForegroundColor Yellow
# Pour la clé privée, on doit utiliser des guillemets simples pour éviter les problèmes d'échappement
heroku config:set "FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY" -a $appName

Write-Host "`nVérification des variables configurées..." -ForegroundColor Cyan
heroku config -a $appName | Select-String "FIREBASE"

Write-Host "`n✅ Mise à jour terminée !" -ForegroundColor Green
Write-Host "Redémarrez l'application Heroku pour appliquer les changements :" -ForegroundColor Yellow
Write-Host "  heroku restart -a $appName" -ForegroundColor White

