# Lodge Family Final Production Verification Script

param(
    [string]$Domain = "family.thelodgegroup.id",
    [string]$VpsHost = "31.97.51.129"
)

Write-Host "LODGE FAMILY - FINAL PRODUCTION VERIFICATION" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "Domain: $Domain" -ForegroundColor Gray
Write-Host "VPS Host: $VpsHost" -ForegroundColor Gray
Write-Host "Started: $(Get-Date)" -ForegroundColor Gray

$results = @()
$passedTests = 0
$totalTests = 0

function Test-Endpoint {
    param([string]$Url, [string]$Description, [int]$ExpectedStatus = 200)
    
    $totalTests++
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "✓ $Description" -ForegroundColor Green
            $script:passedTests++
            return $true
        } else {
            Write-Host "✗ $Description (Status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "✗ $Description (Error: $($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

function Test-SSL {
    param([string]$Domain)
    
    $totalTests++
    try {
        $cert = [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
        $request = [System.Net.WebRequest]::Create("https://$Domain")
        $request.Timeout = 10000
        $response = $request.GetResponse()
        $cert = $request.ServicePoint.Certificate
        
        if ($cert) {
            $expiryDate = [DateTime]::Parse($cert.GetExpirationDateString())
            $daysUntilExpiry = ($expiryDate - (Get-Date)).Days
            
            if ($daysUntilExpiry -gt 7) {
                Write-Host "✓ SSL Certificate Valid (Expires: $($expiryDate.ToString('yyyy-MM-dd')), $daysUntilExpiry days remaining)" -ForegroundColor Green
                $script:passedTests++
                return $true
            } else {
                Write-Host "⚠ SSL Certificate Expires Soon ($daysUntilExpiry days)" -ForegroundColor Yellow
                return $false
            }
        }
    } catch {
        Write-Host "✗ SSL Certificate Check Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "`n=== CONNECTIVITY TESTS ===" -ForegroundColor Cyan

# Test basic connectivity
Test-Endpoint "https://$Domain" "Website Accessibility"
Test-Endpoint "https://$Domain/api" "API Health Check"

# Test SSL
Test-SSL $Domain

Write-Host "`n=== SECURITY TESTS ===" -ForegroundColor Cyan

# Test HTTPS redirect
$totalTests++
try {
    $response = Invoke-WebRequest -Uri "http://$Domain" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 301 -or $response.StatusCode -eq 302) {
        Write-Host "✓ HTTP to HTTPS Redirect Working" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "✗ HTTP to HTTPS Redirect Not Working" -ForegroundColor Red
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 301 -or $_.Exception.Response.StatusCode -eq 302) {
        Write-Host "✓ HTTP to HTTPS Redirect Working" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "✗ HTTP to HTTPS Redirect Failed" -ForegroundColor Red
    }
}

# Test security headers
$totalTests++
try {
    $response = Invoke-WebRequest -Uri "https://$Domain" -UseBasicParsing
    $securityHeaders = @(
        "X-Frame-Options",
        "X-Content-Type-Options", 
        "X-XSS-Protection",
        "Strict-Transport-Security"
    )
    
    $foundHeaders = 0
    foreach ($header in $securityHeaders) {
        if ($response.Headers[$header]) {
            $foundHeaders++
        }
    }
    
    if ($foundHeaders -ge 3) {
        Write-Host "✓ Security Headers Present ($foundHeaders/4)" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "✗ Insufficient Security Headers ($foundHeaders/4)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Security Headers Check Failed" -ForegroundColor Red
}

Write-Host "`n=== API ENDPOINT TESTS ===" -ForegroundColor Cyan

# Test API endpoints
$apiEndpoints = @(
    @{Url="https://$Domain/api"; Description="Main API Health"},
    @{Url="https://$Domain/api/member"; Description="Member API"; ExpectedStatus=405},
    @{Url="https://$Domain/api/booking"; Description="Booking API"; ExpectedStatus=405},
    @{Url="https://$Domain/api/webhook"; Description="Webhook API"; ExpectedStatus=405}
)

foreach ($endpoint in $apiEndpoints) {
    if ($endpoint.ExpectedStatus) {
        Test-Endpoint $endpoint.Url $endpoint.Description $endpoint.ExpectedStatus
    } else {
        Test-Endpoint $endpoint.Url $endpoint.Description
    }
}

Write-Host "`n=== VPS SYSTEM CHECKS ===" -ForegroundColor Cyan

# Test VPS connectivity
$totalTests++
try {
    $sshTest = ssh -o ConnectTimeout=10 root@$VpsHost "echo 'SSH_OK'"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ VPS SSH Access Working" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "✗ VPS SSH Access Failed" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ VPS SSH Access Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== PERFORMANCE TESTS ===" -ForegroundColor Cyan

# Test response time
$totalTests++
try {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $response = Invoke-WebRequest -Uri "https://$Domain" -UseBasicParsing
    $stopwatch.Stop()
    $responseTime = $stopwatch.ElapsedMilliseconds
    
    if ($responseTime -lt 3000) {
        Write-Host "✓ Response Time: ${responseTime}ms (Good)" -ForegroundColor Green
        $passedTests++
    } elseif ($responseTime -lt 5000) {
        Write-Host "⚠ Response Time: ${responseTime}ms (Acceptable)" -ForegroundColor Yellow
        $passedTests++
    } else {
        Write-Host "✗ Response Time: ${responseTime}ms (Slow)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Response Time Test Failed" -ForegroundColor Red
}

Write-Host "`n=== BACKUP VERIFICATION ===" -ForegroundColor Cyan

# Check if backup files exist
$backupFiles = @("backup-lodge-family.sh", "restore-lodge-family.sh", "setup-backup-cron.sh")
foreach ($file in $backupFiles) {
    $totalTests++
    if (Test-Path $file) {
        Write-Host "✓ Backup Script Available: $file" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "✗ Backup Script Missing: $file" -ForegroundColor Red
    }
}

Write-Host "`n=== CONFIGURATION FILES ===" -ForegroundColor Cyan

# Check configuration files
$configFiles = @(
    "nginx-security-config.conf",
    "nginx-rate-limit-config.conf", 
    "ssl-optimization-config.conf"
)

foreach ($file in $configFiles) {
    $totalTests++
    if (Test-Path $file) {
        Write-Host "✓ Configuration File Available: $file" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "✗ Configuration File Missing: $file" -ForegroundColor Red
    }
}

Write-Host "`n=== FINAL RESULTS ===" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

$successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)

Write-Host "Tests Passed: $passedTests / $totalTests" -ForegroundColor White
Write-Host "Success Rate: $successRate%" -ForegroundColor White

if ($successRate -ge 90) {
    Write-Host "🎉 PRODUCTION READY - Excellent!" -ForegroundColor Green
} elseif ($successRate -ge 80) {
    Write-Host "✅ PRODUCTION READY - Good" -ForegroundColor Green
} elseif ($successRate -ge 70) {
    Write-Host "⚠ NEEDS ATTENTION - Some issues found" -ForegroundColor Yellow
} else {
    Write-Host "❌ NOT PRODUCTION READY - Critical issues found" -ForegroundColor Red
}

Write-Host "`nRecommendations:" -ForegroundColor Cyan
if ($successRate -lt 100) {
    Write-Host "- Review failed tests and address issues" -ForegroundColor White
    Write-Host "- Ensure all security configurations are applied" -ForegroundColor White
    Write-Host "- Verify backup system is properly deployed" -ForegroundColor White
}
Write-Host "- Monitor application logs regularly" -ForegroundColor White
Write-Host "- Set up automated monitoring alerts" -ForegroundColor White
Write-Host "- Schedule regular security updates" -ForegroundColor White

Write-Host "`nCompleted: $(Get-Date)" -ForegroundColor Gray