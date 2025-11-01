# Lodge Family Credentials Collection Script
# Collects and verifies all API keys and credentials

param(
    [string]$VpsHost = "31.97.51.129"
)

Write-Host "LODGE FAMILY - CREDENTIALS COLLECTION" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "Target VPS: $VpsHost" -ForegroundColor Gray
Write-Host "Started: $(Get-Date)" -ForegroundColor Gray

# Function to check if environment variable exists
function Check-EnvVar {
    param([string]$VarName, [string]$Description)
    
    $value = [System.Environment]::GetEnvironmentVariable($VarName)
    if ($value) {
        Write-Host "✓ $Description ($VarName): Found" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ $Description ($VarName): Missing" -ForegroundColor Red
        return $false
    }
}

# Function to check file for environment variables
function Check-EnvFile {
    param([string]$FilePath, [string]$Description)
    
    if (Test-Path $FilePath) {
        Write-Host "✓ $Description: Found at $FilePath" -ForegroundColor Green
        $content = Get-Content $FilePath
        
        # Check for key variables
        $hasXendit = $content | Where-Object { $_ -match "XENDIT_" }
        $hasWhatsApp = $content | Where-Object { $_ -match "WHATSAPP_" }
        $hasJWT = $content | Where-Object { $_ -match "JWT_" }
        $hasDB = $content | Where-Object { $_ -match "DATABASE_" -or $_ -match "DB_" }
        
        if ($hasXendit) { Write-Host "  - Xendit credentials found" -ForegroundColor Cyan }
        if ($hasWhatsApp) { Write-Host "  - WhatsApp credentials found" -ForegroundColor Cyan }
        if ($hasJWT) { Write-Host "  - JWT secrets found" -ForegroundColor Cyan }
        if ($hasDB) { Write-Host "  - Database credentials found" -ForegroundColor Cyan }
        
        return $true
    } else {
        Write-Host "✗ $Description: Not found at $FilePath" -ForegroundColor Red
        return $false
    }
}

Write-Host "`nChecking Local Environment Files..." -ForegroundColor Cyan

# Check backend .env files
Check-EnvFile "backend\.env" "Backend Environment File"
Check-EnvFile "backend\.env.local" "Backend Local Environment File"
Check-EnvFile "backend\.env.production" "Backend Production Environment File"

# Check frontend .env files
Check-EnvFile "frontend\.env" "Frontend Environment File"
Check-EnvFile "frontend\.env.local" "Frontend Local Environment File"
Check-EnvFile "frontend\.env.production" "Frontend Production Environment File"

Write-Host "`nChecking VPS Environment..." -ForegroundColor Cyan

try {
    # Check if we can connect to VPS
    $sshTest = ssh -o ConnectTimeout=10 root@$VpsHost "echo 'Connection successful'"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ VPS Connection: Successful" -ForegroundColor Green
        
        # Check for environment files on VPS
        Write-Host "`nChecking VPS Environment Files..." -ForegroundColor Cyan
        
        $vpsEnvCheck = ssh root@$VpsHost "ls -la /root/lodge-family/backend/.env* 2>/dev/null || echo 'No env files found'"
        Write-Host "VPS Environment Files:" -ForegroundColor White
        Write-Host $vpsEnvCheck -ForegroundColor Gray
        
        # Check running processes
        Write-Host "`nChecking Running Services..." -ForegroundColor Cyan
        $processes = ssh root@$VpsHost "ps aux | grep -E '(node|nginx|mysql)' | grep -v grep"
        Write-Host "Running Services:" -ForegroundColor White
        Write-Host $processes -ForegroundColor Gray
        
    } else {
        Write-Host "✗ VPS Connection: Failed" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ VPS Connection: Error - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nCredentials Summary:" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

# Create credentials checklist
$credentialsNeeded = @(
    "XENDIT_SECRET_KEY - Xendit payment gateway secret key",
    "XENDIT_PUBLIC_KEY - Xendit payment gateway public key", 
    "XENDIT_WEBHOOK_TOKEN - Xendit webhook verification token",
    "WHATSAPP_TOKEN - WhatsApp Business API token",
    "WHATSAPP_PHONE_NUMBER_ID - WhatsApp phone number ID",
    "WHATSAPP_VERIFY_TOKEN - WhatsApp webhook verification token",
    "JWT_SECRET - JSON Web Token secret for authentication",
    "DATABASE_URL - Database connection string",
    "NEXTAUTH_SECRET - NextAuth.js secret key",
    "NEXTAUTH_URL - NextAuth.js callback URL"
)

Write-Host "`nRequired Credentials:" -ForegroundColor Cyan
foreach ($cred in $credentialsNeeded) {
    Write-Host "- $cred" -ForegroundColor White
}

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Ensure all .env files contain required credentials" -ForegroundColor White
Write-Host "2. Verify Xendit API keys are active and valid" -ForegroundColor White
Write-Host "3. Test WhatsApp webhook connectivity" -ForegroundColor White
Write-Host "4. Confirm JWT secrets are secure and consistent" -ForegroundColor White
Write-Host "5. Validate database connection strings" -ForegroundColor White

Write-Host "`nCompleted: $(Get-Date)" -ForegroundColor Gray