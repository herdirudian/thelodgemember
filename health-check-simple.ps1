# Production Health Check Script - Lodge Family
# This script performs comprehensive health checks on the production deployment

Write-Host "PRODUCTION HEALTH CHECK - LODGE FAMILY" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

$VPS_IP = "31.97.51.129"
$DOMAIN = "family.thelodgegroup.id"
$HTTPS_URL = "https://$DOMAIN"
$HTTP_URL = "http://$DOMAIN"

# Function to test URL with detailed response
function Test-URLHealth {
    param($url, $description)
    
    Write-Host "Testing: $description" -ForegroundColor Yellow
    Write-Host "URL: $url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -UseBasicParsing
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 200) {
            Write-Host "SUCCESS: Status $statusCode OK" -ForegroundColor Green
            return $true
        } else {
            Write-Host "WARNING: Status $statusCode" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    Write-Host ""
}

# Function to test SSL certificate
function Test-SSLCertificate {
    param($domain)
    
    Write-Host "Testing SSL Certificate for $domain" -ForegroundColor Yellow
    
    try {
        # Simple SSL test using web request
        $request = Invoke-WebRequest -Uri "https://$domain" -Method HEAD -TimeoutSec 10 -UseBasicParsing
        Write-Host "SUCCESS: SSL Certificate is working" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "ERROR: SSL Certificate issue - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    Write-Host ""
}

# Function to check DNS propagation
function Test-DNSPropagation {
    param($domain)
    
    Write-Host "Testing DNS Propagation for $domain" -ForegroundColor Yellow
    
    try {
        $dnsResult = Resolve-DnsName -Name $domain -Type A -ErrorAction Stop
        $resolvedIP = $dnsResult.IPAddress
        
        Write-Host "SUCCESS: DNS Resolution: $domain -> $resolvedIP" -ForegroundColor Green
        
        if ($resolvedIP -eq $VPS_IP) {
            Write-Host "SUCCESS: DNS points to correct VPS IP" -ForegroundColor Green
        } else {
            Write-Host "WARNING: DNS points to different IP: Expected $VPS_IP, Got $resolvedIP" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "ERROR: DNS Resolution failed - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Main Health Check Execution
Write-Host "Starting comprehensive health check..." -ForegroundColor Cyan
Write-Host ""

# 1. Test DNS
Write-Host "=== DNS CHECK ===" -ForegroundColor Cyan
Test-DNSPropagation $DOMAIN

# 2. Test SSL Certificate
Write-Host "=== SSL CHECK ===" -ForegroundColor Cyan
Test-SSLCertificate $DOMAIN

# 3. Test Main Website
Write-Host "=== WEBSITE ACCESS CHECK ===" -ForegroundColor Cyan
Test-URLHealth $HTTPS_URL "Main Website (HTTPS)"
Test-URLHealth $HTTP_URL "HTTP Redirect Test"

# 4. Test API Endpoints
Write-Host "=== API ENDPOINTS CHECK ===" -ForegroundColor Cyan
Test-URLHealth "$HTTPS_URL/api/health" "API Health Check"
Test-URLHealth "$HTTPS_URL/api/events" "Events Endpoint"

# 5. Test specific pages
Write-Host "=== APPLICATION PAGES CHECK ===" -ForegroundColor Cyan
Test-URLHealth "$HTTPS_URL/login" "Login Page"
Test-URLHealth "$HTTPS_URL/register" "Registration Page"
Test-URLHealth "$HTTPS_URL/dashboard" "Dashboard Page"
Test-URLHealth "$HTTPS_URL/my-ticket" "My Ticket Page"
Test-URLHealth "$HTTPS_URL/exclusive-member" "Exclusive Member Page"

# 6. Performance Test
Write-Host "=== PERFORMANCE TEST ===" -ForegroundColor Cyan
Write-Host "Testing page load performance..." -ForegroundColor Yellow

$performanceTest = Measure-Command { 
    try {
        Invoke-WebRequest -Uri $HTTPS_URL -Method GET -TimeoutSec 30 -UseBasicParsing | Out-Null
        Write-Host "SUCCESS: Performance test completed" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Performance test failed - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Page load time: $([math]::Round($performanceTest.TotalMilliseconds, 2))ms" -ForegroundColor Gray

if ($performanceTest.TotalMilliseconds -lt 2000) {
    Write-Host "EXCELLENT: Performance is great (< 2s)" -ForegroundColor Green
} elseif ($performanceTest.TotalMilliseconds -lt 5000) {
    Write-Host "GOOD: Performance is acceptable (< 5s)" -ForegroundColor Yellow
} else {
    Write-Host "NEEDS OPTIMIZATION: Performance is slow (> 5s)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Health Check Complete!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "Domain: $DOMAIN" -ForegroundColor Gray
Write-Host "VPS IP: $VPS_IP" -ForegroundColor Gray
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Review any failed checks above" -ForegroundColor Gray
Write-Host "2. Setup monitoring and alerts" -ForegroundColor Gray
Write-Host "3. Configure automated backups" -ForegroundColor Gray
Write-Host "4. Setup GitHub Actions for CI/CD" -ForegroundColor Gray