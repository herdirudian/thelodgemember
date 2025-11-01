# PRODUCTION OPTIMIZATION SCRIPT - LODGE FAMILY APPLICATION
# ===========================================================

param(
    [string]$VpsHost = "31.97.51.129",
    [string]$Domain = "family.thelodgegroup.id"
)

Write-Host "LODGE FAMILY - PRODUCTION OPTIMIZATION" -ForegroundColor Yellow
Write-Host "=======================================" -ForegroundColor Yellow
Write-Host "Target VPS: $VpsHost" -ForegroundColor Gray
Write-Host "Domain: $Domain" -ForegroundColor Gray
Write-Host "Started: $(Get-Date)" -ForegroundColor Gray

function Write-OptimizationHeader {
    param([string]$Title)
    Write-Host "`n" + "="*50 -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "="*50 -ForegroundColor Cyan
}

function Write-OptimizationStep {
    param([string]$Step, [string]$Status = "INFO")
    $Color = switch ($Status) {
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }
    Write-Host "[$Status] $Step" -ForegroundColor $Color
}

# 1. CREATE NGINX SECURITY CONFIGURATION
Write-OptimizationHeader "NGINX SECURITY CONFIGURATION"

$nginxSecurityConfig = @"
# Security Headers Configuration for Lodge Family
# Add this to your nginx server block

# Security Headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.xendit.co; frame-ancestors 'none';" always;

# Hide Nginx version
server_tokens off;

# Prevent access to hidden files
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
}

# Prevent access to backup files
location ~ ~$ {
    deny all;
    access_log off;
    log_not_found off;
}

# Rate limiting for API endpoints
location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade `$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host `$host;
    proxy_set_header X-Real-IP `$remote_addr;
    proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto `$scheme;
    proxy_cache_bypass `$http_upgrade;
}

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied expired no-cache no-store private must-revalidate auth;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/javascript
    application/xml+rss
    application/json
    image/svg+xml;

# Browser caching for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
}

# Security for uploads directory (if exists)
location /uploads/ {
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
}
"@

$nginxSecurityConfig | Out-File -FilePath "nginx-security-config.conf" -Encoding UTF8
Write-OptimizationStep "Created nginx-security-config.conf" "SUCCESS"

# 2. CREATE RATE LIMITING CONFIGURATION
Write-OptimizationHeader "RATE LIMITING CONFIGURATION"

$nginxRateLimitConfig = @"
# Rate Limiting Configuration
# Add this to your nginx http block (outside server block)

# Define rate limiting zones
limit_req_zone `$binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone `$binary_remote_addr zone=api:10m rate=5r/s;
limit_req_zone `$binary_remote_addr zone=auth:10m rate=2r/s;

# Connection limiting
limit_conn_zone `$binary_remote_addr zone=conn_limit_per_ip:10m;
limit_conn conn_limit_per_ip 20;

# Add these to your server block:
# General rate limiting
limit_req zone=general burst=50 nodelay;

# API rate limiting (add to location /api/)
# limit_req zone=api burst=20 nodelay;

# Auth rate limiting (add to location /api/auth/)
# limit_req zone=auth burst=5 nodelay;
"@

$nginxRateLimitConfig | Out-File -FilePath "nginx-rate-limit-config.conf" -Encoding UTF8
Write-OptimizationStep "Created nginx-rate-limit-config.conf" "SUCCESS"

# 3. CREATE SSL OPTIMIZATION CONFIGURATION
Write-OptimizationHeader "SSL OPTIMIZATION CONFIGURATION"

$sslOptimizationConfig = @"
# SSL Optimization Configuration
# Add this to your nginx server block

# SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
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
# ssl_dhparam /etc/ssl/certs/dhparam.pem;
"@

$sslOptimizationConfig | Out-File -FilePath "ssl-optimization-config.conf" -Encoding UTF8
Write-OptimizationStep "Created ssl-optimization-config.conf" "SUCCESS"

# 4. CREATE BACKEND SECURITY MIDDLEWARE
Write-OptimizationHeader "BACKEND SECURITY MIDDLEWARE"

$backendSecurityMiddleware = @"
// Security Middleware Enhancement for Lodge Family Backend
// Add this to your Express.js application

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// Enhanced Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.xendit.co"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 API requests per windowMs
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Speed limiter (progressive delay)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // allow 10 requests per windowMs without delay
  delayMs: 500 // add 500ms delay per request after delayAfter
});

// Apply rate limiting
app.use('/api', generalLimiter);
app.use('/api', speedLimiter);
app.use('/api/auth', authLimiter);

// Input validation middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with security info
app.use((req, res, next) => {
  const securityInfo = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    referer: req.get('Referer'),
    timestamp: new Date().toISOString()
  };
  
  // Log suspicious requests
  if (req.path.includes('..') || req.path.includes('<script>') || req.path.includes('SELECT')) {
    console.warn('Suspicious request detected:', securityInfo, req.path);
  }
  
  next();
});
"@

$backendSecurityMiddleware | Out-File -FilePath "backend-security-middleware.js" -Encoding UTF8
Write-OptimizationStep "Created backend-security-middleware.js" "SUCCESS"

# 5. CREATE PERFORMANCE OPTIMIZATION SCRIPT
Write-OptimizationHeader "PERFORMANCE OPTIMIZATION"

$performanceOptimization = @"
#!/bin/bash
# Performance Optimization Script for VPS
# Run this on your VPS to optimize performance

echo "Starting performance optimization..."

# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install performance monitoring tools
sudo apt install -y htop iotop nethogs

# 3. Optimize Node.js performance
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"

# 4. PM2 optimization
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# 5. System optimization
# Increase file descriptor limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 6. Nginx optimization
sudo nginx -t && sudo systemctl reload nginx

# 7. Database optimization (if using MySQL)
# sudo mysql_secure_installation

# 8. Enable swap if not exists (for low memory VPS)
if [ ! -f /swapfile ]; then
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 9. Clean up old logs and temporary files
sudo apt autoremove -y
sudo apt autoclean
find /tmp -type f -atime +7 -delete 2>/dev/null || true

echo "Performance optimization completed!"
"@

$performanceOptimization | Out-File -FilePath "optimize-vps-performance.sh" -Encoding UTF8
Write-OptimizationStep "Created optimize-vps-performance.sh" "SUCCESS"

# 6. CREATE SECURITY AUDIT SCRIPT
Write-OptimizationHeader "SECURITY AUDIT SCRIPT"

$securityAuditScript = @"
#!/bin/bash
# Security Audit Script for Lodge Family VPS

echo "Starting security audit..."

# 1. Check for security updates
echo "Checking for security updates..."
sudo apt list --upgradable | grep -i security

# 2. Check open ports
echo "Checking open ports..."
sudo netstat -tulpn | grep LISTEN

# 3. Check running services
echo "Checking running services..."
sudo systemctl list-units --type=service --state=running

# 4. Check failed login attempts
echo "Checking failed login attempts..."
sudo grep "Failed password" /var/log/auth.log | tail -10

# 5. Check disk usage
echo "Checking disk usage..."
df -h

# 6. Check memory usage
echo "Checking memory usage..."
free -h

# 7. Check SSL certificate expiry
echo "Checking SSL certificate expiry..."
echo | openssl s_client -servername $Domain -connect $Domain:443 2>/dev/null | openssl x509 -noout -dates

# 8. Check Nginx configuration
echo "Checking Nginx configuration..."
sudo nginx -t

# 9. Check PM2 processes
echo "Checking PM2 processes..."
pm2 status

# 10. Check log files for errors
echo "Checking recent errors in logs..."
sudo tail -20 /var/log/nginx/error.log
pm2 logs --lines 10

echo "Security audit completed!"
"@

$securityAuditScript | Out-File -FilePath "security-audit.sh" -Encoding UTF8
Write-OptimizationStep "Created security-audit.sh" "SUCCESS"

# 7. CREATE DEPLOYMENT INSTRUCTIONS
Write-OptimizationHeader "DEPLOYMENT INSTRUCTIONS"

$deploymentInstructions = @"
# PRODUCTION OPTIMIZATION DEPLOYMENT GUIDE
# ========================================

## 1. Upload Configuration Files to VPS

Upload the following files to your VPS:
- nginx-security-config.conf
- nginx-rate-limit-config.conf  
- ssl-optimization-config.conf
- optimize-vps-performance.sh
- security-audit.sh

Command to upload:
scp *.conf *.sh root@`$VpsHost:/tmp/

## 2. Apply Nginx Configurations

SSH to your VPS and run:

```bash
ssh root@`$VpsHost

# Backup current nginx config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Add rate limiting to nginx.conf (http block)
sudo cat /tmp/nginx-rate-limit-config.conf >> /etc/nginx/nginx.conf

# Add security and SSL configs to your site config
sudo nano /etc/nginx/sites-available/default

# Test nginx configuration
sudo nginx -t

# Reload nginx if test passes
sudo systemctl reload nginx
```

## 3. Run Performance Optimization

```bash
chmod +x /tmp/optimize-vps-performance.sh
sudo /tmp/optimize-vps-performance.sh
```

## 4. Update Backend Security (Optional)

If you want to enhance backend security middleware:
1. Review backend-security-middleware.js
2. Integrate the security enhancements into your backend code
3. Redeploy the backend

## 5. Run Security Audit

```bash
chmod +x /tmp/security-audit.sh
/tmp/security-audit.sh
```

## 6. Set Up Automated Security Checks

Add to crontab for daily security checks:
```bash
crontab -e

# Add this line for daily security audit at 2 AM
0 2 * * * /path/to/security-audit.sh >> /var/log/security-audit.log 2>&1
```

## 7. Monitor and Verify

After applying optimizations:
1. Run the comprehensive test again: .\comprehensive-test-fixed.ps1
2. Check website performance with tools like GTmetrix or PageSpeed Insights
3. Monitor server resources with htop
4. Check security headers with securityheaders.com

## 8. Backup Configuration

Always backup your configurations:
```bash
sudo tar -czf nginx-config-backup-$(date +%Y%m%d).tar.gz /etc/nginx/
```

## Expected Improvements

After applying these optimizations, you should see:
- ✅ All security headers properly configured
- ✅ Better performance scores
- ✅ Rate limiting protection against abuse
- ✅ Enhanced SSL/TLS security
- ✅ Better server resource utilization
- ✅ Automated monitoring and alerts

## Troubleshooting

If you encounter issues:
1. Check nginx error logs: sudo tail -f /var/log/nginx/error.log
2. Test nginx config: sudo nginx -t
3. Check PM2 logs: pm2 logs
4. Verify SSL: openssl s_client -connect $Domain:443
5. Test rate limiting: Use curl or browser dev tools

For support, review the logs and configuration files created by this script.
"@

$deploymentInstructions | Out-File -FilePath "OPTIMIZATION_DEPLOYMENT_GUIDE.md" -Encoding UTF8
Write-OptimizationStep "Created OPTIMIZATION_DEPLOYMENT_GUIDE.md" "SUCCESS"

# 8. CREATE MONITORING DASHBOARD ENHANCEMENT
Write-OptimizationHeader "MONITORING DASHBOARD ENHANCEMENT"

$monitoringEnhancement = @"
# Enhanced Monitoring Configuration
# Add these to your monitoring setup

# 1. Security Monitoring Alerts
SECURITY_ALERTS = {
    "failed_logins": {
        "threshold": 10,
        "timeframe": "5m",
        "action": "email_alert"
    },
    "high_error_rate": {
        "threshold": "5%",
        "timeframe": "1m", 
        "action": "slack_notification"
    },
    "ssl_expiry": {
        "threshold": "30d",
        "action": "email_alert"
    }
}

# 2. Performance Monitoring Thresholds
PERFORMANCE_THRESHOLDS = {
    "response_time": "2s",
    "cpu_usage": "80%",
    "memory_usage": "85%",
    "disk_usage": "90%",
    "error_rate": "1%"
}

# 3. Uptime Monitoring URLs
MONITORING_URLS = [
    "https://$Domain/",
    "https://$Domain/api",
    "https://$Domain/login",
    "https://$Domain/register"
]

# 4. Log Monitoring Patterns
LOG_PATTERNS = {
    "error": ["ERROR", "FATAL", "Exception"],
    "security": ["Failed password", "Invalid token", "Unauthorized"],
    "performance": ["timeout", "slow query", "high memory"]
}
"@

$monitoringEnhancement | Out-File -FilePath "monitoring-enhancement-config.yaml" -Encoding UTF8
Write-OptimizationStep "Created monitoring-enhancement-config.yaml" "SUCCESS"

# FINAL SUMMARY
Write-OptimizationHeader "OPTIMIZATION SUMMARY"

Write-Host "✅ Created 8 optimization files:" -ForegroundColor Green
Write-Host "   1. nginx-security-config.conf - Security headers and protection" -ForegroundColor White
Write-Host "   2. nginx-rate-limit-config.conf - Rate limiting configuration" -ForegroundColor White
Write-Host "   3. ssl-optimization-config.conf - SSL/TLS optimization" -ForegroundColor White
Write-Host "   4. backend-security-middleware.js - Enhanced backend security" -ForegroundColor White
Write-Host "   5. optimize-vps-performance.sh - VPS performance optimization" -ForegroundColor White
Write-Host "   6. security-audit.sh - Security audit script" -ForegroundColor White
Write-Host "   7. OPTIMIZATION_DEPLOYMENT_GUIDE.md - Complete deployment guide" -ForegroundColor White
Write-Host "   8. monitoring-enhancement-config.yaml - Enhanced monitoring config" -ForegroundColor White

Write-Host "`n🎯 Expected Improvements:" -ForegroundColor Cyan
Write-Host "   • Security score: 62% → 95%+" -ForegroundColor Green
Write-Host "   • Performance: Good → Excellent" -ForegroundColor Green
Write-Host "   • Security headers: 0/4 → 4/4" -ForegroundColor Green
Write-Host "   • Rate limiting: None → Comprehensive" -ForegroundColor Green
Write-Host "   • SSL security: Basic → Advanced" -ForegroundColor Green

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Review OPTIMIZATION_DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host "   2. Upload files to VPS and apply configurations" -ForegroundColor White
Write-Host "   3. Run comprehensive test again to verify improvements" -ForegroundColor White
Write-Host "   4. Set up automated monitoring and alerts" -ForegroundColor White

Write-Host "`n⚠️  Important Notes:" -ForegroundColor Red
Write-Host "   • Always backup configurations before applying changes" -ForegroundColor White
Write-Host "   • Test configurations in staging environment first" -ForegroundColor White
Write-Host "   • Monitor server resources after applying optimizations" -ForegroundColor White
Write-Host "   • Keep security configurations updated regularly" -ForegroundColor White

Write-Host "`nOptimization files created successfully!" -ForegroundColor Green
Write-Host "Completed: $(Get-Date)" -ForegroundColor Gray