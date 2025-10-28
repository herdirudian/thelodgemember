# DNS Propagation Checker for family.thelodgegroup.id
# This script checks if DNS has fully propagated to point to our VPS (31.97.51.129)

Write-Host "=== DNS Propagation Checker ===" -ForegroundColor Green
Write-Host "Target IP: 31.97.51.129 (Our VPS)" -ForegroundColor Yellow
Write-Host "Checking every 30 seconds..." -ForegroundColor Yellow
Write-Host ""

$targetIP = "31.97.51.129"
$domain = "family.thelodgegroup.id"

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Checking DNS..." -ForegroundColor Cyan
    
    try {
        # Get all A records
        $dnsResults = Resolve-DnsName $domain -Type A -ErrorAction Stop
        $ipAddresses = $dnsResults | Where-Object { $_.Type -eq "A" } | Select-Object -ExpandProperty IPAddress
        
        Write-Host "Current IPs: $($ipAddresses -join ', ')" -ForegroundColor White
        
        # Check if only our VPS IP is returned
        if ($ipAddresses.Count -eq 1 -and $ipAddresses[0] -eq $targetIP) {
            Write-Host "✅ SUCCESS! DNS fully propagated to our VPS!" -ForegroundColor Green
            Write-Host "Testing website access..." -ForegroundColor Yellow
            
            try {
                $response = Invoke-WebRequest -Uri "http://$domain" -MaximumRedirection 0 -ErrorAction Stop
                if ($response.Headers.Server -like "*nginx*") {
                    Write-Host "✅ Website is accessible and served by our Nginx!" -ForegroundColor Green
                    break
                }
            } catch {
                if ($_.Exception.Response.StatusCode -eq 302) {
                    Write-Host "✅ Website is accessible (got redirect as expected)!" -ForegroundColor Green
                    break
                }
            }
        } elseif ($ipAddresses -contains $targetIP) {
            Write-Host "⏳ Partial propagation - our IP is in the list" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Still pointing to old servers" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "❌ DNS lookup failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "Waiting 30 seconds..." -ForegroundColor Gray
    Write-Host ""
    Start-Sleep -Seconds 30
}

Write-Host ""
Write-Host "🎉 DNS propagation complete! Your website should now be accessible at http://$domain" -ForegroundColor Green