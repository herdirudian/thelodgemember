# The Lodge Family - Troubleshooting Guide

## Overview
This guide provides comprehensive troubleshooting procedures for The Lodge Family application in both development and production environments.

## Quick Reference

### Emergency Commands
```bash
# VPS Production Environment
./scripts/monitor-deployment.sh --status    # Quick health check
./scripts/analyze-logs.sh --detailed        # Analyze errors
./scripts/verify-ssl.sh --detailed          # Check SSL/HTTPS
./scripts/check-permissions.sh --fix        # Fix file permissions

# Windows Development Environment
.\scripts\Monitor-LocalDevelopment.ps1 -Status     # Quick health check
.\scripts\Analyze-Logs.ps1 -Detailed               # Analyze errors
.\scripts\Verify-SSL.ps1 -Detailed                 # Check SSL/HTTPS
.\scripts\Check-Permissions.ps1 -Fix               # Fix file permissions
```

## Common Issues and Solutions

### 1. Application Not Starting

#### Symptoms
- Application fails to start
- Port already in use errors
- Module not found errors

#### Diagnosis
```bash
# Check if ports are in use
netstat -tulpn | grep :3000  # Frontend
netstat -tulpn | grep :5001  # Backend

# Check Node.js processes
ps aux | grep node
```

#### Solutions
```bash
# Kill existing processes
pkill -f "node"
pkill -f "npm"

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Start with fresh environment
npm run dev
```

### 2. Database Connection Issues

#### Symptoms
- "Connection refused" errors
- "Access denied" errors
- Timeout errors

#### Diagnosis
```bash
# Check MySQL/MariaDB status
systemctl status mysql
systemctl status mariadb

# Test database connection
mysql -u username -p -h localhost database_name

# Check database logs
tail -f /var/log/mysql/error.log
```

#### Solutions
```bash
# Restart database service
sudo systemctl restart mysql

# Check database configuration
cat /etc/mysql/mysql.conf.d/mysqld.cnf

# Verify user permissions
mysql -u root -p
SHOW GRANTS FOR 'username'@'localhost';
```

### 3. SSL/HTTPS Issues

#### Symptoms
- SSL certificate errors
- "Not secure" warnings in browser
- HTTPS redirects not working

#### Diagnosis
```bash
# Use our SSL verification script
./scripts/verify-ssl.sh --detailed

# Check certificate manually
openssl s_client -connect family.thelodgegroup.id:443 -servername family.thelodgegroup.id

# Check Nginx SSL configuration
nginx -t
```

#### Solutions
```bash
# Renew Let's Encrypt certificate
certbot renew --dry-run
certbot renew

# Restart Nginx
sudo systemctl restart nginx

# Check certificate files
ls -la /etc/letsencrypt/live/family.thelodgegroup.id/
```

### 4. Performance Issues

#### Symptoms
- Slow page loading
- High CPU/memory usage
- Timeout errors

#### Diagnosis
```bash
# Use our monitoring script
./scripts/monitor-deployment.sh --watch

# Check system resources
htop
df -h
free -m

# Analyze application logs
./scripts/analyze-logs.sh --detailed
```

#### Solutions
```bash
# Restart PM2 processes
pm2 restart all

# Clear application cache
pm2 flush

# Optimize database
mysql -u root -p
OPTIMIZE TABLE table_name;

# Check for memory leaks
pm2 monit
```

### 5. File Permission Issues

#### Symptoms
- "Permission denied" errors
- Files not writable
- Upload failures

#### Diagnosis
```bash
# Use our permission checker
./scripts/check-permissions.sh

# Check specific file permissions
ls -la /path/to/file
```

#### Solutions
```bash
# Fix permissions automatically
./scripts/check-permissions.sh --fix

# Manual permission fixes
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo chmod -R 777 /var/www/html/storage
```

## Monitoring and Maintenance

### Daily Checks
```bash
# Run comprehensive health check
./scripts/monitor-deployment.sh --status

# Check for errors in logs
./scripts/analyze-logs.sh

# Verify SSL certificate status
./scripts/verify-ssl.sh
```

### Weekly Maintenance
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Clean up old logs
sudo journalctl --vacuum-time=7d

# Backup database
mysqldump -u root -p database_name > backup_$(date +%Y%m%d).sql

# Check disk space
df -h
```

### Monthly Tasks
```bash
# Renew SSL certificates
certbot renew

# Update Node.js dependencies
npm audit
npm update

# Review security logs
sudo grep "Failed password" /var/log/auth.log
```

## Log Locations

### Production (VPS)
```
Application Logs:
- PM2 Backend: ~/.pm2/logs/backend-out.log
- PM2 Frontend: ~/.pm2/logs/frontend-out.log
- PM2 Errors: ~/.pm2/logs/backend-error.log

System Logs:
- Nginx Access: /var/log/nginx/access.log
- Nginx Error: /var/log/nginx/error.log
- System: /var/log/syslog
- Auth: /var/log/auth.log

Database Logs:
- MySQL/MariaDB: /var/log/mysql/error.log
```

### Development (Windows)
```
Application Logs:
- Node.js console output
- Browser developer console
- Windows Event Viewer

Server Logs:
- Apache: C:\xampp\apache\logs\
- MySQL: C:\xampp\mysql\data\
```

## Emergency Procedures

### Complete Application Restart
```bash
# Stop all services
pm2 stop all
sudo systemctl stop nginx

# Start services in order
sudo systemctl start mysql
sudo systemctl start nginx
pm2 start ecosystem.config.js
```

### Database Recovery
```bash
# Stop application
pm2 stop all

# Backup current database
mysqldump -u root -p database_name > emergency_backup.sql

# Restore from backup
mysql -u root -p database_name < backup_file.sql

# Restart application
pm2 start all
```

### SSL Certificate Emergency Renewal
```bash
# Stop Nginx temporarily
sudo systemctl stop nginx

# Renew certificate
certbot renew --standalone

# Start Nginx
sudo systemctl start nginx
```

## Contact Information

### Support Escalation
1. **Level 1**: Check this troubleshooting guide
2. **Level 2**: Run diagnostic scripts and analyze reports
3. **Level 3**: Contact system administrator with diagnostic reports

### Important Files to Include in Support Requests
- Output from `./scripts/monitor-deployment.sh --status`
- Output from `./scripts/analyze-logs.sh --detailed`
- Recent entries from error logs
- Screenshot of error messages

## Script Reference

### Monitoring Scripts
- `monitor-deployment.sh`: Comprehensive VPS monitoring
- `Monitor-LocalDevelopment.ps1`: Windows development monitoring
- `analyze-logs.sh`: VPS log analysis
- `Analyze-Logs.ps1`: Windows log analysis

### Verification Scripts
- `verify-ssl.sh`: SSL/HTTPS verification for VPS
- `Verify-SSL.ps1`: SSL/HTTPS verification for Windows
- `check-permissions.sh`: File permission verification for VPS
- `Check-Permissions.ps1`: File permission verification for Windows

### Usage Examples
```bash
# Continuous monitoring (VPS)
./scripts/monitor-deployment.sh --watch --interval 30

# Quick status check (Windows)
.\scripts\Monitor-LocalDevelopment.ps1 -Status

# Detailed log analysis with export
./scripts/analyze-logs.sh --detailed --export

# SSL verification with recommendations
./scripts/verify-ssl.sh --detailed --recommendations
```

---

**Last Updated**: October 27, 2025
**Version**: 1.0
**Environment**: Production VPS + Windows Development