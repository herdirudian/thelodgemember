# The Lodge Family - SSL/HTTPS Verification Script (Windows)
# This script verifies SSL certificate configuration and HTTPS setup

param(
    [string]$Domain = "family.thelodgegroup.id",
    [string]$Port = "443",
    [string]$OutputFile = "ssl-verification-report.txt",
    [switch]$Detailed,
    [switch]$Help
)

# Function to show usage
function Show-Usage {
    Write-Host "Usage: .\Verify-SSL.ps1 [OPTIONS]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Domain           Domain to check (default: $Domain)"
    Write-Host "  -Port             Port to check (default: $Port)"
    Write-Host "  -OutputFile       Output file (default: $OutputFile)"
    Write-Host "  -Detailed         Show detailed certificate information"
    Write-Host "  -Help             Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\Verify-SSL.ps1                           Check default domain"
    Write-Host "  .\Verify-SSL.ps1 -Domain 'example.com'     Check specific domain"
    Write-Host "  .\Verify-SSL.ps1 -Detailed                 Show detailed info"
}

# Show help if requested
if ($Help) {
    Show-Usage
    exit 0
}

# Function to write colored output
function Write-Header {
    param([string]$Message)
    Write-Host "[SSL] $Message" -ForegroundColor Cyan
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Fix {
    param([string]$Message)
    Write-Host "[FIX] $Message" -ForegroundColor Magenta
}

# Function to create SSL report header
function New-SSLReportHeader {
    $reportContent = @"
The Lodge Family - SSL/HTTPS Verification Report
===============================================
Generated: $(Get-Date)
Computer: $env:COMPUTERNAME
Domain: $Domain
Port: $Port
Detailed Mode: $Detailed

"@
    $reportContent | Out-File -FilePath $OutputFile -Encoding UTF8
}

# Function to append to report
function Add-ToSSLReport {
    param([string]$Content)
    $Content | Out-File -FilePath $OutputFile -Append -Encoding UTF8
}

# Function to test SSL connection
function Test-SSLConnection {
    Write-Header "Testing SSL connection to $Domain`:$Port..."
    
    Add-ToSSLReport "SSL Connection Test"
    Add-ToSSLReport "=================="
    Add-ToSSLReport ""
    
    try {
        # Create TCP client
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.ReceiveTimeout = 10000
        $tcpClient.SendTimeout = 10000
        
        # Connect to the server
        $connectTask = $tcpClient.ConnectAsync($Domain, $Port)
        $connectResult = $connectTask.Wait(10000)
        
        if (-not $connectResult -or -not $tcpClient.Connected) {
            Write-Error "Cannot connect to $Domain`:$Port"
            Add-ToSSLReport "[FAIL] Cannot connect to $Domain`:$Port"
            return $false
        }
        
        Write-Success "Successfully connected to $Domain`:$Port"
        Add-ToSSLReport "[OK] Successfully connected to $Domain`:$Port"
        
        # Create SSL stream
        $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream())
        
        try {
            # Authenticate as client
            $sslStream.AuthenticateAsClient($Domain)
            
            Write-Success "SSL handshake completed successfully"
            Add-ToSSLReport "[OK] SSL handshake completed successfully"
            
            # Get certificate information
            $cert = $sslStream.RemoteCertificate
            if ($cert) {
                $x509cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($cert)
                
                Write-Success "SSL certificate retrieved successfully"
                Add-ToSSLReport "[OK] SSL certificate retrieved successfully"
                Add-ToSSLReport "  Subject: $($x509cert.Subject)"
                Add-ToSSLReport "  Issuer: $($x509cert.Issuer)"
                Add-ToSSLReport "  Valid From: $($x509cert.NotBefore)"
                Add-ToSSLReport "  Valid To: $($x509cert.NotAfter)"
                Add-ToSSLReport "  Thumbprint: $($x509cert.Thumbprint)"
                
                return $x509cert
            }
            else {
                Write-Error "No SSL certificate found"
                Add-ToSSLReport "[FAIL] No SSL certificate found"
                return $false
            }
        }
        catch {
            Write-Error "SSL handshake failed: $($_.Exception.Message)"
            Add-ToSSLReport "[FAIL] SSL handshake failed: $($_.Exception.Message)"
            return $false
        }
        finally {
            $sslStream.Close()
        }
    }
    catch {
        Write-Error "SSL connection test failed: $($_.Exception.Message)"
        Add-ToSSLReport "[FAIL] SSL connection test failed: $($_.Exception.Message)"
        return $false
    }
    finally {
        if ($tcpClient) {
            $tcpClient.Close()
        }
    }
    
    Add-ToSSLReport ""
}

# Function to verify certificate validity
function Test-CertificateValidity {
    param([System.Security.Cryptography.X509Certificates.X509Certificate2]$Certificate)
    
    if (-not $Certificate) {
        return $false
    }
    
    Write-Header "Verifying certificate validity..."
    
    Add-ToSSLReport "Certificate Validity Check"
    Add-ToSSLReport "========================="
    Add-ToSSLReport ""
    
    $issues = 0
    $now = Get-Date
    
    # Check if certificate is expired
    if ($Certificate.NotAfter -lt $now) {
        Write-Error "Certificate has expired on $($Certificate.NotAfter)"
        Add-ToSSLReport "[FAIL] Certificate expired on $($Certificate.NotAfter)"
        $issues++
    }
    elseif ($Certificate.NotAfter -lt $now.AddDays(30)) {
        Write-Warning "Certificate expires soon on $($Certificate.NotAfter)"
        Add-ToSSLReport "[WARN] Certificate expires in less than 30 days: $($Certificate.NotAfter)"
        $issues++
    }
    else {
        Write-Success "Certificate is valid until $($Certificate.NotAfter)"
        Add-ToSSLReport "[OK] Certificate is valid until $($Certificate.NotAfter)"
    }
    
    # Check if certificate is not yet valid
    if ($Certificate.NotBefore -gt $now) {
        Write-Error "Certificate is not yet valid (valid from $($Certificate.NotBefore))"
        Add-ToSSLReport "[FAIL] Certificate not yet valid (valid from $($Certificate.NotBefore))"
        $issues++
    }
    else {
        Write-Success "Certificate became valid on $($Certificate.NotBefore)"
        Add-ToSSLReport "[OK] Certificate became valid on $($Certificate.NotBefore)"
    }
    
    # Check certificate chain
    try {
        $chain = New-Object System.Security.Cryptography.X509Certificates.X509Chain
        $chainResult = $chain.Build($Certificate)
        
        if ($chainResult) {
            Write-Success "Certificate chain is valid"
            Add-ToSSLReport "[OK] Certificate chain is valid"
            
            if ($Detailed) {
                Add-ToSSLReport "  Chain Elements:"
                foreach ($element in $chain.ChainElements) {
                    Add-ToSSLReport "    - $($element.Certificate.Subject)"
                }
            }
        }
        else {
            Write-Warning "Certificate chain validation failed"
            Add-ToSSLReport "[WARN] Certificate chain validation failed"
            
            if ($chain.ChainStatus) {
                foreach ($status in $chain.ChainStatus) {
                    Add-ToSSLReport "    Chain Status: $($status.Status) - $($status.StatusInformation)"
                }
            }
            $issues++
        }
    }
    catch {
        Write-Error "Certificate chain check failed: $($_.Exception.Message)"
        Add-ToSSLReport "[FAIL] Certificate chain check failed: $($_.Exception.Message)"
        $issues++
    }
    
    Add-ToSSLReport ""
    return $issues -eq 0
}

# Function to check domain name matching
function Test-DomainNameMatching {
    param([System.Security.Cryptography.X509Certificates.X509Certificate2]$Certificate)
    
    if (-not $Certificate) {
        return $false
    }
    
    Write-Header "Checking domain name matching..."
    
    Add-ToSSLReport "Domain Name Matching Check"
    Add-ToSSLReport "========================="
    Add-ToSSLReport ""
    
    # Get subject alternative names
    $sanExtension = $Certificate.Extensions | Where-Object { $_.Oid.FriendlyName -eq "Subject Alternative Name" }
    $subjectName = $Certificate.Subject
    
    Add-ToSSLReport "Certificate Subject: $subjectName"
    
    $domainMatches = $false
    
    # Check subject common name
    if ($subjectName -match "CN=([^,]+)") {
        $commonName = $matches[1]
        Add-ToSSLReport "Common Name: $commonName"
        
        if ($commonName -eq $Domain -or $commonName -eq "*.$($Domain.Split('.')[1..($Domain.Split('.').Length-1)] -join '.')") {
            $domainMatches = $true
            Write-Success "Domain matches certificate common name"
            Add-ToSSLReport "[OK] Domain matches certificate common name"
        }
    }
    
    # Check subject alternative names
    if ($sanExtension) {
        $sanNames = @()
        try {
            # Parse SAN extension (simplified)
            $sanData = $sanExtension.Format($true)
            $sanNames = $sanData -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -match "DNS Name=" } | ForEach-Object { $_ -replace "DNS Name=", "" }
            
            Add-ToSSLReport "Subject Alternative Names:"
            foreach ($sanName in $sanNames) {
                Add-ToSSLReport "  - $sanName"
                
                if ($sanName -eq $Domain -or ($sanName.StartsWith("*.") -and $Domain.EndsWith($sanName.Substring(1)))) {
                    $domainMatches = $true
                }
            }
        }
        catch {
            Add-ToSSLReport "[WARN] Could not parse Subject Alternative Names"
        }
    }
    
    if ($domainMatches) {
        Write-Success "Domain $Domain matches certificate"
        Add-ToSSLReport "[OK] Domain $Domain matches certificate"
    }
    else {
        Write-Error "Domain $Domain does not match certificate"
        Add-ToSSLReport "[FAIL] Domain $Domain does not match certificate"
    }
    
    Add-ToSSLReport ""
    return $domainMatches
}

# Function to test HTTPS connectivity
function Test-HTTPSConnectivity {
    Write-Header "Testing HTTPS connectivity..."
    
    Add-ToSSLReport "HTTPS Connectivity Test"
    Add-ToSSLReport "======================"
    Add-ToSSLReport ""
    
    $testUrls = @(
        "https://$Domain",
        "https://$Domain/api/health",
        "https://$Domain/dashboard"
    )
    
    $successCount = 0
    
    foreach ($url in $testUrls) {
        try {
            Write-Info "Testing: $url"
            
            # Create web request with SSL validation
            $request = [System.Net.WebRequest]::Create($url)
            $request.Timeout = 10000
            $request.Method = "GET"
            
            # Get response
            $response = $request.GetResponse()
            $statusCode = $response.StatusCode
            
            if ($statusCode -eq "OK" -or $statusCode -eq "Found" -or $statusCode -eq "MovedPermanently") {
                Write-Success "HTTPS request successful: $url (Status: $statusCode)"
                Add-ToSSLReport "[OK] HTTPS request successful: $url (Status: $statusCode)"
                $successCount++
            }
            else {
                Write-Warning "HTTPS request returned: $url (Status: $statusCode)"
                Add-ToSSLReport "[WARN] HTTPS request returned: $url (Status: $statusCode)"
            }
            
            $response.Close()
        }
        catch [System.Net.WebException] {
            $webException = $_.Exception
            if ($webException.Response) {
                $statusCode = $webException.Response.StatusCode
                Write-Warning "HTTPS request failed: $url (Status: $statusCode)"
                Add-ToSSLReport "[WARN] HTTPS request failed: $url (Status: $statusCode)"
            }
            else {
                Write-Error "HTTPS request failed: $url (Error: $($webException.Message))"
                Add-ToSSLReport "[FAIL] HTTPS request failed: $url (Error: $($webException.Message))"
            }
        }
        catch {
            Write-Error "HTTPS request failed: $url (Error: $($_.Exception.Message))"
            Add-ToSSLReport "[FAIL] HTTPS request failed: $url (Error: $($_.Exception.Message))"
        }
    }
    
    Add-ToSSLReport ""
    Add-ToSSLReport "HTTPS Connectivity Summary: $successCount/$($testUrls.Count) successful"
    
    return $successCount -gt 0
}

# Function to check SSL/TLS protocols
function Test-SSLProtocols {
    Write-Header "Checking supported SSL/TLS protocols..."
    
    Add-ToSSLReport "SSL/TLS Protocol Support Check"
    Add-ToSSLReport "============================="
    Add-ToSSLReport ""
    
    $protocols = @(
        @{Name = "TLS 1.3"; Value = [System.Security.Authentication.SslProtocols]::Tls13},
        @{Name = "TLS 1.2"; Value = [System.Security.Authentication.SslProtocols]::Tls12},
        @{Name = "TLS 1.1"; Value = [System.Security.Authentication.SslProtocols]::Tls11},
        @{Name = "TLS 1.0"; Value = [System.Security.Authentication.SslProtocols]::Tls}
    )
    
    $supportedProtocols = @()
    
    foreach ($protocol in $protocols) {
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $tcpClient.ReceiveTimeout = 5000
            $tcpClient.SendTimeout = 5000
            
            $connectTask = $tcpClient.ConnectAsync($Domain, $Port)
            $connectResult = $connectTask.Wait(5000)
            
            if ($connectResult -and $tcpClient.Connected) {
                $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream())
                
                try {
                    $sslStream.AuthenticateAsClient($Domain, $null, $protocol.Value, $false)
                    Write-Success "$($protocol.Name) is supported"
                    Add-ToSSLReport "[OK] $($protocol.Name) is supported"
                    $supportedProtocols += $protocol.Name
                }
                catch {
                    Write-Info "$($protocol.Name) is not supported"
                    Add-ToSSLReport "[INFO] $($protocol.Name) is not supported"
                }
                finally {
                    $sslStream.Close()
                }
            }
            
            $tcpClient.Close()
        }
        catch {
            Write-Info "$($protocol.Name) test failed"
            Add-ToSSLReport "[INFO] $($protocol.Name) test failed"
        }
    }
    
    if ($supportedProtocols.Count -eq 0) {
        Write-Error "No SSL/TLS protocols are supported"
        Add-ToSSLReport "[FAIL] No SSL/TLS protocols are supported"
        return $false
    }
    
    # Check for security recommendations
    if ($supportedProtocols -contains "TLS 1.0" -or $supportedProtocols -contains "TLS 1.1") {
        Write-Warning "Insecure protocols (TLS 1.0/1.1) are supported"
        Add-ToSSLReport "[WARN] Insecure protocols (TLS 1.0/1.1) are supported"
    }
    
    if ($supportedProtocols -contains "TLS 1.2" -or $supportedProtocols -contains "TLS 1.3") {
        Write-Success "Secure protocols (TLS 1.2/1.3) are supported"
        Add-ToSSLReport "[OK] Secure protocols (TLS 1.2/1.3) are supported"
    }
    
    Add-ToSSLReport ""
    return $true
}

# Function to generate SSL recommendations
function New-SSLRecommendations {
    Write-Header "Generating SSL recommendations..."
    
    Add-ToSSLReport "SSL/HTTPS Recommendations"
    Add-ToSSLReport "========================"
    Add-ToSSLReport ""
    
    # Read the SSL report to generate recommendations
    if (Test-Path $OutputFile) {
        $reportContent = Get-Content $OutputFile -Raw
        
        # Check for common issues and provide recommendations
        if ($reportContent -match "FAIL|expired|not yet valid") {
            Add-ToSSLReport "[FIX] Certificate Issues Detected:"
            Add-ToSSLReport "   - Renew SSL certificate if expired or expiring soon"
            Add-ToSSLReport "   - Verify certificate installation on server"
            Add-ToSSLReport "   - Check certificate chain completeness"
            Add-ToSSLReport "   - Ensure certificate matches domain name"
            Add-ToSSLReport ""
        }
        
        if ($reportContent -match "chain validation failed") {
            Add-ToSSLReport "[FIX] Certificate Chain Issues:"
            Add-ToSSLReport "   - Install intermediate certificates"
            Add-ToSSLReport "   - Verify certificate authority trust"
            Add-ToSSLReport "   - Check certificate order in chain"
            Add-ToSSLReport ""
        }
        
        if ($reportContent -match "does not match certificate") {
            Add-ToSSLReport "[FIX] Domain Mismatch Issues:"
            Add-ToSSLReport "   - Obtain certificate for correct domain"
            Add-ToSSLReport "   - Add domain to Subject Alternative Names"
            Add-ToSSLReport "   - Use wildcard certificate if appropriate"
            Add-ToSSLReport ""
        }
        
        if ($reportContent -match "HTTPS request failed") {
            Add-ToSSLReport "[FIX] HTTPS Connectivity Issues:"
            Add-ToSSLReport "   - Check web server SSL configuration"
            Add-ToSSLReport "   - Verify firewall allows HTTPS traffic (port 443)"
            Add-ToSSLReport "   - Check DNS resolution for domain"
            Add-ToSSLReport "   - Verify SSL certificate is properly installed"
            Add-ToSSLReport ""
        }
        
        if ($reportContent -match "TLS 1.0|TLS 1.1.*supported") {
            Add-ToSSLReport "[FIX] Protocol Security Issues:"
            Add-ToSSLReport "   - Disable TLS 1.0 and TLS 1.1 protocols"
            Add-ToSSLReport "   - Enable only TLS 1.2 and TLS 1.3"
            Add-ToSSLReport "   - Update server SSL configuration"
            Add-ToSSLReport ""
        }
        
        # General recommendations
        Add-ToSSLReport "[INFO] General SSL/HTTPS Best Practices:"
        Add-ToSSLReport "   - Use strong cipher suites"
        Add-ToSSLReport "   - Enable HTTP Strict Transport Security (HSTS)"
        Add-ToSSLReport "   - Implement certificate pinning for mobile apps"
        Add-ToSSLReport "   - Monitor certificate expiration dates"
        Add-ToSSLReport "   - Use automated certificate renewal (Let's Encrypt)"
        Add-ToSSLReport "   - Regular SSL configuration testing"
        Add-ToSSLReport "   - Implement proper error handling for SSL failures"
        Add-ToSSLReport ""
    }
}

# Function to show SSL summary
function Show-SSLSummary {
    Write-Header "SSL/HTTPS Verification Summary"
    
    if (Test-Path $OutputFile) {
        # Count total issues found
        $reportContent = Get-Content $OutputFile -Raw
        $totalErrors = ([regex]::Matches($reportContent, "\[FAIL\]")).Count
        $totalWarnings = ([regex]::Matches($reportContent, "\[WARN\]")).Count
        $totalSuccess = ([regex]::Matches($reportContent, "\[OK\]")).Count
        
        Write-Host ""
        Write-Info "SSL verification completed. Report saved to: $OutputFile"
        
        if ($totalErrors -gt 0) {
            Write-Error "Found $totalErrors critical SSL issues"
        }
        
        if ($totalWarnings -gt 0) {
            Write-Warning "Found $totalWarnings SSL warnings"
        }
        
        if ($totalSuccess -gt 0) {
            Write-Success "Found $totalSuccess SSL checks passed"
        }
        
        if ($totalErrors -eq 0 -and $totalWarnings -eq 0) {
            Write-Success "SSL/HTTPS configuration appears to be correct"
        }
        else {
            Write-Info "Review the report for detailed recommendations"
        }
        
        Write-Host ""
        Write-Info "To view the full report: Get-Content '$OutputFile'"
        Write-Info "For online SSL testing: https://www.ssllabs.com/ssltest/"
    }
    else {
        Write-Error "SSL verification report could not be generated"
    }
}

# Main execution
function Main {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "The Lodge Family - SSL/HTTPS Verification" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Verifying SSL certificate and HTTPS configuration..." -ForegroundColor White
    Write-Host ""
    
    Write-Info "Target: $Domain`:$Port"
    if ($Detailed) {
        Write-Info "Detailed mode enabled"
    }
    Write-Host ""
    
    # Create SSL report
    New-SSLReportHeader
    
    # Run SSL verification tests
    $sslIssues = 0
    
    # Test SSL connection and get certificate
    $certificate = Test-SSLConnection
    if (-not $certificate) {
        $sslIssues++
    }
    
    # Verify certificate validity
    if ($certificate) {
        if (-not (Test-CertificateValidity $certificate)) {
            $sslIssues++
        }
        
        # Check domain name matching
        if (-not (Test-DomainNameMatching $certificate)) {
            $sslIssues++
        }
    }
    
    # Test HTTPS connectivity
    if (-not (Test-HTTPSConnectivity)) {
        $sslIssues++
    }
    
    # Check SSL/TLS protocols
    if (-not (Test-SSLProtocols)) {
        $sslIssues++
    }
    
    # Generate recommendations
    New-SSLRecommendations
    
    # Show summary
    Show-SSLSummary
    
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Exit with appropriate code
    if ($sslIssues -gt 0) {
        exit 1
    }
    else {
        exit 0
    }
}

# Run main function
try {
    Main
}
catch {
    Write-Error "Script execution failed: $($_.Exception.Message)"
    exit 1
}