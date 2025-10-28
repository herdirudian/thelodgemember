#!/bin/bash

# The Lodge Family - File Permissions Verification Script
# This script checks and fixes file permissions for proper deployment

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
WEB_USER="www-data"
WEB_GROUP="www-data"
PERMISSIONS_OUTPUT="/tmp/permissions-check-report.txt"
FIX_PERMISSIONS=false

# Function to print colored output
print_header() {
    echo -e "${CYAN}[PERMISSIONS]${NC} $1"
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

print_fix() {
    echo -e "${PURPLE}[FIX]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --fix              Fix permission issues automatically"
    echo "  --project-path     Specify project path (default: $PROJECT_PATH)"
    echo "  --web-user         Specify web user (default: $WEB_USER)"
    echo "  --web-group        Specify web group (default: $WEB_GROUP)"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                 Check permissions only"
    echo "  $0 --fix           Check and fix permissions"
    echo "  $0 --project-path /var/www/myapp --fix"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            FIX_PERMISSIONS=true
            shift
            ;;
        --project-path)
            PROJECT_PATH="$2"
            shift 2
            ;;
        --web-user)
            WEB_USER="$2"
            shift 2
            ;;
        --web-group)
            WEB_GROUP="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Function to create permissions report header
create_report_header() {
    cat > "$PERMISSIONS_OUTPUT" << EOF
The Lodge Family - File Permissions Check Report
===============================================
Generated: $(date)
Server: $(hostname)
Project Path: $PROJECT_PATH
Web User: $WEB_USER
Web Group: $WEB_GROUP
Fix Mode: $FIX_PERMISSIONS

EOF
}

# Function to check if user exists
check_user_exists() {
    local user=$1
    if id "$user" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to check if group exists
check_group_exists() {
    local group=$1
    if getent group "$group" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to check system prerequisites
check_prerequisites() {
    print_header "Checking system prerequisites..."
    
    echo "System Prerequisites Check" >> "$PERMISSIONS_OUTPUT"
    echo "=========================" >> "$PERMISSIONS_OUTPUT"
    echo "" >> "$PERMISSIONS_OUTPUT"
    
    # Check if project directory exists
    if [ ! -d "$PROJECT_PATH" ]; then
        print_error "Project directory does not exist: $PROJECT_PATH"
        echo "✗ Project directory missing: $PROJECT_PATH" >> "$PERMISSIONS_OUTPUT"
        return 1
    else
        print_success "Project directory exists: $PROJECT_PATH"
        echo "✓ Project directory exists: $PROJECT_PATH" >> "$PERMISSIONS_OUTPUT"
    fi
    
    # Check if web user exists
    if check_user_exists "$WEB_USER"; then
        print_success "Web user exists: $WEB_USER"
        echo "✓ Web user exists: $WEB_USER" >> "$PERMISSIONS_OUTPUT"
    else
        print_error "Web user does not exist: $WEB_USER"
        echo "✗ Web user missing: $WEB_USER" >> "$PERMISSIONS_OUTPUT"
        return 1
    fi
    
    # Check if web group exists
    if check_group_exists "$WEB_GROUP"; then
        print_success "Web group exists: $WEB_GROUP"
        echo "✓ Web group exists: $WEB_GROUP" >> "$PERMISSIONS_OUTPUT"
    else
        print_error "Web group does not exist: $WEB_GROUP"
        echo "✗ Web group missing: $WEB_GROUP" >> "$PERMISSIONS_OUTPUT"
        return 1
    fi
    
    # Check if running as root (needed for fixing permissions)
    if [ "$FIX_PERMISSIONS" = true ] && [ "$EUID" -ne 0 ]; then
        print_error "Root privileges required for fixing permissions. Run with sudo."
        echo "✗ Root privileges required for fixing" >> "$PERMISSIONS_OUTPUT"
        return 1
    fi
    
    echo "" >> "$PERMISSIONS_OUTPUT"
    return 0
}

# Function to check directory ownership and permissions
check_directory_permissions() {
    local dir_path=$1
    local expected_owner=$2
    local expected_group=$3
    local expected_perms=$4
    local description=$5
    
    if [ ! -e "$dir_path" ]; then
        print_warning "$description does not exist: $dir_path"
        echo "⚠ $description missing: $dir_path" >> "$PERMISSIONS_OUTPUT"
        return 1
    fi
    
    # Get current ownership and permissions
    local current_owner=$(stat -c %U "$dir_path" 2>/dev/null)
    local current_group=$(stat -c %G "$dir_path" 2>/dev/null)
    local current_perms=$(stat -c %a "$dir_path" 2>/dev/null)
    
    local issues=0
    
    echo "Checking $description ($dir_path):" >> "$PERMISSIONS_OUTPUT"
    echo "  Current: $current_owner:$current_group $current_perms" >> "$PERMISSIONS_OUTPUT"
    echo "  Expected: $expected_owner:$expected_group $expected_perms" >> "$PERMISSIONS_OUTPUT"
    
    # Check ownership
    if [ "$current_owner" != "$expected_owner" ]; then
        print_warning "$description has incorrect owner: $current_owner (expected: $expected_owner)"
        echo "  ⚠ Incorrect owner: $current_owner" >> "$PERMISSIONS_OUTPUT"
        issues=$((issues + 1))
        
        if [ "$FIX_PERMISSIONS" = true ]; then
            print_fix "Fixing owner for $description..."
            if chown "$expected_owner" "$dir_path" 2>/dev/null; then
                print_success "Fixed owner for $description"
                echo "  ✓ Fixed owner" >> "$PERMISSIONS_OUTPUT"
            else
                print_error "Failed to fix owner for $description"
                echo "  ✗ Failed to fix owner" >> "$PERMISSIONS_OUTPUT"
            fi
        fi
    else
        echo "  ✓ Correct owner" >> "$PERMISSIONS_OUTPUT"
    fi
    
    # Check group
    if [ "$current_group" != "$expected_group" ]; then
        print_warning "$description has incorrect group: $current_group (expected: $expected_group)"
        echo "  ⚠ Incorrect group: $current_group" >> "$PERMISSIONS_OUTPUT"
        issues=$((issues + 1))
        
        if [ "$FIX_PERMISSIONS" = true ]; then
            print_fix "Fixing group for $description..."
            if chgrp "$expected_group" "$dir_path" 2>/dev/null; then
                print_success "Fixed group for $description"
                echo "  ✓ Fixed group" >> "$PERMISSIONS_OUTPUT"
            else
                print_error "Failed to fix group for $description"
                echo "  ✗ Failed to fix group" >> "$PERMISSIONS_OUTPUT"
            fi
        fi
    else
        echo "  ✓ Correct group" >> "$PERMISSIONS_OUTPUT"
    fi
    
    # Check permissions
    if [ "$current_perms" != "$expected_perms" ]; then
        print_warning "$description has incorrect permissions: $current_perms (expected: $expected_perms)"
        echo "  ⚠ Incorrect permissions: $current_perms" >> "$PERMISSIONS_OUTPUT"
        issues=$((issues + 1))
        
        if [ "$FIX_PERMISSIONS" = true ]; then
            print_fix "Fixing permissions for $description..."
            if chmod "$expected_perms" "$dir_path" 2>/dev/null; then
                print_success "Fixed permissions for $description"
                echo "  ✓ Fixed permissions" >> "$PERMISSIONS_OUTPUT"
            else
                print_error "Failed to fix permissions for $description"
                echo "  ✗ Failed to fix permissions" >> "$PERMISSIONS_OUTPUT"
            fi
        fi
    else
        echo "  ✓ Correct permissions" >> "$PERMISSIONS_OUTPUT"
    fi
    
    if [ $issues -eq 0 ]; then
        print_success "$description has correct ownership and permissions"
    fi
    
    echo "" >> "$PERMISSIONS_OUTPUT"
    return $issues
}

# Function to check main project directories
check_main_directories() {
    print_header "Checking main project directories..."
    
    echo "Main Directory Permissions Check" >> "$PERMISSIONS_OUTPUT"
    echo "===============================" >> "$PERMISSIONS_OUTPUT"
    echo "" >> "$PERMISSIONS_OUTPUT"
    
    local total_issues=0
    
    # Check main project directory
    check_directory_permissions "$PROJECT_PATH" "$WEB_USER" "$WEB_GROUP" "755" "Project root"
    total_issues=$((total_issues + $?))
    
    # Check backend directory
    if [ -d "$PROJECT_PATH/backend" ]; then
        check_directory_permissions "$PROJECT_PATH/backend" "$WEB_USER" "$WEB_GROUP" "755" "Backend directory"
        total_issues=$((total_issues + $?))
    fi
    
    # Check frontend directory
    if [ -d "$PROJECT_PATH/frontend" ]; then
        check_directory_permissions "$PROJECT_PATH/frontend" "$WEB_USER" "$WEB_GROUP" "755" "Frontend directory"
        total_issues=$((total_issues + $?))
    fi
    
    # Check node_modules directories
    if [ -d "$PROJECT_PATH/backend/node_modules" ]; then
        check_directory_permissions "$PROJECT_PATH/backend/node_modules" "$WEB_USER" "$WEB_GROUP" "755" "Backend node_modules"
        total_issues=$((total_issues + $?))
    fi
    
    if [ -d "$PROJECT_PATH/frontend/node_modules" ]; then
        check_directory_permissions "$PROJECT_PATH/frontend/node_modules" "$WEB_USER" "$WEB_GROUP" "755" "Frontend node_modules"
        total_issues=$((total_issues + $?))
    fi
    
    return $total_issues
}

# Function to check critical files
check_critical_files() {
    print_header "Checking critical files..."
    
    echo "Critical Files Permissions Check" >> "$PERMISSIONS_OUTPUT"
    echo "===============================" >> "$PERMISSIONS_OUTPUT"
    echo "" >> "$PERMISSIONS_OUTPUT"
    
    local total_issues=0
    
    # Define critical files and their expected permissions
    local critical_files=(
        "$PROJECT_PATH/backend/.env:$WEB_USER:$WEB_GROUP:600:Backend environment file"
        "$PROJECT_PATH/frontend/.env:$WEB_USER:$WEB_GROUP:600:Frontend environment file"
        "$PROJECT_PATH/backend/package.json:$WEB_USER:$WEB_GROUP:644:Backend package.json"
        "$PROJECT_PATH/frontend/package.json:$WEB_USER:$WEB_GROUP:644:Frontend package.json"
        "$PROJECT_PATH/ecosystem.config.js:$WEB_USER:$WEB_GROUP:644:PM2 ecosystem config"
    )
    
    for file_info in "${critical_files[@]}"; do
        IFS=':' read -r file_path expected_owner expected_group expected_perms description <<< "$file_info"
        
        if [ -f "$file_path" ]; then
            check_directory_permissions "$file_path" "$expected_owner" "$expected_group" "$expected_perms" "$description"
            total_issues=$((total_issues + $?))
        else
            print_info "$description not found (may be optional): $file_path"
            echo "ℹ $description not found: $file_path" >> "$PERMISSIONS_OUTPUT"
        fi
    done
    
    return $total_issues
}

# Function to check executable files
check_executable_files() {
    print_header "Checking executable files..."
    
    echo "Executable Files Permissions Check" >> "$PERMISSIONS_OUTPUT"
    echo "=================================" >> "$PERMISSIONS_OUTPUT"
    echo "" >> "$PERMISSIONS_OUTPUT"
    
    local total_issues=0
    
    # Find and check shell scripts
    local shell_scripts=$(find "$PROJECT_PATH" -name "*.sh" -type f 2>/dev/null)
    
    if [ -n "$shell_scripts" ]; then
        echo "Found shell scripts:" >> "$PERMISSIONS_OUTPUT"
        
        while IFS= read -r script; do
            local current_perms=$(stat -c %a "$script" 2>/dev/null)
            echo "  $script ($current_perms)" >> "$PERMISSIONS_OUTPUT"
            
            # Check if script is executable
            if [ ! -x "$script" ]; then
                print_warning "Script is not executable: $script"
                echo "  ⚠ Not executable" >> "$PERMISSIONS_OUTPUT"
                total_issues=$((total_issues + 1))
                
                if [ "$FIX_PERMISSIONS" = true ]; then
                    print_fix "Making script executable: $script"
                    if chmod +x "$script" 2>/dev/null; then
                        print_success "Made script executable: $script"
                        echo "  ✓ Made executable" >> "$PERMISSIONS_OUTPUT"
                    else
                        print_error "Failed to make script executable: $script"
                        echo "  ✗ Failed to make executable" >> "$PERMISSIONS_OUTPUT"
                    fi
                fi
            else
                echo "  ✓ Executable" >> "$PERMISSIONS_OUTPUT"
            fi
        done <<< "$shell_scripts"
    else
        echo "No shell scripts found" >> "$PERMISSIONS_OUTPUT"
    fi
    
    echo "" >> "$PERMISSIONS_OUTPUT"
    return $total_issues
}

# Function to check log directories and files
check_log_permissions() {
    print_header "Checking log directories and files..."
    
    echo "Log Files Permissions Check" >> "$PERMISSIONS_OUTPUT"
    echo "==========================" >> "$PERMISSIONS_OUTPUT"
    echo "" >> "$PERMISSIONS_OUTPUT"
    
    local total_issues=0
    
    # Check for log directories
    local log_dirs=(
        "$PROJECT_PATH/logs"
        "$PROJECT_PATH/backend/logs"
        "$PROJECT_PATH/frontend/logs"
    )
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            check_directory_permissions "$log_dir" "$WEB_USER" "$WEB_GROUP" "755" "Log directory"
            total_issues=$((total_issues + $?))
            
            # Check log files in the directory
            local log_files=$(find "$log_dir" -name "*.log" -type f 2>/dev/null)
            if [ -n "$log_files" ]; then
                while IFS= read -r log_file; do
                    check_directory_permissions "$log_file" "$WEB_USER" "$WEB_GROUP" "644" "Log file"
                    total_issues=$((total_issues + $?))
                done <<< "$log_files"
            fi
        fi
    done
    
    return $total_issues
}

# Function to check upload/storage directories
check_storage_permissions() {
    print_header "Checking storage and upload directories..."
    
    echo "Storage Directories Permissions Check" >> "$PERMISSIONS_OUTPUT"
    echo "====================================" >> "$PERMISSIONS_OUTPUT"
    echo "" >> "$PERMISSIONS_OUTPUT"
    
    local total_issues=0
    
    # Check for storage directories that need write access
    local storage_dirs=(
        "$PROJECT_PATH/uploads"
        "$PROJECT_PATH/storage"
        "$PROJECT_PATH/tmp"
        "$PROJECT_PATH/backend/uploads"
        "$PROJECT_PATH/backend/storage"
        "$PROJECT_PATH/backend/tmp"
        "$PROJECT_PATH/frontend/public/uploads"
    )
    
    for storage_dir in "${storage_dirs[@]}"; do
        if [ -d "$storage_dir" ]; then
            check_directory_permissions "$storage_dir" "$WEB_USER" "$WEB_GROUP" "775" "Storage directory"
            total_issues=$((total_issues + $?))
        else
            print_info "Storage directory not found (may be optional): $storage_dir"
            echo "ℹ Storage directory not found: $storage_dir" >> "$PERMISSIONS_OUTPUT"
        fi
    done
    
    return $total_issues
}

# Function to perform recursive ownership fix
fix_recursive_ownership() {
    if [ "$FIX_PERMISSIONS" = true ]; then
        print_header "Applying recursive ownership fix..."
        
        echo "Recursive Ownership Fix" >> "$PERMISSIONS_OUTPUT"
        echo "======================" >> "$PERMISSIONS_OUTPUT"
        echo "" >> "$PERMISSIONS_OUTPUT"
        
        print_fix "Setting recursive ownership to $WEB_USER:$WEB_GROUP for $PROJECT_PATH..."
        
        if chown -R "$WEB_USER:$WEB_GROUP" "$PROJECT_PATH" 2>/dev/null; then
            print_success "Recursive ownership fix completed"
            echo "✓ Recursive ownership fix completed" >> "$PERMISSIONS_OUTPUT"
        else
            print_error "Recursive ownership fix failed"
            echo "✗ Recursive ownership fix failed" >> "$PERMISSIONS_OUTPUT"
        fi
        
        # Set standard directory permissions
        print_fix "Setting directory permissions to 755..."
        if find "$PROJECT_PATH" -type d -exec chmod 755 {} \; 2>/dev/null; then
            print_success "Directory permissions set to 755"
            echo "✓ Directory permissions set to 755" >> "$PERMISSIONS_OUTPUT"
        else
            print_error "Failed to set directory permissions"
            echo "✗ Failed to set directory permissions" >> "$PERMISSIONS_OUTPUT"
        fi
        
        # Set standard file permissions
        print_fix "Setting file permissions to 644..."
        if find "$PROJECT_PATH" -type f -exec chmod 644 {} \; 2>/dev/null; then
            print_success "File permissions set to 644"
            echo "✓ File permissions set to 644" >> "$PERMISSIONS_OUTPUT"
        else
            print_error "Failed to set file permissions"
            echo "✗ Failed to set file permissions" >> "$PERMISSIONS_OUTPUT"
        fi
        
        # Make scripts executable
        print_fix "Making shell scripts executable..."
        if find "$PROJECT_PATH" -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null; then
            print_success "Shell scripts made executable"
            echo "✓ Shell scripts made executable" >> "$PERMISSIONS_OUTPUT"
        else
            print_warning "No shell scripts found or failed to make executable"
            echo "⚠ No shell scripts found or failed to make executable" >> "$PERMISSIONS_OUTPUT"
        fi
        
        # Secure environment files
        print_fix "Securing environment files..."
        local env_files=$(find "$PROJECT_PATH" -name ".env*" -type f 2>/dev/null)
        if [ -n "$env_files" ]; then
            while IFS= read -r env_file; do
                if chmod 600 "$env_file" 2>/dev/null; then
                    print_success "Secured $env_file"
                    echo "✓ Secured $env_file" >> "$PERMISSIONS_OUTPUT"
                else
                    print_error "Failed to secure $env_file"
                    echo "✗ Failed to secure $env_file" >> "$PERMISSIONS_OUTPUT"
                fi
            done <<< "$env_files"
        fi
        
        echo "" >> "$PERMISSIONS_OUTPUT"
    fi
}

# Function to generate recommendations
generate_permissions_recommendations() {
    print_header "Generating permissions recommendations..."
    
    echo "Permissions Recommendations" >> "$PERMISSIONS_OUTPUT"
    echo "==========================" >> "$PERMISSIONS_OUTPUT"
    echo "" >> "$PERMISSIONS_OUTPUT"
    
    # Read the permissions file to generate recommendations
    if [ -f "$PERMISSIONS_OUTPUT" ]; then
        # Check for common issues and provide recommendations
        if grep -q "Incorrect owner\|Incorrect group\|Incorrect permissions" "$PERMISSIONS_OUTPUT"; then
            echo "🔧 Permission Issues Detected:" >> "$PERMISSIONS_OUTPUT"
            echo "   - Run this script with --fix to automatically correct permissions" >> "$PERMISSIONS_OUTPUT"
            echo "   - Manual fix: chown -R $WEB_USER:$WEB_GROUP $PROJECT_PATH" >> "$PERMISSIONS_OUTPUT"
            echo "   - Manual fix: find $PROJECT_PATH -type d -exec chmod 755 {} \\;" >> "$PERMISSIONS_OUTPUT"
            echo "   - Manual fix: find $PROJECT_PATH -type f -exec chmod 644 {} \\;" >> "$PERMISSIONS_OUTPUT"
            echo "" >> "$PERMISSIONS_OUTPUT"
        fi
        
        if grep -q "Not executable" "$PERMISSIONS_OUTPUT"; then
            echo "🔧 Executable Issues Detected:" >> "$PERMISSIONS_OUTPUT"
            echo "   - Make scripts executable: find $PROJECT_PATH -name '*.sh' -exec chmod +x {} \\;" >> "$PERMISSIONS_OUTPUT"
            echo "   - Check if scripts are needed for deployment" >> "$PERMISSIONS_OUTPUT"
            echo "" >> "$PERMISSIONS_OUTPUT"
        fi
        
        if grep -q "missing\|not found" "$PERMISSIONS_OUTPUT"; then
            echo "🔧 Missing Files/Directories:" >> "$PERMISSIONS_OUTPUT"
            echo "   - Create missing directories if needed" >> "$PERMISSIONS_OUTPUT"
            echo "   - Verify deployment completed successfully" >> "$PERMISSIONS_OUTPUT"
            echo "   - Check if missing files are optional" >> "$PERMISSIONS_OUTPUT"
            echo "" >> "$PERMISSIONS_OUTPUT"
        fi
        
        # General recommendations
        echo "📋 General Permissions Best Practices:" >> "$PERMISSIONS_OUTPUT"
        echo "   - Regular permission audits for security" >> "$PERMISSIONS_OUTPUT"
        echo "   - Use specific users/groups for different services" >> "$PERMISSIONS_OUTPUT"
        echo "   - Secure sensitive files (600 for .env files)" >> "$PERMISSIONS_OUTPUT"
        echo "   - Standard permissions: 755 for directories, 644 for files" >> "$PERMISSIONS_OUTPUT"
        echo "   - Make only necessary files executable" >> "$PERMISSIONS_OUTPUT"
        echo "" >> "$PERMISSIONS_OUTPUT"
    fi
}

# Function to show summary
show_permissions_summary() {
    print_header "Permissions Check Summary"
    
    if [ -f "$PERMISSIONS_OUTPUT" ]; then
        # Count total issues found
        local total_errors=$(grep -c "✗\|ERROR" "$PERMISSIONS_OUTPUT" 2>/dev/null || echo "0")
        local total_warnings=$(grep -c "⚠\|WARNING\|Incorrect" "$PERMISSIONS_OUTPUT" 2>/dev/null || echo "0")
        local total_success=$(grep -c "✓\|SUCCESS\|Correct" "$PERMISSIONS_OUTPUT" 2>/dev/null || echo "0")
        local total_fixes=$(grep -c "Fixed\|Made executable\|Secured" "$PERMISSIONS_OUTPUT" 2>/dev/null || echo "0")
        
        echo ""
        print_info "Permissions check completed. Report saved to: $PERMISSIONS_OUTPUT"
        
        if [ "$total_errors" -gt 0 ]; then
            print_error "Found $total_errors critical permission issues"
        fi
        
        if [ "$total_warnings" -gt 0 ]; then
            print_warning "Found $total_warnings permission warnings"
        fi
        
        if [ "$total_success" -gt 0 ]; then
            print_success "Found $total_success items with correct permissions"
        fi
        
        if [ "$FIX_PERMISSIONS" = true ] && [ "$total_fixes" -gt 0 ]; then
            print_success "Applied $total_fixes permission fixes"
        fi
        
        if [ "$total_errors" -eq 0 ] && [ "$total_warnings" -eq 0 ]; then
            print_success "All file permissions appear to be correct"
        elif [ "$FIX_PERMISSIONS" = false ] && [ "$total_warnings" -gt 0 ]; then
            print_info "Run with --fix to automatically correct permission issues"
        fi
        
        echo ""
        print_info "To view the full report: cat $PERMISSIONS_OUTPUT"
        print_info "To fix permissions: $0 --fix"
    else
        print_error "Permissions check report could not be generated"
    fi
}

# Main execution
main() {
    echo "========================================"
    echo "The Lodge Family - File Permissions Check"
    echo "========================================"
    echo "Checking file permissions and ownership..."
    echo ""
    
    if [ "$FIX_PERMISSIONS" = true ]; then
        print_info "Fix mode enabled - will attempt to correct issues"
    else
        print_info "Check mode - will only report issues"
    fi
    echo ""
    
    # Create permissions report
    create_report_header
    
    # Check prerequisites
    if ! check_prerequisites; then
        print_error "Prerequisites check failed. Cannot continue."
        exit 1
    fi
    
    # Run permission checks
    local total_issues=0
    
    check_main_directories
    total_issues=$((total_issues + $?))
    
    check_critical_files
    total_issues=$((total_issues + $?))
    
    check_executable_files
    total_issues=$((total_issues + $?))
    
    check_log_permissions
    total_issues=$((total_issues + $?))
    
    check_storage_permissions
    total_issues=$((total_issues + $?))
    
    # Apply recursive fix if requested
    fix_recursive_ownership
    
    # Generate recommendations
    generate_permissions_recommendations
    
    # Show summary
    show_permissions_summary
    
    echo "========================================"
    
    # Exit with appropriate code
    if [ "$total_issues" -gt 0 ] && [ "$FIX_PERMISSIONS" = false ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"