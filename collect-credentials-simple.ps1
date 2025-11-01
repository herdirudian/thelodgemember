# Lodge Family Credentials Collection Script - Simplified Version

param(
    [string]$VpsHost = "31.97.51.129"
)

Write-Host "LODGE FAMILY - CREDENTIALS COLLECTION" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "Target VPS: $VpsHost" -ForegroundColor Gray
Write-Host "Started: $(Get-Date)" -ForegroundColor Gray

Write-Host "`nChecking Local Environment Files..." -ForegroundColor Cyan

# Check backend .env files
if (Test-Path "backend\.env") {
    Write-Host "Found: backend\.env" -ForegroundColor Green
    $backendEnv = Get-Content "backend\.env"
    $xenditFound = $backendEnv | Where-Object { $_ -match "XENDIT_" }
    $whatsappFound = $backendEnv | Where-Object { $_ -match "WHATSAPP_" }
    $jwtFound = $backendEnv | Where-Object { $_ -match "JWT_" }
    
    if ($xenditFound) { Write-Host "  - Xendit credentials found" -ForegroundColor Cyan }
    if ($whatsappFound) { Write-Host "  - WhatsApp credentials found" -ForegroundColor Cyan }
    if ($jwtFound) { Write-Host "  - JWT secrets found" -ForegroundColor Cyan }
} else {
    Write-Host "Missing: backend\.env" -ForegroundColor Red
}

if (Test-Path "frontend\.env") {
    Write-Host "Found: frontend\.env" -ForegroundColor Green
} else {
    Write-Host "Missing: frontend\.env" -ForegroundColor Red
}

if (Test-Path "backend\.env.production") {
    Write-Host "Found: backend\.env.production" -ForegroundColor Green
} else {
    Write-Host "Missing: backend\.env.production" -ForegroundColor Red
}

Write-Host "`nRequired Credentials Checklist:" -ForegroundColor Yellow
Write-Host "- XENDIT_SECRET_KEY (Xendit payment gateway)" -ForegroundColor White
Write-Host "- XENDIT_PUBLIC_KEY (Xendit payment gateway)" -ForegroundColor White
Write-Host "- XENDIT_WEBHOOK_TOKEN (Xendit webhook verification)" -ForegroundColor White
Write-Host "- WHATSAPP_TOKEN (WhatsApp Business API)" -ForegroundColor White
Write-Host "- WHATSAPP_PHONE_NUMBER_ID (WhatsApp phone number)" -ForegroundColor White
Write-Host "- WHATSAPP_VERIFY_TOKEN (WhatsApp webhook verification)" -ForegroundColor White
Write-Host "- JWT_SECRET (JSON Web Token secret)" -ForegroundColor White
Write-Host "- DATABASE_URL (Database connection string)" -ForegroundColor White
Write-Host "- NEXTAUTH_SECRET (NextAuth.js secret)" -ForegroundColor White
Write-Host "- NEXTAUTH_URL (NextAuth.js callback URL)" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Verify all environment files contain required credentials" -ForegroundColor White
Write-Host "2. Test Xendit API connectivity" -ForegroundColor White
Write-Host "3. Validate WhatsApp webhook setup" -ForegroundColor White
Write-Host "4. Confirm database connections" -ForegroundColor White

Write-Host "`nCompleted: $(Get-Date)" -ForegroundColor Gray