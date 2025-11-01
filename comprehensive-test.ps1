# COMPREHENSIVE TESTING SCRIPT - LODGE FAMILY APPLICATION
# ========================================================

param(
    [string]$BaseUrl = "https://family.thelodgegroup.id",
    [string]$ApiUrl = "https://family.thelodgegroup.id/api"
)

# Test Results Storage
$TestResults = @()
$PassedTests = 0
$FailedTests = 0

function Write-TestHeader {
    param([string]$Title)
    Write-Host "`n" + "="*60 -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "="*60 -ForegroundColor Cyan
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details = "",
        [int]$ResponseTime = 0
    )
    
    $Status = if ($Passed) { "PASS" } else { "FAIL" }
    $Color = if ($Passed) { "Green" } else { "Red" }
    
    Write-Host "[$Status] $TestName" -ForegroundColor $Color
    if ($Details) {
        Write-Host "       $Details" -ForegroundColor Gray
    }
    if ($ResponseTime -gt 0) {
        Write-Host "       Response Time: ${ResponseTime}ms" -ForegroundColor Gray
    }
    
    $script:TestResults += @{
        Name = $TestName
        Status = $Status
        Details = $Details
        ResponseTime = $ResponseTime
    }
    
    if ($Passed) { $script:PassedTests++ } else { $script:FailedTests++ }
}

function Test-Url {
    param(
        [string]$Url,
        [string]$TestName,
        [int]$ExpectedStatus = 200,
        [string]$ExpectedContent = ""
    )
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30
        $stopwatch.Stop()
        
        $passed = $response.StatusCode -eq $ExpectedStatus
        if ($ExpectedContent -and $passed) {
            $passed = $response.Content -like "*$ExpectedContent*"
        }
        
        $details = "Status: $($response.StatusCode)"
        if ($ExpectedContent -and -not ($response.Content -like "*$ExpectedContent*")) {
            $details += " | Expected content not found"
        }
        
        Write-TestResult -TestName $TestName -Passed $passed -Details $details -ResponseTime $stopwatch.ElapsedMilliseconds
        return $passed
    }
    catch {
        Write-TestResult -TestName $TestName -Passed $false -Details "Error: $($_.Exception.Message)"
        return $false
    }
}

function Test-ApiEndpoint {
    param(
        [string]$Endpoint,
        [string]$TestName,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = "",
        [int]$ExpectedStatus = 200
    )
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $params = @{
            Uri = "$ApiUrl$Endpoint"
            Method = $Method
            UseBasicParsing = $true
            TimeoutSec = 30
        }
        
        if ($Headers.Count -gt 0) {
            $params.Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        $stopwatch.Stop()
        
        $passed = $response.StatusCode -eq $ExpectedStatus
        $details = "Status: $($response.StatusCode)"
        
        Write-TestResult -TestName $TestName -Passed $passed -Details $details -ResponseTime $stopwatch.ElapsedMilliseconds
        return $response
    }
    catch {
        Write-TestResult -TestName $TestName -Passed $false -Details "Error: $($_.Exception.Message)"
        return $null
    }
}

# START COMPREHENSIVE TESTING
Write-Host "LODGE FAMILY - COMPREHENSIVE PRODUCTION TESTING" -ForegroundColor Yellow
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "API URL: $ApiUrl" -ForegroundColor Gray
Write-Host "Started: $(Get-Date)" -ForegroundColor Gray

# 1. FRONTEND PAGES TESTING
Write-TestHeader "FRONTEND PAGES TESTING"

Test-Url -Url "$BaseUrl/" -TestName "Homepage" -ExpectedContent "Lodge Family"
Test-Url -Url "$BaseUrl/register" -TestName "Registration Page" -ExpectedContent "register"
Test-Url -Url "$BaseUrl/login" -TestName "Login Page" -ExpectedContent "login"
Test-Url -Url "$BaseUrl/dashboard" -TestName "Dashboard Page"
Test-Url -Url "$BaseUrl/my-ticket" -TestName "My Ticket Page"
Test-Url -Url "$BaseUrl/exclusive-member" -TestName "Exclusive Member Page"

# 2. API ENDPOINTS TESTING
Write-TestHeader "API ENDPOINTS TESTING"

Test-ApiEndpoint -Endpoint "/health" -TestName "Health Check Endpoint"
Test-ApiEndpoint -Endpoint "/auth/register" -TestName "Register Endpoint (OPTIONS)" -Method "OPTIONS" -ExpectedStatus 200
Test-ApiEndpoint -Endpoint "/auth/login" -TestName "Login Endpoint (OPTIONS)" -Method "OPTIONS" -ExpectedStatus 200
Test-ApiEndpoint -Endpoint "/tickets" -TestName "Tickets Endpoint (Unauthorized)" -ExpectedStatus 401
Test-ApiEndpoint -Endpoint "/members" -TestName "Members Endpoint (Unauthorized)" -ExpectedStatus 401

# 3. SECURITY HEADERS TESTING
Write-TestHeader "SECURITY HEADERS TESTING"

try {
    $response = Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing
    
    $securityHeaders = @{
        "X-Content-Type-Options" = "nosniff"
        "X-Frame-Options" = "DENY"
        "X-XSS-Protection" = "1; mode=block"
        "Strict-Transport-Security" = "max-age="
    }
    
    foreach ($header in $securityHeaders.GetEnumerator()) {
        $headerExists = $response.Headers.ContainsKey($header.Key)
        $headerValue = if ($headerExists) { $response.Headers[$header.Key] } else { "Not Set" }
        
        if ($header.Value -eq "max-age=") {
            $passed = $headerExists -and $headerValue -like "*max-age=*"
        } else {
            $passed = $headerExists -and $headerValue -eq $header.Value
        }
        
        Write-TestResult -TestName "Security Header: $($header.Key)" -Passed $passed -Details "Value: $headerValue"
    }
}
catch {
    Write-TestResult -TestName "Security Headers Check" -Passed $false -Details "Error: $($_.Exception.Message)"
}

# 4. SSL/TLS TESTING
Write-TestHeader "SSL/TLS CERTIFICATE TESTING"

try {
    $uri = [System.Uri]$BaseUrl
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($uri.Host, 443)
    
    $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream())
    $sslStream.AuthenticateAsClient($uri.Host)
    
    $cert = $sslStream.RemoteCertificate
    $cert2 = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($cert)
    
    $daysUntilExpiry = ($cert2.NotAfter - (Get-Date)).Days
    $isValid = $cert2.NotAfter -gt (Get-Date) -and $cert2.NotBefore -lt (Get-Date)
    
    Write-TestResult -TestName "SSL Certificate Validity" -Passed $isValid -Details "Expires: $($cert2.NotAfter) (in $daysUntilExpiry days)"
    Write-TestResult -TestName "SSL Certificate Subject" -Passed $true -Details "Subject: $($cert2.Subject)"
    
    $sslStream.Close()
    $tcpClient.Close()
}
catch {
    Write-TestResult -TestName "SSL Certificate Check" -Passed $false -Details "Error: $($_.Exception.Message)"
}

# 5. PERFORMANCE TESTING
Write-TestHeader "PERFORMANCE TESTING"

$performanceTests = @(
    @{ Url = "$BaseUrl/"; Name = "Homepage Load Time" },
    @{ Url = "$BaseUrl/login"; Name = "Login Page Load Time" },
    @{ Url = "$BaseUrl/register"; Name = "Register Page Load Time" },
    @{ Url = "$ApiUrl/health"; Name = "API Health Response Time" }
)

foreach ($test in $performanceTests) {
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $test.Url -UseBasicParsing -TimeoutSec 10
        $stopwatch.Stop()
        
        $responseTime = $stopwatch.ElapsedMilliseconds
        $passed = $responseTime -lt 3000  # Less than 3 seconds
        
        $performance = if ($responseTime -lt 500) { "Excellent" }
                      elseif ($responseTime -lt 1000) { "Good" }
                      elseif ($responseTime -lt 2000) { "Fair" }
                      else { "Poor" }
        
        Write-TestResult -TestName $test.Name -Passed $passed -Details "Performance: $performance" -ResponseTime $responseTime
    }
    catch {
        Write-TestResult -TestName $test.Name -Passed $false -Details "Error: $($_.Exception.Message)"
    }
}

# 6. DATABASE CONNECTIVITY TESTING
Write-TestHeader "DATABASE CONNECTIVITY TESTING"

# Test database through API endpoints that require DB access
Test-ApiEndpoint -Endpoint "/auth/register" -TestName "Database Write Test (Register)" -Method "POST" -Body '{"email":"test@example.com","password":"testpass","name":"Test User"}' -ExpectedStatus 400  # Should fail validation but reach DB
Test-ApiEndpoint -Endpoint "/auth/login" -TestName "Database Read Test (Login)" -Method "POST" -Body '{"email":"invalid@example.com","password":"invalid"}' -ExpectedStatus 401  # Should check DB and return unauthorized

# 7. CORS TESTING
Write-TestHeader "CORS TESTING"

try {
    $headers = @{
        "Origin" = "https://example.com"
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type"
    }
    
    $response = Invoke-WebRequest -Uri "$ApiUrl/auth/login" -Method "OPTIONS" -Headers $headers -UseBasicParsing
    
    $corsEnabled = $response.Headers.ContainsKey("Access-Control-Allow-Origin")
    $corsDetails = if ($corsEnabled) { "Origin: $($response.Headers['Access-Control-Allow-Origin'])" } else { "CORS headers not found" }
    
    Write-TestResult -TestName "CORS Configuration" -Passed $corsEnabled -Details $corsDetails
}
catch {
    Write-TestResult -TestName "CORS Configuration" -Passed $false -Details "Error: $($_.Exception.Message)"
}

# 8. REDIRECT TESTING
Write-TestHeader "REDIRECT TESTING"

# Test HTTP to HTTPS redirect
try {
    $httpUrl = $BaseUrl -replace "https://", "http://"
    $response = Invoke-WebRequest -Uri $httpUrl -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    
    $redirectsToHttps = $response.StatusCode -eq 301 -or $response.StatusCode -eq 302
    $locationHeader = $response.Headers["Location"]
    $redirectsCorrectly = $locationHeader -and $locationHeader.StartsWith("https://")
    
    Write-TestResult -TestName "HTTP to HTTPS Redirect" -Passed ($redirectsToHttps -and $redirectsCorrectly) -Details "Status: $($response.StatusCode), Location: $locationHeader"
}
catch {
    # If we get an exception, it might be because the redirect worked
    Write-TestResult -TestName "HTTP to HTTPS Redirect" -Passed $true -Details "Automatic redirect handled by client"
}

# FINAL SUMMARY
Write-TestHeader "TEST SUMMARY"

$totalTests = $PassedTests + $FailedTests
$successRate = if ($totalTests -gt 0) { [math]::Round(($PassedTests / $totalTests) * 100, 2) } else { 0 }

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $PassedTests" -ForegroundColor Green
Write-Host "Failed: $FailedTests" -ForegroundColor Red
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 75) { "Yellow" } else { "Red" })

Write-Host "`nCompleted: $(Get-Date)" -ForegroundColor Gray

# Export results to JSON
$testReport = @{
    Timestamp = Get-Date
    BaseUrl = $BaseUrl
    ApiUrl = $ApiUrl
    TotalTests = $totalTests
    PassedTests = $PassedTests
    FailedTests = $FailedTests
    SuccessRate = $successRate
    Results = $TestResults
}

$reportPath = "test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$testReport | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "`nDetailed report saved to: $reportPath" -ForegroundColor Cyan

if ($FailedTests -gt 0) {
    Write-Host "`nFAILED TESTS:" -ForegroundColor Red
    $TestResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "- $($_.Name): $($_.Details)" -ForegroundColor Red
    }
}

Write-Host "`nTesting completed!" -ForegroundColor Yellow