# Local Monitoring Dashboard for Lodge Family Production
# Run this script to monitor your production deployment from your local machine

Write-Host "LODGE FAMILY PRODUCTION MONITOR" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""

$VPS_HOST = "31.97.51.129"
$DOMAIN = "family.thelodgegroup.id"

function Test-ProductionHealth {
    Write-Host "Checking production health..." -ForegroundColor Yellow
    
    # Test website
    try {
        $response = Invoke-WebRequest -Uri "https://$DOMAIN" -Method HEAD -TimeoutSec 10 -UseBasicParsing
        Write-Host "Website: ONLINE (Status: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "Website: OFFLINE - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test API
    try {
        $apiResponse = Invoke-WebRequest -Uri "https://$DOMAIN/api/health" -Method GET -TimeoutSec 10 -UseBasicParsing
        Write-Host "API: ONLINE (Status: $($apiResponse.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "API: OFFLINE - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test SSL
    try {
        $sslTest = Invoke-WebRequest -Uri "https://$DOMAIN" -Method HEAD -TimeoutSec 10 -UseBasicParsing
        Write-Host "SSL: VALID" -ForegroundColor Green
    } catch {
        Write-Host "SSL: INVALID - $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Get-VPSStatus {
    Write-Host "Getting VPS status..." -ForegroundColor Yellow
    
    # This requires SSH access - you can uncomment and modify as needed
    # ssh root@$VPS_HOST "systemctl status lodge-family-backend lodge-family-frontend"
    
    Write-Host "To check VPS status manually, run:" -ForegroundColor Gray
    Write-Host "ssh root@$VPS_HOST" -ForegroundColor Gray
    Write-Host "systemctl status lodge-family-backend lodge-family-frontend" -ForegroundColor Gray
}

function Show-RecentLogs {
    Write-Host "To view recent logs, run these commands on VPS:" -ForegroundColor Yellow
    Write-Host "ssh root@$VPS_HOST" -ForegroundColor Gray
    Write-Host "tail -f /var/log/lodge-family-health.log" -ForegroundColor Gray
    Write-Host "journalctl -u lodge-family-backend -f" -ForegroundColor Gray
    Write-Host "journalctl -u lodge-family-frontend -f" -ForegroundColor Gray
}

# Main monitoring loop
while ($true) {
    Clear-Host
    Write-Host "LODGE FAMILY PRODUCTION MONITOR - $(Get-Date)" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    
    Test-ProductionHealth
    
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "1. Refresh (Enter)" -ForegroundColor White
    Write-Host "2. VPS Status (v)" -ForegroundColor White
    Write-Host "3. View Logs (l)" -ForegroundColor White
    Write-Host "4. Exit (q)" -ForegroundColor White
    Write-Host ""
    
    $input = Read-Host "Enter command"
    
    switch ($input.ToLower()) {
        "v" { Get-VPSStatus; Read-Host "Press Enter to continue" }
        "l" { Show-RecentLogs; Read-Host "Press Enter to continue" }
        "q" { break }
        default { continue }
    }
}
