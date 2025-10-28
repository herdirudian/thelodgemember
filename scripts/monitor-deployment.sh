#!/bin/bash

# The Lodge Family - Deployment Monitoring Script
# This script monitors the health and status of the deployed application

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="family.thelodgegroup.id"
API_URL="https://$DOMAIN"
FRONTEND_URL="https://$DOMAIN"
PROJECT_PATH="/var/www/thelodgefamily/current"
LOG_FILE="/var/log/thelodgefamily-monitor.log"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${CYAN}[MONITOR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_fail() {
    echo -e "${RED}❌${NC} $1"
}

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to check if a service is running
check_service() {
    local service_name=$1
    if systemctl is-active --quiet "$service_name"; then
        print_success "$service_name is running"
        return 0
    else
        print_fail "$service_name is not running"
        return 1
    fi
}

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local description=$2
    local timeout=${3:-10}
    
    print_header "Checking $description..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$timeout" "$url")
    
    if [ "$response" = "200" ]; then
        print_success "$description is responding (HTTP $response)"
        return 0
    elif [ "$response" = "000" ]; then
        print_fail "$description is unreachable (connection failed)"
        return 1
    else
        print_warning "$description returned HTTP $response"
        return 1
    fi
}

# Function to check PM2 processes
check_pm2() {
    print_header "Checking PM2 processes..."
    
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed"
        return 1
    fi
    
    # Check if PM2 daemon is running
    if ! pm2 ping &> /dev/null; then
        print_error "PM2 daemon is not running"
        return 1
    fi
    
    # Get PM2 status
    pm2_status=$(pm2 jlist 2>/dev/null)
    
    if [ "$pm2_status" = "[]" ]; then
        print_error "No PM2 processes are running"
        return 1
    fi
    
    # Check specific processes
    backend_status=$(pm2 describe thelodgefamily-backend 2>/dev/null | grep -c "online")
    frontend_status=$(pm2 describe thelodgefamily-frontend 2>/dev/null | grep -c "online")
    
    if [ "$backend_status" -gt 0 ]; then
        print_success "Backend process is online"
    else
        print_fail "Backend process is not running"
    fi
    
    if [ "$frontend_status" -gt 0 ]; then
        print_success "Frontend process is online"
    else
        print_fail "Frontend process is not running"
    fi
    
    # Show PM2 status
    echo ""
    print_header "PM2 Status:"
    pm2 status
    
    return 0
}

# Function to check disk space
check_disk_space() {
    print_header "Checking disk space..."
    
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        print_success "Disk usage: ${disk_usage}% (OK)"
    elif [ "$disk_usage" -lt 90 ]; then
        print_warning "Disk usage: ${disk_usage}% (Warning)"
    else
        print_error "Disk usage: ${disk_usage}% (Critical)"
    fi
}

# Function to check memory usage
check_memory() {
    print_header "Checking memory usage..."
    
    memory_info=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
    
    if (( $(echo "$memory_info < 80" | bc -l) )); then
        print_success "Memory usage: ${memory_info}% (OK)"
    elif (( $(echo "$memory_info < 90" | bc -l) )); then
        print_warning "Memory usage: ${memory_info}% (Warning)"
    else
        print_error "Memory usage: ${memory_info}% (Critical)"
    fi
}

# Function to check SSL certificate
check_ssl() {
    print_header "Checking SSL certificate..."
    
    if command -v openssl &> /dev/null; then
        cert_info=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
            expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null)
            current_timestamp=$(date +%s)
            days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if [ "$days_until_expiry" -gt 30 ]; then
                print_success "SSL certificate is valid (expires in $days_until_expiry days)"
            elif [ "$days_until_expiry" -gt 7 ]; then
                print_warning "SSL certificate expires in $days_until_expiry days"
            else
                print_error "SSL certificate expires in $days_until_expiry days (Critical)"
            fi
        else
            print_error "Could not retrieve SSL certificate information"
        fi
    else
        print_warning "OpenSSL not available, skipping SSL check"
    fi
}

# Function to check database connection
check_database() {
    print_header "Checking database connection..."
    
    if [ -f "$PROJECT_PATH/backend/test-env.js" ]; then
        cd "$PROJECT_PATH/backend" || return 1
        
        if node test-env.js &> /dev/null; then
            print_success "Database connection is working"
        else
            print_fail "Database connection failed"
        fi
    else
        print_warning "Database test script not found"
    fi
}

# Function to check log files for errors
check_logs() {
    print_header "Checking recent logs for errors..."
    
    # Check PM2 logs
    if command -v pm2 &> /dev/null; then
        error_count=$(pm2 logs --lines 100 --nostream 2>/dev/null | grep -i "error\|exception\|failed" | wc -l)
        if [ "$error_count" -gt 0 ]; then
            print_warning "Found $error_count error entries in PM2 logs"
        else
            print_success "No recent errors in PM2 logs"
        fi
    fi
    
    # Check Nginx error logs
    if [ -f "/var/log/nginx/error.log" ]; then
        recent_errors=$(tail -n 100 /var/log/nginx/error.log | grep "$(date '+%Y/%m/%d')" | wc -l)
        if [ "$recent_errors" -gt 0 ]; then
            print_warning "Found $recent_errors error entries in Nginx logs today"
        else
            print_success "No recent errors in Nginx logs"
        fi
    fi
}

# Function to show system information
show_system_info() {
    print_header "System Information:"
    echo "Hostname: $(hostname)"
    echo "Uptime: $(uptime -p)"
    echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    echo "Date: $(date)"
    echo ""
}

# Main monitoring function
run_monitoring() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "========================================"
    echo "The Lodge Family - Deployment Monitor"
    echo "========================================"
    echo "Timestamp: $timestamp"
    echo ""
    
    log_message "Starting monitoring check"
    
    # System information
    show_system_info
    
    # Check system resources
    check_disk_space
    check_memory
    echo ""
    
    # Check services
    print_header "Checking system services..."
    check_service "nginx"
    check_service "mysql" || check_service "mariadb"
    echo ""
    
    # Check PM2 processes
    check_pm2
    echo ""
    
    # Check application endpoints
    check_endpoint "$FRONTEND_URL" "Frontend application"
    check_endpoint "$API_URL/api/health" "Backend API health"
    check_endpoint "$API_URL/api/auth/check" "Backend auth endpoint"
    echo ""
    
    # Check SSL certificate
    check_ssl
    echo ""
    
    # Check database
    check_database
    echo ""
    
    # Check logs
    check_logs
    echo ""
    
    print_header "Monitoring check completed"
    log_message "Monitoring check completed"
    
    echo "========================================"
}

# Function to show help
show_help() {
    echo "The Lodge Family - Deployment Monitoring Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -w, --watch    Run in watch mode (continuous monitoring)"
    echo "  -i, --interval Set watch interval in seconds (default: 60)"
    echo "  -l, --logs     Show recent logs"
    echo "  -s, --status   Show quick status only"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run single monitoring check"
    echo "  $0 --watch           # Run continuous monitoring"
    echo "  $0 --watch -i 30     # Run continuous monitoring every 30 seconds"
    echo "  $0 --status          # Show quick status"
    echo "  $0 --logs            # Show recent logs"
}

# Function to show quick status
show_quick_status() {
    print_header "Quick Status Check"
    
    # Check PM2
    if pm2 ping &> /dev/null; then
        backend_online=$(pm2 describe thelodgefamily-backend 2>/dev/null | grep -c "online")
        frontend_online=$(pm2 describe thelodgefamily-frontend 2>/dev/null | grep -c "online")
        
        if [ "$backend_online" -gt 0 ] && [ "$frontend_online" -gt 0 ]; then
            print_success "All PM2 processes are online"
        else
            print_fail "Some PM2 processes are offline"
        fi
    else
        print_fail "PM2 daemon is not running"
    fi
    
    # Quick endpoint check
    if check_endpoint "$FRONTEND_URL" "Frontend" 5 > /dev/null 2>&1; then
        print_success "Frontend is responding"
    else
        print_fail "Frontend is not responding"
    fi
    
    if check_endpoint "$API_URL/api/health" "Backend API" 5 > /dev/null 2>&1; then
        print_success "Backend API is responding"
    else
        print_fail "Backend API is not responding"
    fi
}

# Function to show recent logs
show_recent_logs() {
    print_header "Recent Application Logs"
    
    if command -v pm2 &> /dev/null; then
        echo ""
        print_header "PM2 Logs (last 20 lines):"
        pm2 logs --lines 20 --nostream
    fi
    
    if [ -f "/var/log/nginx/error.log" ]; then
        echo ""
        print_header "Nginx Error Logs (last 10 lines):"
        tail -n 10 /var/log/nginx/error.log
    fi
    
    if [ -f "$LOG_FILE" ]; then
        echo ""
        print_header "Monitor Logs (last 10 lines):"
        tail -n 10 "$LOG_FILE"
    fi
}

# Parse command line arguments
WATCH_MODE=false
WATCH_INTERVAL=60
SHOW_LOGS=false
QUICK_STATUS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -w|--watch)
            WATCH_MODE=true
            shift
            ;;
        -i|--interval)
            WATCH_INTERVAL="$2"
            shift 2
            ;;
        -l|--logs)
            SHOW_LOGS=true
            shift
            ;;
        -s|--status)
            QUICK_STATUS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Execute based on options
if [ "$SHOW_LOGS" = true ]; then
    show_recent_logs
elif [ "$QUICK_STATUS" = true ]; then
    show_quick_status
elif [ "$WATCH_MODE" = true ]; then
    print_header "Starting continuous monitoring (interval: ${WATCH_INTERVAL}s)"
    print_status "Press Ctrl+C to stop"
    echo ""
    
    while true; do
        run_monitoring
        echo ""
        print_status "Waiting ${WATCH_INTERVAL} seconds for next check..."
        sleep "$WATCH_INTERVAL"
        clear
    done
else
    run_monitoring
fi