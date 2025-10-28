# Deployment Troubleshooting Checklist

## Pre-Deployment Verification

### ✅ Environment Check
- [ ] VPS server accessible via SSH
- [ ] Domain DNS pointing to correct IP
- [ ] Required ports open (80, 443, 22)
- [ ] Sufficient disk space (minimum 2GB free)
- [ ] Node.js and npm installed
- [ ] PM2 installed globally
- [ ] Nginx installed and configured
- [ ] MySQL/MariaDB running

### ✅ File Transfer Verification
- [ ] All files uploaded successfully
- [ ] File permissions set correctly
- [ ] Environment files (.env) configured
- [ ] SSL certificates in place
- [ ] Nginx configuration files updated

## Common Deployment Issues

### 1. File Upload/Transfer Issues

#### Problem: Files not uploading or incomplete transfer
```bash
# Check file integrity
find /var/www/html -name "*.js" -size 0  # Find empty JS files
find /var/www/html -name "*.json" -size 0  # Find empty JSON files

# Verify file count
ls -la /var/www/html/frontend/ | wc -l
ls -la /var/www/html/backend/ | wc -l
```

#### Solution:
```bash
# Re-upload specific files
scp -r ./frontend/ user@server:/var/www/html/
scp -r ./backend/ user@server:/var/www/html/

# Fix permissions after upload
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### 2. Environment Configuration Issues

#### Problem: Environment variables not loaded
```bash
# Check .env files exist
ls -la /var/www/html/backend/.env
ls -la /var/www/html/frontend/.env

# Verify environment variables
cat /var/www/html/backend/.env | grep -v "^#" | grep -v "^$"
```

#### Solution:
```bash
# Create missing .env files
cp .env.example .env
nano .env  # Edit with correct values

# Restart application to load new environment
pm2 restart all
```

### 3. Database Connection Issues

#### Problem: Cannot connect to database
```bash
# Test database connection
mysql -u username -p -h localhost database_name

# Check if database exists
mysql -u root -p -e "SHOW DATABASES;"

# Verify user permissions
mysql -u root -p -e "SHOW GRANTS FOR 'username'@'localhost';"
```

#### Solution:
```bash
# Create database if missing
mysql -u root -p -e "CREATE DATABASE database_name;"

# Create user and grant permissions
mysql -u root -p -e "CREATE USER 'username'@'localhost' IDENTIFIED BY 'password';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON database_name.* TO 'username'@'localhost';"
mysql -u root -p -e "FLUSH PRIVILEGES;"

# Import database schema
mysql -u username -p database_name < database_schema.sql
```

### 4. Node.js Dependencies Issues

#### Problem: npm install fails or modules missing
```bash
# Check Node.js version
node --version
npm --version

# Check for package.json
ls -la /var/www/html/backend/package.json
ls -la /var/www/html/frontend/package.json
```

#### Solution:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Install specific missing packages
npm install package-name

# Check for global packages
npm list -g --depth=0
```

### 5. PM2 Process Issues

#### Problem: PM2 processes not starting
```bash
# Check PM2 status
pm2 status
pm2 logs

# Check ecosystem.config.js
cat /var/www/html/ecosystem.config.js
```

#### Solution:
```bash
# Stop all PM2 processes
pm2 stop all
pm2 delete all

# Start with ecosystem config
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### 6. Nginx Configuration Issues

#### Problem: Nginx not serving application
```bash
# Test Nginx configuration
nginx -t

# Check Nginx status
systemctl status nginx

# Check Nginx error logs
tail -f /var/log/nginx/error.log
```

#### Solution:
```bash
# Fix configuration syntax
nano /etc/nginx/sites-available/family.thelodgegroup.id

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Restart if needed
systemctl restart nginx
```

### 7. SSL Certificate Issues

#### Problem: SSL not working or certificate errors
```bash
# Check certificate files
ls -la /etc/letsencrypt/live/family.thelodgegroup.id/

# Test SSL connection
openssl s_client -connect family.thelodgegroup.id:443 -servername family.thelodgegroup.id
```

#### Solution:
```bash
# Install/renew certificate
certbot --nginx -d family.thelodgegroup.id

# Manual certificate installation
certbot certonly --standalone -d family.thelodgegroup.id

# Update Nginx configuration
nano /etc/nginx/sites-available/family.thelodgegroup.id
systemctl reload nginx
```

## Deployment Verification Steps

### 1. Service Status Check
```bash
# Check all required services
systemctl status nginx
systemctl status mysql
pm2 status

# Check listening ports
netstat -tulpn | grep :80
netstat -tulpn | grep :443
netstat -tulpn | grep :3000
netstat -tulpn | grep :5001
```

### 2. Application Health Check
```bash
# Test frontend
curl -I http://family.thelodgegroup.id
curl -I https://family.thelodgegroup.id

# Test backend API
curl -I http://family.thelodgegroup.id/api/health
curl -I https://family.thelodgegroup.id/api/health

# Test specific endpoints
curl -X GET https://family.thelodgegroup.id/api/auth/check
```

### 3. Log Verification
```bash
# Check for errors in logs
tail -n 50 ~/.pm2/logs/backend-error.log
tail -n 50 ~/.pm2/logs/frontend-error.log
tail -n 50 /var/log/nginx/error.log

# Check access logs
tail -n 20 /var/log/nginx/access.log
```

## Rollback Procedures

### 1. Quick Rollback
```bash
# Stop current deployment
pm2 stop all

# Restore from backup
cp -r /backup/previous-deployment/* /var/www/html/

# Restart services
pm2 start ecosystem.config.js
systemctl reload nginx
```

### 2. Database Rollback
```bash
# Backup current database
mysqldump -u root -p database_name > current_backup.sql

# Restore previous database
mysql -u root -p database_name < previous_backup.sql
```

### 3. Configuration Rollback
```bash
# Restore Nginx configuration
cp /backup/nginx-config /etc/nginx/sites-available/family.thelodgegroup.id
nginx -t
systemctl reload nginx

# Restore environment files
cp /backup/.env.backend /var/www/html/backend/.env
cp /backup/.env.frontend /var/www/html/frontend/.env
pm2 restart all
```

## Post-Deployment Monitoring

### Immediate Checks (First 10 minutes)
- [ ] Application loads in browser
- [ ] Login functionality works
- [ ] API endpoints respond
- [ ] Database connections stable
- [ ] No critical errors in logs

### Short-term Monitoring (First hour)
- [ ] Performance metrics normal
- [ ] Memory usage stable
- [ ] No error spikes in logs
- [ ] SSL certificate valid
- [ ] All features functional

### Long-term Monitoring (First 24 hours)
- [ ] System resources stable
- [ ] No memory leaks detected
- [ ] Error rates within normal range
- [ ] User reports no issues
- [ ] Backup systems working

## Emergency Contacts

### Escalation Path
1. **Self-diagnosis**: Use troubleshooting scripts
2. **Log analysis**: Check error logs and system status
3. **Rollback**: If critical issues, rollback to previous version
4. **Support**: Contact system administrator with diagnostic data

### Required Information for Support
- Server IP and domain name
- Error messages and screenshots
- Output from diagnostic scripts
- Timeline of when issues started
- Steps already attempted

---

**Last Updated**: October 27, 2025
**Version**: 1.0
**Use Case**: VPS Deployment Troubleshooting