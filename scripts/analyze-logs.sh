#!/bin/bash

# The Lodge Family - Error Log Analysis Script
# This script analyzes various log files to identify deployment issues

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_PATH="/var/www/thelodgefamily/current"
ANALYSIS_OUTPUT="/tmp/thelodgefamily-log-analysis.txt"
LINES_TO_ANALYZE=500

# Function to print colored output
print_header() {
    echo -e "${CYAN}[ANALYSIS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to create analysis report header
create_report_header() {
    cat > "$ANALYSIS_OUTPUT" << EOF
The Lodge Family - Log Analysis Report
=====================================
Generated: $(date)
Server: $(hostname)
Analysis Period: Last $LINES_TO_ANALYZE lines from each log

EOF
}

# Function to analyze PM2 logs
analyze_pm2_logs() {
    print_header "Analyzing PM2 logs..."
    
    echo "PM2 Log Analysis" >> "$ANALYSIS_OUTPUT"
    echo "=================" >> "$ANALYSIS_OUTPUT"
    echo "" >> "$ANALYSIS_OUTPUT"
    
    if command -v pm2 &> /dev/null; then
        # Get PM2 status
        echo "PM2 Status:" >> "$ANALYSIS_OUTPUT"
        pm2 status >> "$ANALYSIS_OUTPUT" 2>&1
        echo "" >> "$ANALYSIS_OUTPUT"
        
        # Analyze PM2 logs for errors
        pm2_logs=$(pm2 logs --lines $LINES_TO_ANALYZE --nostream 2>/dev/null)
        
        if [ -n "$pm2_logs" ]; then
            # Count different types of issues
            error_count=$(echo "$pm2_logs" | grep -i "error" | wc -l)
            exception_count=$(echo "$pm2_logs" | grep -i "exception" | wc -l)
            warning_count=$(echo "$pm2_logs" | grep -i "warning" | wc -l)
            crash_count=$(echo "$pm2_logs" | grep -i "crash\|exit\|killed" | wc -l)
            
            echo "Error Summary:" >> "$ANALYSIS_OUTPUT"
            echo "- Errors: $error_count" >> "$ANALYSIS_OUTPUT"
            echo "- Exceptions: $exception_count" >> "$ANALYSIS_OUTPUT"
            echo "- Warnings: $warning_count" >> "$ANALYSIS_OUTPUT"
            echo "- Crashes/Exits: $crash_count" >> "$ANALYSIS_OUTPUT"
            echo "" >> "$ANALYSIS_OUTPUT"
            
            # Show recent errors
            if [ "$error_count" -gt 0 ]; then
                echo "Recent Errors:" >> "$ANALYSIS_OUTPUT"
                echo "$pm2_logs" | grep -i "error" | tail -10 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
                
                print_warning "Found $error_count errors in PM2 logs"
            fi
            
            # Show recent exceptions
            if [ "$exception_count" -gt 0 ]; then
                echo "Recent Exceptions:" >> "$ANALYSIS_OUTPUT"
                echo "$pm2_logs" | grep -i "exception" | tail -10 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
                
                print_warning "Found $exception_count exceptions in PM2 logs"
            fi
            
            # Check for specific error patterns
            database_errors=$(echo "$pm2_logs" | grep -i "database\|mysql\|connection.*refused\|econnrefused" | wc -l)
            port_errors=$(echo "$pm2_logs" | grep -i "eaddrinuse\|port.*already\|listen.*error" | wc -l)
            permission_errors=$(echo "$pm2_logs" | grep -i "permission\|eacces\|eperm" | wc -l)
            
            if [ "$database_errors" -gt 0 ]; then
                print_error "Found $database_errors database connection errors"
                echo "Database Connection Issues:" >> "$ANALYSIS_OUTPUT"
                echo "$pm2_logs" | grep -i "database\|mysql\|connection.*refused\|econnrefused" | tail -5 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
            fi
            
            if [ "$port_errors" -gt 0 ]; then
                print_error "Found $port_errors port binding errors"
                echo "Port Binding Issues:" >> "$ANALYSIS_OUTPUT"
                echo "$pm2_logs" | grep -i "eaddrinuse\|port.*already\|listen.*error" | tail -5 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
            fi
            
            if [ "$permission_errors" -gt 0 ]; then
                print_error "Found $permission_errors permission errors"
                echo "Permission Issues:" >> "$ANALYSIS_OUTPUT"
                echo "$pm2_logs" | grep -i "permission\|eacces\|eperm" | tail -5 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
            fi
            
            if [ "$error_count" -eq 0 ] && [ "$exception_count" -eq 0 ]; then
                print_success "No critical errors found in PM2 logs"
            fi
        else
            print_warning "No PM2 logs available"
            echo "No PM2 logs available" >> "$ANALYSIS_OUTPUT"
        fi
    else
        print_error "PM2 is not installed or not in PATH"
        echo "PM2 is not available" >> "$ANALYSIS_OUTPUT"
    fi
    
    echo "" >> "$ANALYSIS_OUTPUT"
}

# Function to analyze Nginx logs
analyze_nginx_logs() {
    print_header "Analyzing Nginx logs..."
    
    echo "Nginx Log Analysis" >> "$ANALYSIS_OUTPUT"
    echo "==================" >> "$ANALYSIS_OUTPUT"
    echo "" >> "$ANALYSIS_OUTPUT"
    
    # Check Nginx error log
    if [ -f "/var/log/nginx/error.log" ]; then
        nginx_errors=$(tail -n $LINES_TO_ANALYZE /var/log/nginx/error.log)
        
        if [ -n "$nginx_errors" ]; then
            # Count error levels
            crit_count=$(echo "$nginx_errors" | grep "\[crit\]" | wc -l)
            error_count=$(echo "$nginx_errors" | grep "\[error\]" | wc -l)
            warn_count=$(echo "$nginx_errors" | grep "\[warn\]" | wc -l)
            
            echo "Nginx Error Summary:" >> "$ANALYSIS_OUTPUT"
            echo "- Critical: $crit_count" >> "$ANALYSIS_OUTPUT"
            echo "- Errors: $error_count" >> "$ANALYSIS_OUTPUT"
            echo "- Warnings: $warn_count" >> "$ANALYSIS_OUTPUT"
            echo "" >> "$ANALYSIS_OUTPUT"
            
            # Show recent critical errors
            if [ "$crit_count" -gt 0 ]; then
                print_error "Found $crit_count critical errors in Nginx logs"
                echo "Recent Critical Errors:" >> "$ANALYSIS_OUTPUT"
                echo "$nginx_errors" | grep "\[crit\]" | tail -5 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
            fi
            
            # Show recent errors
            if [ "$error_count" -gt 0 ]; then
                print_warning "Found $error_count errors in Nginx logs"
                echo "Recent Errors:" >> "$ANALYSIS_OUTPUT"
                echo "$nginx_errors" | grep "\[error\]" | tail -10 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
            fi
            
            # Check for specific issues
            upstream_errors=$(echo "$nginx_errors" | grep -i "upstream" | wc -l)
            ssl_errors=$(echo "$nginx_errors" | grep -i "ssl\|certificate" | wc -l)
            timeout_errors=$(echo "$nginx_errors" | grep -i "timeout" | wc -l)
            
            if [ "$upstream_errors" -gt 0 ]; then
                print_error "Found $upstream_errors upstream connection errors"
                echo "Upstream Connection Issues:" >> "$ANALYSIS_OUTPUT"
                echo "$nginx_errors" | grep -i "upstream" | tail -5 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
            fi
            
            if [ "$ssl_errors" -gt 0 ]; then
                print_warning "Found $ssl_errors SSL-related errors"
                echo "SSL Issues:" >> "$ANALYSIS_OUTPUT"
                echo "$nginx_errors" | grep -i "ssl\|certificate" | tail -5 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
            fi
            
            if [ "$timeout_errors" -gt 0 ]; then
                print_warning "Found $timeout_errors timeout errors"
                echo "Timeout Issues:" >> "$ANALYSIS_OUTPUT"
                echo "$nginx_errors" | grep -i "timeout" | tail -5 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
            fi
            
            if [ "$crit_count" -eq 0 ] && [ "$error_count" -eq 0 ]; then
                print_success "No critical errors found in Nginx logs"
            fi
        else
            print_info "Nginx error log is empty"
            echo "Nginx error log is empty" >> "$ANALYSIS_OUTPUT"
        fi
    else
        print_warning "Nginx error log not found at /var/log/nginx/error.log"
        echo "Nginx error log not found" >> "$ANALYSIS_OUTPUT"
    fi
    
    # Check Nginx access log for unusual patterns
    if [ -f "/var/log/nginx/access.log" ]; then
        echo "Nginx Access Log Analysis:" >> "$ANALYSIS_OUTPUT"
        
        # Get recent 4xx and 5xx errors
        recent_4xx=$(tail -n $LINES_TO_ANALYZE /var/log/nginx/access.log | grep " 4[0-9][0-9] " | wc -l)
        recent_5xx=$(tail -n $LINES_TO_ANALYZE /var/log/nginx/access.log | grep " 5[0-9][0-9] " | wc -l)
        
        echo "- 4xx errors: $recent_4xx" >> "$ANALYSIS_OUTPUT"
        echo "- 5xx errors: $recent_5xx" >> "$ANALYSIS_OUTPUT"
        
        if [ "$recent_5xx" -gt 0 ]; then
            print_warning "Found $recent_5xx server errors (5xx) in access log"
            echo "Recent 5xx Errors:" >> "$ANALYSIS_OUTPUT"
            tail -n $LINES_TO_ANALYZE /var/log/nginx/access.log | grep " 5[0-9][0-9] " | tail -5 >> "$ANALYSIS_OUTPUT"
        fi
        
        if [ "$recent_4xx" -gt 10 ]; then
            print_info "Found $recent_4xx client errors (4xx) in access log"
        fi
    fi
    
    echo "" >> "$ANALYSIS_OUTPUT"
}

# Function to analyze system logs
analyze_system_logs() {
    print_header "Analyzing system logs..."
    
    echo "System Log Analysis" >> "$ANALYSIS_OUTPUT"
    echo "===================" >> "$ANALYSIS_OUTPUT"
    echo "" >> "$ANALYSIS_OUTPUT"
    
    # Check systemd journal for our services
    if command -v journalctl &> /dev/null; then
        echo "Systemd Journal Analysis:" >> "$ANALYSIS_OUTPUT"
        
        # Check for nginx service issues
        nginx_journal=$(journalctl -u nginx --since "1 hour ago" --no-pager -q 2>/dev/null)
        if [ -n "$nginx_journal" ]; then
            nginx_errors=$(echo "$nginx_journal" | grep -i "error\|failed\|critical" | wc -l)
            if [ "$nginx_errors" -gt 0 ]; then
                print_warning "Found $nginx_errors nginx service issues in journal"
                echo "Nginx Service Issues:" >> "$ANALYSIS_OUTPUT"
                echo "$nginx_journal" | grep -i "error\|failed\|critical" | tail -5 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
            fi
        fi
        
        # Check for MySQL/MariaDB service issues
        mysql_journal=$(journalctl -u mysql --since "1 hour ago" --no-pager -q 2>/dev/null)
        if [ -z "$mysql_journal" ]; then
            mysql_journal=$(journalctl -u mariadb --since "1 hour ago" --no-pager -q 2>/dev/null)
        fi
        
        if [ -n "$mysql_journal" ]; then
            mysql_errors=$(echo "$mysql_journal" | grep -i "error\|failed\|critical" | wc -l)
            if [ "$mysql_errors" -gt 0 ]; then
                print_warning "Found $mysql_errors database service issues in journal"
                echo "Database Service Issues:" >> "$ANALYSIS_OUTPUT"
                echo "$mysql_journal" | grep -i "error\|failed\|critical" | tail -5 >> "$ANALYSIS_OUTPUT"
                echo "" >> "$ANALYSIS_OUTPUT"
            fi
        fi
    fi
    
    # Check system resource issues
    echo "System Resource Analysis:" >> "$ANALYSIS_OUTPUT"
    
    # Memory usage
    memory_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
    echo "Memory usage: ${memory_usage}%" >> "$ANALYSIS_OUTPUT"
    
    # Disk usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}')
    echo "Disk usage: $disk_usage" >> "$ANALYSIS_OUTPUT"
    
    # Load average
    load_avg=$(uptime | awk -F'load average:' '{print $2}')
    echo "Load average:$load_avg" >> "$ANALYSIS_OUTPUT"
    
    echo "" >> "$ANALYSIS_OUTPUT"
}

# Function to analyze application-specific logs
analyze_application_logs() {
    print_header "Analyzing application logs..."
    
    echo "Application Log Analysis" >> "$ANALYSIS_OUTPUT"
    echo "========================" >> "$ANALYSIS_OUTPUT"
    echo "" >> "$ANALYSIS_OUTPUT"
    
    # Check if project directory exists
    if [ -d "$PROJECT_PATH" ]; then
        cd "$PROJECT_PATH" || return 1
        
        # Look for application log files
        app_logs=$(find . -name "*.log" -type f 2>/dev/null | head -10)
        
        if [ -n "$app_logs" ]; then
            echo "Found application log files:" >> "$ANALYSIS_OUTPUT"
            echo "$app_logs" >> "$ANALYSIS_OUTPUT"
            echo "" >> "$ANALYSIS_OUTPUT"
            
            # Analyze each log file
            while IFS= read -r log_file; do
                if [ -f "$log_file" ]; then
                    echo "Analyzing $log_file:" >> "$ANALYSIS_OUTPUT"
                    
                    # Get recent errors from this log
                    recent_errors=$(tail -n 100 "$log_file" | grep -i "error\|exception\|failed" | wc -l)
                    
                    if [ "$recent_errors" -gt 0 ]; then
                        print_warning "Found $recent_errors errors in $log_file"
                        echo "Recent errors:" >> "$ANALYSIS_OUTPUT"
                        tail -n 100 "$log_file" | grep -i "error\|exception\|failed" | tail -5 >> "$ANALYSIS_OUTPUT"
                    else
                        echo "No recent errors found" >> "$ANALYSIS_OUTPUT"
                    fi
                    
                    echo "" >> "$ANALYSIS_OUTPUT"
                fi
            done <<< "$app_logs"
        else
            echo "No application log files found" >> "$ANALYSIS_OUTPUT"
            print_info "No application-specific log files found"
        fi
    else
        print_error "Project directory not found: $PROJECT_PATH"
        echo "Project directory not found: $PROJECT_PATH" >> "$ANALYSIS_OUTPUT"
    fi
    
    echo "" >> "$ANALYSIS_OUTPUT"
}

# Function to generate recommendations
generate_recommendations() {
    print_header "Generating recommendations..."
    
    echo "Recommendations" >> "$ANALYSIS_OUTPUT"
    echo "===============" >> "$ANALYSIS_OUTPUT"
    echo "" >> "$ANALYSIS_OUTPUT"
    
    # Read the analysis file to generate recommendations
    if [ -f "$ANALYSIS_OUTPUT" ]; then
        # Check for common issues and provide recommendations
        if grep -q "database.*error\|mysql.*error\|connection.*refused" "$ANALYSIS_OUTPUT"; then
            echo "🔧 Database Issues Detected:" >> "$ANALYSIS_OUTPUT"
            echo "   - Check if MySQL/MariaDB service is running: systemctl status mysql" >> "$ANALYSIS_OUTPUT"
            echo "   - Verify database credentials in .env file" >> "$ANALYSIS_OUTPUT"
            echo "   - Check database connectivity: mysql -u username -p" >> "$ANALYSIS_OUTPUT"
            echo "" >> "$ANALYSIS_OUTPUT"
        fi
        
        if grep -q "upstream.*error\|502\|503\|504" "$ANALYSIS_OUTPUT"; then
            echo "🔧 Upstream Connection Issues Detected:" >> "$ANALYSIS_OUTPUT"
            echo "   - Check if backend application is running: pm2 status" >> "$ANALYSIS_OUTPUT"
            echo "   - Verify backend is listening on correct port (5001)" >> "$ANALYSIS_OUTPUT"
            echo "   - Check Nginx upstream configuration" >> "$ANALYSIS_OUTPUT"
            echo "" >> "$ANALYSIS_OUTPUT"
        fi
        
        if grep -q "permission.*error\|eacces\|eperm" "$ANALYSIS_OUTPUT"; then
            echo "🔧 Permission Issues Detected:" >> "$ANALYSIS_OUTPUT"
            echo "   - Check file ownership: chown -R www-data:www-data $PROJECT_PATH" >> "$ANALYSIS_OUTPUT"
            echo "   - Set correct permissions: chmod -R 755 $PROJECT_PATH" >> "$ANALYSIS_OUTPUT"
            echo "   - Verify PM2 is running as correct user" >> "$ANALYSIS_OUTPUT"
            echo "" >> "$ANALYSIS_OUTPUT"
        fi
        
        if grep -q "ssl.*error\|certificate.*error" "$ANALYSIS_OUTPUT"; then
            echo "🔧 SSL Certificate Issues Detected:" >> "$ANALYSIS_OUTPUT"
            echo "   - Check certificate validity: openssl x509 -in /path/to/cert -text -noout" >> "$ANALYSIS_OUTPUT"
            echo "   - Verify certificate chain is complete" >> "$ANALYSIS_OUTPUT"
            echo "   - Check if certificate has expired" >> "$ANALYSIS_OUTPUT"
            echo "" >> "$ANALYSIS_OUTPUT"
        fi
        
        if grep -q "port.*already\|eaddrinuse" "$ANALYSIS_OUTPUT"; then
            echo "🔧 Port Binding Issues Detected:" >> "$ANALYSIS_OUTPUT"
            echo "   - Check what's using the port: netstat -tulpn | grep :5001" >> "$ANALYSIS_OUTPUT"
            echo "   - Kill conflicting processes if necessary" >> "$ANALYSIS_OUTPUT"
            echo "   - Restart PM2 processes: pm2 restart all" >> "$ANALYSIS_OUTPUT"
            echo "" >> "$ANALYSIS_OUTPUT"
        fi
        
        # General recommendations
        echo "📋 General Recommendations:" >> "$ANALYSIS_OUTPUT"
        echo "   - Monitor logs regularly: tail -f /var/log/nginx/error.log" >> "$ANALYSIS_OUTPUT"
        echo "   - Keep PM2 processes updated: pm2 update" >> "$ANALYSIS_OUTPUT"
        echo "   - Regular system updates: apt update && apt upgrade" >> "$ANALYSIS_OUTPUT"
        echo "   - Monitor disk space: df -h" >> "$ANALYSIS_OUTPUT"
        echo "   - Check memory usage: free -h" >> "$ANALYSIS_OUTPUT"
        echo "" >> "$ANALYSIS_OUTPUT"
    fi
}

# Function to show summary
show_summary() {
    print_header "Analysis Summary"
    
    if [ -f "$ANALYSIS_OUTPUT" ]; then
        # Count total issues found
        total_errors=$(grep -c "Found.*error\|Found.*critical\|Found.*exception" "$ANALYSIS_OUTPUT" 2>/dev/null || echo "0")
        total_warnings=$(grep -c "Found.*warning" "$ANALYSIS_OUTPUT" 2>/dev/null || echo "0")
        
        echo ""
        print_info "Analysis completed. Report saved to: $ANALYSIS_OUTPUT"
        
        if [ "$total_errors" -gt 0 ]; then
            print_error "Found $total_errors critical issues that need attention"
        fi
        
        if [ "$total_warnings" -gt 0 ]; then
            print_warning "Found $total_warnings warnings to review"
        fi
        
        if [ "$total_errors" -eq 0 ] && [ "$total_warnings" -eq 0 ]; then
            print_success "No critical issues found in the logs"
        fi
        
        echo ""
        print_info "To view the full report: cat $ANALYSIS_OUTPUT"
        print_info "To monitor in real-time: ./monitor-deployment.sh --watch"
    else
        print_error "Analysis report could not be generated"
    fi
}

# Main execution
main() {
    echo "========================================"
    echo "The Lodge Family - Log Analysis"
    echo "========================================"
    echo "Starting comprehensive log analysis..."
    echo ""
    
    # Create analysis report
    create_report_header
    
    # Run analysis functions
    analyze_pm2_logs
    analyze_nginx_logs
    analyze_system_logs
    analyze_application_logs
    
    # Generate recommendations
    generate_recommendations
    
    # Show summary
    show_summary
    
    echo "========================================"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_warning "Some log files may require root access. Consider running with sudo for complete analysis."
    echo ""
fi

# Run main function
main "$@"