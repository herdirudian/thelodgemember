# 🏥 Production Health Check Script - Lodge Family
# This script performs comprehensive health checks on the production deployment

Write-Host "🏥 PRODUCTION HEALTH CHECK - LODGE FAMILY" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

$VPS_IP = "31.97.51.129"
$DOMAIN = "family.thelodgegroup.id"
$HTTPS_URL = "https://$DOMAIN"
$HTTP_URL = "http://$DOMAIN"

# Function to test URL with detailed response
function Test-URLHealth {
    param($url, $description)
    
    Write-Host "🔍 Testing: $description" -ForegroundColor Yellow
    Write-Host "   URL: $url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -UseBasicParsing
        $statusCode = $response.StatusCode
        $responseTime = (Measure-Command { Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -UseBasicParsing }).TotalMilliseconds
        
        if ($statusCode -eq 200) {
            Write-Host "   ✅ Status: $statusCode OK (${responseTime}ms)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ⚠️  Status: $statusCode" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    Write-Host ""
}

# Function to test SSL certificate
function Test-SSLCertificate {
    param($domain)
    
    Write-Host "🔒 Testing SSL Certificate for $domain" -ForegroundColor Yellow
    
    try {
        $cert = [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
        $request = [System.Net.WebRequest]::Create("https://$domain")
        $request.Timeout = 10000
        $response = $request.GetResponse()
        $cert = $request.ServicePoint.Certificate
        
        if ($cert) {
            $expiryDate = [DateTime]::Parse($cert.GetExpirationDateString())
            $daysUntilExpiry = ($expiryDate - (Get-Date)).Days
            
            Write-Host "   ✅ SSL Certificate Valid" -ForegroundColor Green
            Write-Host "   📅 Expires: $($cert.GetExpirationDateString())" -ForegroundColor Gray
            Write-Host "   ⏰ Days until expiry: $daysUntilExpiry" -ForegroundColor Gray
            
            if ($daysUntilExpiry -lt 30) {
                Write-Host "   ⚠️  WARNING: Certificate expires in less than 30 days!" -ForegroundColor Yellow
            }
            
            return $true
        }
    }
    catch {
        Write-Host "   ❌ SSL Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    Write-Host ""
}

# Function to test API endpoints
function Test-APIEndpoints {
    $apiBase = "$HTTPS_URL/api"
    
    Write-Host "🔌 Testing API Endpoints" -ForegroundColor Yellow
    
    # Test health endpoint
    Test-URLHealth "$apiBase/health" "API Health Check"
    
    # Test auth endpoints
    Test-URLHealth "$apiBase/auth/register" "Registration Endpoint"
    Test-URLHealth "$apiBase/auth/login" "Login Endpoint"
    
    # Test events endpoint
    Test-URLHealth "$apiBase/events" "Events Endpoint"
}

# Function to check DNS propagation
function Test-DNSPropagation {
    param($domain)
    
    Write-Host "🌐 Testing DNS Propagation for $domain" -ForegroundColor Yellow
    
    try {
        $dnsResult = Resolve-DnsName -Name $domain -Type A -ErrorAction Stop
        $resolvedIP = $dnsResult.IPAddress
        
        Write-Host "   ✅ DNS Resolution: $domain -> $resolvedIP" -ForegroundColor Green
        
        if ($resolvedIP -eq $VPS_IP) {
            Write-Host "   ✅ DNS points to correct VPS IP" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  DNS points to different IP: Expected $VPS_IP, Got $resolvedIP" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "   ❌ DNS Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Main Health Check Execution
Write-Host "Starting comprehensive health check..." -ForegroundColor Cyan
Write-Host ""

# 1. Test DNS
Test-DNSPropagation $DOMAIN

# 2. Test SSL Certificate
Test-SSLCertificate $DOMAIN

# 3. Test Main Website
Write-Host "🌐 Testing Website Access" -ForegroundColor Yellow
Test-URLHealth $HTTPS_URL "Main Website (HTTPS)"
Test-URLHealth $HTTP_URL "HTTP Redirect Test"

# 4. Test API Endpoints
Test-APIEndpoints

# 5. Test specific pages
Write-Host "📄 Testing Application Pages" -ForegroundColor Yellow
Test-URLHealth "$HTTPS_URL/login" "Login Page"
Test-URLHealth "$HTTPS_URL/register" "Registration Page"
Test-URLHealth "$HTTPS_URL/dashboard" "Dashboard Page"
Test-URLHealth "$HTTPS_URL/my-ticket" "My Ticket Page"
Test-URLHealth "$HTTPS_URL/exclusive-member" "Exclusive Member Page"

# 6. Performance Test
Write-Host "⚡ Performance Test" -ForegroundColor Yellow
$performanceTest = Measure-Command { 
    try {
        Invoke-WebRequest -Uri $HTTPS_URL -Method GET -TimeoutSec 30 -UseBasicParsing | Out-Null
    } catch {
        Write-Host "   ❌ Performance test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host "   ⏱️  Page load time: $($performanceTest.TotalMilliseconds)ms" -ForegroundColor Gray

if ($performanceTest.TotalMilliseconds -lt 2000) {
    Write-Host "   ✅ Performance: Excellent (< 2s)" -ForegroundColor Green
} elseif ($performanceTest.TotalMilliseconds -lt 5000) {
    Write-Host "   ⚠️  Performance: Good (< 5s)" -ForegroundColor Yellow
} else {
    Write-Host "   ❌ Performance: Needs optimization (> 5s)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🏁 Health Check Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "📊 SUMMARY" -ForegroundColor Cyan
Write-Host "- Domain: $DOMAIN" -ForegroundColor Gray
Write-Host "- VPS IP: $VPS_IP" -ForegroundColor Gray
Write-Host "- SSL Status: Check results above" -ForegroundColor Gray
Write-Host "- Performance: Check results above" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Review any failed checks above" -ForegroundColor Gray
Write-Host "2. Setup monitoring and alerts" -ForegroundColor Gray
Write-Host "3. Configure automated backups" -ForegroundColor Gray
Write-Host "4. Setup GitHub Actions for CI/CD" -ForegroundColor Gray