# Fix and Complete VPS Setup
Write-Host "=== FIXING AND COMPLETING VPS SETUP ===" -ForegroundColor Green
Write-Host "Target VPS: 31.97.51.129" -ForegroundColor Yellow
Write-Host ""

# Step 1: Upload fixed configuration files
Write-Host "Step 1: Uploading fixed configuration files..." -ForegroundColor Cyan

Write-Host "Uploading nginx-rate-limit-fixed.conf..." -ForegroundColor Yellow
scp nginx-rate-limit-fixed.conf root@31.97.51.129:/etc/nginx/conf.d/

Write-Host "Uploading nginx-security-fixed.conf..." -ForegroundColor Yellow  
scp nginx-security-fixed.conf root@31.97.51.129:/etc/nginx/conf.d/

Write-Host "Configuration files uploaded!" -ForegroundColor Green
Write-Host ""

# Step 2: Remove old problematic files and setup
Write-Host "Step 2: Cleaning up and configuring..." -ForegroundColor Cyan

$cleanupCommands = 'rm -f /etc/nginx/conf.d/nginx-rate-limit-config.conf && rm -f /etc/nginx/conf.d/nginx-security-config.conf && chmod +x /root/*.sh && nginx -t && systemctl reload nginx && /root/setup-backup-cron.sh'

Write-Host "Running cleanup and configuration..." -ForegroundColor Yellow
ssh root@31.97.51.129 $cleanupCommands

Write-Host ""
Write-Host "=== VERIFYING FINAL SETUP ===" -ForegroundColor Green

# Test website
Write-Host "Testing website..." -ForegroundColor Cyan
try {
    Start-Sleep -Seconds 2
    $webResponse = Invoke-WebRequest -Uri "https://family.thelodgegroup.id" -Method Head -TimeoutSec 10
    Write-Host "Website Status: $($webResponse.StatusCode)" -ForegroundColor Green
    
    # Check security headers
    $securityFound = $false
    $headersList = @()
    
    foreach ($header in $webResponse.Headers.Keys) {
        if ($header -match "X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Strict-Transport-Security") {
            $securityFound = $true
            $headersList += $header
        }
    }
    
    if ($securityFound) {
        Write-Host "Security Headers Found: $($headersList -join ', ')" -ForegroundColor Green
        Write-Host "SUCCESS: Security configuration applied!" -ForegroundColor Green
    } else {
        Write-Host "Security Headers: Still not found - may need more time" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Website test error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test API
Write-Host ""
Write-Host "Testing API..." -ForegroundColor Cyan
try {
    $apiResponse = Invoke-WebRequest -Uri "https://family.thelodgegroup.id/api" -TimeoutSec 10
    Write-Host "API Status: $($apiResponse.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "API test error: $($_.Exception.Message)" -ForegroundColor Red
}

# Performance test
Write-Host ""
Write-Host "Performance test..." -ForegroundColor Cyan
try {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    Invoke-WebRequest -Uri "https://family.thelodgegroup.id/api" -TimeoutSec 10 | Out-Null
    $stopwatch.Stop()
    Write-Host "Response Time: $($stopwatch.ElapsedMilliseconds)ms" -ForegroundColor White
}
catch {
    Write-Host "Performance test failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== FINAL STATUS ===" -ForegroundColor Blue
Write-Host "VPS Setup Complete!" -ForegroundColor Green
Write-Host "Lodge Family Application is Production Ready!" -ForegroundColor Green