# Script de test du backend Heroku - DringDring
# Usage: .\test-heroku-backend.ps1

$baseUrl = "https://dringdring-backend-11897a1e3635.herokuapp.com"

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Endpoint,
        [string]$Method = "GET"
    )
    
    Write-Host "🧪 Test: $Name" -ForegroundColor Yellow
    Write-Host "   URL: $baseUrl$Endpoint" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$Endpoint" -Method $Method -ErrorAction Stop
        Write-Host "   ✅ Status: $($response.StatusCode)" -ForegroundColor Green
        
        # Afficher un extrait de la réponse
        $content = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($content) {
            $jsonPreview = ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 2 -Compress)
            if ($jsonPreview.Length -gt 100) {
                $jsonPreview = $jsonPreview.Substring(0, 100) + "..."
            }
            Write-Host "   📄 Response: $jsonPreview" -ForegroundColor Cyan
        }
        
        return $true
    }
    catch {
        Write-Host "   ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    finally {
        Write-Host ""
    }
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧪 TEST DU BACKEND HEROKU - DRINGDRING" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Tests de base
Write-Host "📋 TESTS DE BASE" -ForegroundColor Magenta
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray
Test-Endpoint -Name "Health Check" -Endpoint "/test/health"

# Tests Client
Write-Host "👤 TESTS CLIENT" -ForegroundColor Magenta
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray
Test-Endpoint -Name "Client Stats" -Endpoint "/test/client/stats"
Test-Endpoint -Name "Client Upcoming Deliveries" -Endpoint "/test/client/deliveries/upcoming"
Test-Endpoint -Name "Client All Deliveries" -Endpoint "/test/client/deliveries"
Test-Endpoint -Name "Client Profile" -Endpoint "/test/client/profile"

# Tests Shop
Write-Host "🏪 TESTS SHOP" -ForegroundColor Magenta
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray
Test-Endpoint -Name "Shop Stats" -Endpoint "/test/shop/stats"
Test-Endpoint -Name "Shop Deliveries" -Endpoint "/test/shop/deliveries"
Test-Endpoint -Name "Shop Upcoming Deliveries" -Endpoint "/test/shop/deliveries/upcoming"

# Tests HQ Admin
Write-Host "🏢 TESTS HQ ADMIN" -ForegroundColor Magenta
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray
Test-Endpoint -Name "HQ Admin Stats" -Endpoint "/test/hq-admin/stats"
Test-Endpoint -Name "HQ Admin Deliveries" -Endpoint "/test/hq-admin/deliveries"
Test-Endpoint -Name "HQ Admin Reports (Week)" -Endpoint "/test/hq-admin/reports/week"
Test-Endpoint -Name "HQ Admin Reports (Month)" -Endpoint "/test/hq-admin/reports/month"
Test-Endpoint -Name "HQ Admin Users" -Endpoint "/test/hq-admin/users"

# Tests Regional Admin
Write-Host "🌍 TESTS REGIONAL ADMIN" -ForegroundColor Magenta
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray
Test-Endpoint -Name "Regional Stats" -Endpoint "/test/regional/stats"
Test-Endpoint -Name "Regional Shops" -Endpoint "/test/regional/shops"
Test-Endpoint -Name "Regional Deliveries" -Endpoint "/test/regional/deliveries"

# Tests Super Admin
Write-Host "👑 TESTS SUPER ADMIN" -ForegroundColor Magenta
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray
Test-Endpoint -Name "Super Admin Stats" -Endpoint "/test/super-admin/stats"
Test-Endpoint -Name "Super Admin Shops" -Endpoint "/test/super-admin/shops"
Test-Endpoint -Name "Super Admin Users" -Endpoint "/test/super-admin/users"
Test-Endpoint -Name "Super Admin Deliveries" -Endpoint "/test/super-admin/deliveries"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Tests terminés !" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Pour tester dans le navigateur :" -ForegroundColor Yellow
Write-Host "   👉 https://dringdring-backend-11897a1e3635.herokuapp.com/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Pour voir les logs :" -ForegroundColor Yellow
Write-Host "   heroku logs --tail -a dringdring-backend" -ForegroundColor Cyan
Write-Host ""

