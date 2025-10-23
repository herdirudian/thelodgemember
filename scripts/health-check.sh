#!/bin/bash

# Health Check Script for The Lodge Family
# Monitors application health and sends alerts if needed

echo "🏥 The Lodge Family - Health Check"
echo "=================================="
echo "⏰ $(date)"
echo ""

# Configuration
BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:3000"
DB_USER="thelodge_user"
DB_NAME="thelodgefamily"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Health status
OVERALL_HEALTH=true

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $url 2>/dev/null || echo "000")
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 $url 2>/dev/null || echo "timeout")
    
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "✅ ${GREEN}$name${NC}: OK (${status}) - Response time: ${response_time}s"
    else
        echo -e "❌ ${RED}$name${NC}: FAILED (${status}) - Response time: ${response_time}s"
        OVERALL_HEALTH=false
    fi
}

# Function to check database
check_database() {
    echo -n "🗄️  Database: "
    
    # Test database connection
    if mysql -u $DB_USER -p$DB_PASS -e "SELECT 1" $DB_NAME >/dev/null 2>&1; then
        # Get database size
        local db_size=$(mysql -u $DB_USER -p$DB_PASS -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS 'DB Size in MB' FROM information_schema.tables WHERE table_schema='$DB_NAME';" 2>/dev/null | tail -n 1)
        echo -e "${GREEN}OK${NC} - Size: ${db_size}MB"
    else
        echo -e "${RED}FAILED${NC}"
        OVERALL_HEALTH=false
    fi
}

# Function to check PM2 processes
check_pm2() {
    echo "🔄 PM2 Processes:"
    
    if command -v pm2 >/dev/null 2>&1; then
        local backend_status=$(pm2 jlist | jq -r '.[] | select(.name=="thelodge-backend") | .pm2_env.status' 2>/dev/null || echo "not_found")
        local frontend_status=$(pm2 jlist | jq -r '.[] | select(.name=="thelodge-frontend") | .pm2_env.status' 2>/dev/null || echo "not_found")
        
        # Backend process
        if [ "$backend_status" = "online" ]; then
            echo -e "   ✅ ${GREEN}Backend${NC}: online"
        else
            echo -e "   ❌ ${RED}Backend${NC}: $backend_status"
            OVERALL_HEALTH=false
        fi
        
        # Frontend process
        if [ "$frontend_status" = "online" ]; then
            echo -e "   ✅ ${GREEN}Frontend${NC}: online"
        else
            echo -e "   ❌ ${RED}Frontend${NC}: $frontend_status"
            OVERALL_HEALTH=false
        fi
    else
        echo -e "   ❌ ${RED}PM2 not found${NC}"
        OVERALL_HEALTH=false
    fi
}

# Function to check disk space
check_disk_space() {
    echo -n "💾 Disk Space: "
    
    local disk_usage=$(df /var/www/thelodgefamily | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        echo -e "${GREEN}OK${NC} (${disk_usage}% used)"
    elif [ "$disk_usage" -lt 90 ]; then
        echo -e "${YELLOW}WARNING${NC} (${disk_usage}% used)"
    else
        echo -e "${RED}CRITICAL${NC} (${disk_usage}% used)"
        OVERALL_HEALTH=false
    fi
}

# Function to check memory usage
check_memory() {
    echo -n "🧠 Memory Usage: "
    
    local mem_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
    local mem_usage_int=${mem_usage%.*}
    
    if [ "$mem_usage_int" -lt 80 ]; then
        echo -e "${GREEN}OK${NC} (${mem_usage}% used)"
    elif [ "$mem_usage_int" -lt 90 ]; then
        echo -e "${YELLOW}WARNING${NC} (${mem_usage}% used)"
    else
        echo -e "${RED}CRITICAL${NC} (${mem_usage}% used)"
    fi
}

# Function to check SSL certificate (if applicable)
check_ssl() {
    local domain=$1
    if [ -n "$domain" ]; then
        echo -n "🔒 SSL Certificate: "
        
        local ssl_expiry=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
        local ssl_expiry_epoch=$(date -d "$ssl_expiry" +%s 2>/dev/null || echo "0")
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (ssl_expiry_epoch - current_epoch) / 86400 ))
        
        if [ "$days_until_expiry" -gt 30 ]; then
            echo -e "${GREEN}OK${NC} (expires in $days_until_expiry days)"
        elif [ "$days_until_expiry" -gt 7 ]; then
            echo -e "${YELLOW}WARNING${NC} (expires in $days_until_expiry days)"
        else
            echo -e "${RED}CRITICAL${NC} (expires in $days_until_expiry days)"
        fi
    fi
}

# Run health checks
echo "🌐 HTTP Endpoints:"
check_http "$BACKEND_URL/api/health" "Backend API"
check_http "$FRONTEND_URL" "Frontend"

echo ""
check_database

echo ""
check_pm2

echo ""
check_disk_space
check_memory

echo ""
# Uncomment and set your domain if you have SSL
# check_ssl "your-domain.com"

# Overall health status
echo ""
echo "=================================="
if [ "$OVERALL_HEALTH" = true ]; then
    echo -e "🎉 ${GREEN}Overall Status: HEALTHY${NC}"
    exit 0
else
    echo -e "🚨 ${RED}Overall Status: UNHEALTHY${NC}"
    echo ""
    echo "🔧 Troubleshooting commands:"
    echo "   pm2 logs          # View application logs"
    echo "   pm2 monit         # Monitor processes"
    echo "   pm2 restart all   # Restart all processes"
    echo "   systemctl status mysql  # Check MySQL status"
    echo "   systemctl status nginx  # Check Nginx status"
    exit 1
fi