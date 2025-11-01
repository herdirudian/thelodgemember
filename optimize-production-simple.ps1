# Lodge Family Production Optimization Script
# Creates security and performance configuration files

param(
    [string]$VpsHost = "31.97.51.129",
    [string]$Domain = "family.thelodgegroup.id"
)

Write-Host "LODGE FAMILY - PRODUCTION OPTIMIZATION" -ForegroundColor Yellow
Write-Host "=======================================" -ForegroundColor Yellow
Write-Host "Target VPS: $VpsHost" -ForegroundColor Gray
Write-Host "Domain: $Domain" -ForegroundColor Gray
Write-Host "Started: $(Get-Date)" -ForegroundColor Gray

# Create Nginx Security Configuration
$nginxSecurityConfig = @"
# Security Headers Configuration
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Hide Nginx version
server_tokens off;

# Prevent access to hidden files
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
}

# Security for sensitive files
location ~* \.(env|log|ini|conf|bak|sql|sh)$ {
    deny all;
    access_log off;
    log_not_found off;
}
"@

# Create Rate Limiting Configuration
$rateLimitConfig = @"
# Rate Limiting Configuration
http {
    # Define rate limiting zones
    limit_req_zone `$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone `$binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone `$binary_remote_addr zone=general:10m rate=30r/s;
    
    # Connection limiting
    limit_conn_zone `$binary_remote_addr zone=conn_limit_per_ip:10m;
    limit_conn conn_limit_per_ip 20;
}

# Apply rate limits in server block
location /api/ {
    limit_req zone=api burst=20 nodelay;
    limit_req_status 429;
}

location /login {
    limit_req zone=login burst=3 nodelay;
    limit_req_status 429;
}

location / {
    limit_req zone=general burst=50 nodelay;
    limit_req_status 429;
}
"@

# Create SSL Optimization Configuration
$sslConfig = @"
# SSL/TLS Optimization
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# DH Parameters (generate with: openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048)
ssl_dhparam /etc/ssl/certs/dhparam.pem;
"@

# Write all configuration files
Write-Host "Creating configuration files..." -ForegroundColor Cyan

$nginxSecurityConfig | Out-File -FilePath "nginx-security-config.conf" -Encoding UTF8
$rateLimitConfig | Out-File -FilePath "nginx-rate-limit-config.conf" -Encoding UTF8
$sslConfig | Out-File -FilePath "ssl-optimization-config.conf" -Encoding UTF8

Write-Host "Optimization files created successfully!" -ForegroundColor Green
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "- nginx-security-config.conf" -ForegroundColor White
Write-Host "- nginx-rate-limit-config.conf" -ForegroundColor White  
Write-Host "- ssl-optimization-config.conf" -ForegroundColor White

Write-Host "Completed: $(Get-Date)" -ForegroundColor Gray