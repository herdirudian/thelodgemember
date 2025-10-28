#!/bin/bash

# The Lodge Family - SSL/HTTPS Verification Script
# This script verifies SSL certificate configuration and HTTPS setup

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="thelodgefamily.com"
SUBDOMAIN="www.thelodgefamily.com"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
NGINX_CONFIG="/etc/nginx/sites-available/thelodgefamily"
VERIFICATION_OUTPUT="/tmp/ssl-verification-report.txt"

# Function to print colored output
print_header() {
    echo -e "${CYAN}[SSL CHECK]${NC} $1"
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

# Function to create verification report header
create_report_header() {
    cat > "$VERIFICATION_OUTPUT" << EOF
The Lodge Family - SSL/HTTPS Verification Report
===============================================
Generated: $(date)
Server: $(hostname)
Domain: $DOMAIN
Subdomain: $SUBDOMAIN

EOF
}

# Function to check certificate files
check_certificate_files() {
    print_header "Checking SSL certificate files..."
    
    echo "Certificate Files Check" >> "$VERIFICATION_OUTPUT"
    echo "======================" >> "$VERIFICATION_OUTPUT"
    echo "" >> "$VERIFICATION_OUTPUT"
    
    local cert_files=(
        "cert.pem"
        "chain.pem"
        "fullchain.pem"
        "privkey.pem"
    )
    
    local all_files_exist=true
    
    for file in "${cert_files[@]}"; do
        local file_path="$CERT_PATH/$file"
        
        if [ -f "$file_path" ]; then
            local file_size=$(stat -c%s "$file_path" 2>/dev/null || echo "0")
            local file_perms=$(stat -c%a "$file_path" 2>/dev/null || echo "unknown")
            local file_owner=$(stat -c%U:%G "$file_path" 2>/dev/null || echo "unknown")
            
            print_success "Found $file ($file_size bytes, $file_perms, $file_owner)"
            echo "✓ $file: EXISTS ($file_size bytes, permissions: $file_perms, owner: $file_owner)" >> "$VERIFICATION_OUTPUT"
            
            # Check file permissions
            if [ "$file" = "privkey.pem" ]; then
                if [ "$file_perms" != "600" ] && [ "$file_perms" != "640" ]; then
                    print_warning "Private key permissions should be 600 or 640, found: $file_perms"
                    echo "  WARNING: Insecure permissions on private key" >> "$VERIFICATION_OUTPUT"
                fi
            fi
        else
            print_error "Missing $file"
            echo "✗ $file: MISSING" >> "$VERIFICATION_OUTPUT"
            all_files_exist=false
        fi
    done
    
    echo "" >> "$VERIFICATION_OUTPUT"
    
    if [ "$all_files_exist" = true ]; then
        print_success "All SSL certificate files are present"
        return 0
    else
        print_error "Some SSL certificate files are missing"
        return 1
    fi
}

# Function to verify certificate validity
verify_certificate_validity() {
    print_header "Verifying certificate validity..."
    
    echo "Certificate Validity Check" >> "$VERIFICATION_OUTPUT"
    echo "=========================" >> "$VERIFICATION_OUTPUT"
    echo "" >> "$VERIFICATION_OUTPUT"
    
    if [ -f "$CERT_PATH/cert.pem" ]; then
        # Get certificate information
        local cert_info=$(openssl x509 -in "$CERT_PATH/cert.pem" -text -noout 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            # Extract key information
            local subject=$(echo "$cert_info" | grep "Subject:" | sed 's/.*Subject: //')
            local issuer=$(echo "$cert_info" | grep "Issuer:" | sed 's/.*Issuer: //')
            local not_before=$(echo "$cert_info" | grep "Not Before:" | sed 's/.*Not Before: //')
            local not_after=$(echo "$cert_info" | grep "Not After:" | sed 's/.*Not After: //')
            local san=$(echo "$cert_info" | grep -A1 "Subject Alternative Name:" | tail -1 | sed 's/.*DNS://' | tr ',' '\n' | sed 's/^ *//')
            
            echo "Certificate Information:" >> "$VERIFICATION_OUTPUT"
            echo "Subject: $subject" >> "$VERIFICATION_OUTPUT"
            echo "Issuer: $issuer" >> "$VERIFICATION_OUTPUT"
            echo "Valid From: $not_before" >> "$VERIFICATION_OUTPUT"
            echo "Valid Until: $not_after" >> "$VERIFICATION_OUTPUT"
            echo "" >> "$VERIFICATION_OUTPUT"
            
            print_info "Certificate issued by: $(echo "$issuer" | sed 's/.*CN=//' | sed 's/,.*//')"
            print_info "Valid until: $not_after"
            
            # Check if certificate is expired
            local expiry_date=$(date -d "$not_after" +%s 2>/dev/null)
            local current_date=$(date +%s)
            
            if [ -n "$expiry_date" ] && [ "$expiry_date" -gt "$current_date" ]; then
                local days_until_expiry=$(( (expiry_date - current_date) / 86400 ))
                print_success "Certificate is valid ($days_until_expiry days remaining)"
                echo "✓ Certificate is valid ($days_until_expiry days remaining)" >> "$VERIFICATION_OUTPUT"
                
                if [ "$days_until_expiry" -lt 30 ]; then
                    print_warning "Certificate expires in less than 30 days!"
                    echo "  WARNING: Certificate expires soon" >> "$VERIFICATION_OUTPUT"
                fi
            else
                print_error "Certificate has expired!"
                echo "✗ Certificate has expired" >> "$VERIFICATION_OUTPUT"
            fi
            
            # Check Subject Alternative Names
            if [ -n "$san" ]; then
                echo "Subject Alternative Names:" >> "$VERIFICATION_OUTPUT"
                echo "$san" | while read -r domain_name; do
                    if [ -n "$domain_name" ]; then
                        echo "- $domain_name" >> "$VERIFICATION_OUTPUT"
                        if [ "$domain_name" = "$DOMAIN" ] || [ "$domain_name" = "$SUBDOMAIN" ]; then
                            print_success "Domain $domain_name is covered by certificate"
                        fi
                    fi
                done
                echo "" >> "$VERIFICATION_OUTPUT"
            fi
            
        else
            print_error "Could not read certificate file"
            echo "✗ Could not read certificate file" >> "$VERIFICATION_OUTPUT"
            return 1
        fi
    else
        print_error "Certificate file not found"
        echo "✗ Certificate file not found" >> "$VERIFICATION_OUTPUT"
        return 1
    fi
}

# Function to check certificate chain
verify_certificate_chain() {
    print_header "Verifying certificate chain..."
    
    echo "Certificate Chain Verification" >> "$VERIFICATION_OUTPUT"
    echo "=============================" >> "$VERIFICATION_OUTPUT"
    echo "" >> "$VERIFICATION_OUTPUT"
    
    if [ -f "$CERT_PATH/fullchain.pem" ]; then
        # Verify the certificate chain
        local chain_verify=$(openssl verify -CAfile "$CERT_PATH/chain.pem" "$CERT_PATH/cert.pem" 2>&1)
        
        if echo "$chain_verify" | grep -q "OK"; then
            print_success "Certificate chain is valid"
            echo "✓ Certificate chain is valid" >> "$VERIFICATION_OUTPUT"
        else
            print_error "Certificate chain verification failed"
            echo "✗ Certificate chain verification failed" >> "$VERIFICATION_OUTPUT"
            echo "Error: $chain_verify" >> "$VERIFICATION_OUTPUT"
        fi
        
        # Check if fullchain contains both cert and intermediate
        local cert_count=$(grep -c "BEGIN CERTIFICATE" "$CERT_PATH/fullchain.pem")
        echo "Certificates in fullchain: $cert_count" >> "$VERIFICATION_OUTPUT"
        
        if [ "$cert_count" -ge 2 ]; then
            print_success "Fullchain contains certificate and intermediate(s)"
        else
            print_warning "Fullchain may be incomplete (only $cert_count certificate(s) found)"
        fi
        
    else
        print_error "Fullchain file not found"
        echo "✗ Fullchain file not found" >> "$VERIFICATION_OUTPUT"
    fi
    
    echo "" >> "$VERIFICATION_OUTPUT"
}

# Function to check Nginx SSL configuration
check_nginx_ssl_config() {
    print_header "Checking Nginx SSL configuration..."
    
    echo "Nginx SSL Configuration Check" >> "$VERIFICATION_OUTPUT"
    echo "=============================" >> "$VERIFICATION_OUTPUT"
    echo "" >> "$VERIFICATION_OUTPUT"
    
    if [ -f "$NGINX_CONFIG" ]; then
        local ssl_cert_line=$(grep "ssl_certificate " "$NGINX_CONFIG" | grep -v "#")
        local ssl_key_line=$(grep "ssl_certificate_key " "$NGINX_CONFIG" | grep -v "#")
        local ssl_protocols=$(grep "ssl_protocols " "$NGINX_CONFIG" | grep -v "#")
        local ssl_ciphers=$(grep "ssl_ciphers " "$NGINX_CONFIG" | grep -v "#")
        
        echo "Nginx SSL Configuration:" >> "$VERIFICATION_OUTPUT"
        
        if [ -n "$ssl_cert_line" ]; then
            echo "Certificate: $ssl_cert_line" >> "$VERIFICATION_OUTPUT"
            local cert_file=$(echo "$ssl_cert_line" | awk '{print $2}' | sed 's/;//')
            
            if [ -f "$cert_file" ]; then
                print_success "SSL certificate file configured and exists"
            else
                print_error "SSL certificate file configured but missing: $cert_file"
            fi
        else
            print_error "SSL certificate not configured in Nginx"
            echo "✗ SSL certificate not configured" >> "$VERIFICATION_OUTPUT"
        fi
        
        if [ -n "$ssl_key_line" ]; then
            echo "Private Key: $ssl_key_line" >> "$VERIFICATION_OUTPUT"
            local key_file=$(echo "$ssl_key_line" | awk '{print $2}' | sed 's/;//')
            
            if [ -f "$key_file" ]; then
                print_success "SSL private key file configured and exists"
            else
                print_error "SSL private key file configured but missing: $key_file"
            fi
        else
            print_error "SSL private key not configured in Nginx"
            echo "✗ SSL private key not configured" >> "$VERIFICATION_OUTPUT"
        fi
        
        if [ -n "$ssl_protocols" ]; then
            echo "Protocols: $ssl_protocols" >> "$VERIFICATION_OUTPUT"
            if echo "$ssl_protocols" | grep -q "TLSv1.2\|TLSv1.3"; then
                print_success "Modern SSL protocols configured"
            else
                print_warning "Consider updating SSL protocols to TLSv1.2 and TLSv1.3"
            fi
        else
            print_warning "SSL protocols not explicitly configured"
        fi
        
        # Check for security headers
        local hsts=$(grep "Strict-Transport-Security" "$NGINX_CONFIG" | grep -v "#")
        if [ -n "$hsts" ]; then
            print_success "HSTS header configured"
            echo "✓ HSTS configured: $hsts" >> "$VERIFICATION_OUTPUT"
        else
            print_warning "HSTS header not configured"
            echo "⚠ HSTS not configured" >> "$VERIFICATION_OUTPUT"
        fi
        
        # Check for HTTP to HTTPS redirect
        local redirect=$(grep -E "return 301|rewrite.*https" "$NGINX_CONFIG" | grep -v "#")
        if [ -n "$redirect" ]; then
            print_success "HTTP to HTTPS redirect configured"
            echo "✓ HTTP redirect configured" >> "$VERIFICATION_OUTPUT"
        else
            print_warning "HTTP to HTTPS redirect not found"
            echo "⚠ HTTP redirect not configured" >> "$VERIFICATION_OUTPUT"
        fi
        
    else
        print_error "Nginx configuration file not found: $NGINX_CONFIG"
        echo "✗ Nginx configuration file not found" >> "$VERIFICATION_OUTPUT"
    fi
    
    echo "" >> "$VERIFICATION_OUTPUT"
}

# Function to test HTTPS connectivity
test_https_connectivity() {
    print_header "Testing HTTPS connectivity..."
    
    echo "HTTPS Connectivity Test" >> "$VERIFICATION_OUTPUT"
    echo "======================" >> "$VERIFICATION_OUTPUT"
    echo "" >> "$VERIFICATION_OUTPUT"
    
    local domains=("$DOMAIN" "$SUBDOMAIN")
    
    for domain in "${domains[@]}"; do
        print_info "Testing $domain..."
        
        # Test HTTPS connection
        local https_test=$(curl -s -I --max-time 10 "https://$domain" 2>&1)
        local curl_exit_code=$?
        
        if [ $curl_exit_code -eq 0 ]; then
            local status_code=$(echo "$https_test" | head -1 | awk '{print $2}')
            print_success "$domain HTTPS is accessible (Status: $status_code)"
            echo "✓ $domain: HTTPS accessible (Status: $status_code)" >> "$VERIFICATION_OUTPUT"
            
            # Check for security headers
            if echo "$https_test" | grep -qi "strict-transport-security"; then
                echo "  ✓ HSTS header present" >> "$VERIFICATION_OUTPUT"
            else
                echo "  ⚠ HSTS header missing" >> "$VERIFICATION_OUTPUT"
            fi
            
        else
            print_error "$domain HTTPS is not accessible"
            echo "✗ $domain: HTTPS not accessible" >> "$VERIFICATION_OUTPUT"
            echo "  Error: $https_test" >> "$VERIFICATION_OUTPUT"
        fi
        
        # Test HTTP redirect
        local http_test=$(curl -s -I --max-time 10 "http://$domain" 2>&1)
        local http_exit_code=$?
        
        if [ $http_exit_code -eq 0 ]; then
            if echo "$http_test" | grep -q "301\|302"; then
                local redirect_location=$(echo "$http_test" | grep -i "location:" | awk '{print $2}' | tr -d '\r')
                if echo "$redirect_location" | grep -q "https://"; then
                    print_success "$domain HTTP redirects to HTTPS"
                    echo "  ✓ HTTP redirects to HTTPS: $redirect_location" >> "$VERIFICATION_OUTPUT"
                else
                    print_warning "$domain HTTP redirects but not to HTTPS: $redirect_location"
                    echo "  ⚠ HTTP redirects but not to HTTPS: $redirect_location" >> "$VERIFICATION_OUTPUT"
                fi
            else
                print_warning "$domain HTTP does not redirect to HTTPS"
                echo "  ⚠ HTTP does not redirect to HTTPS" >> "$VERIFICATION_OUTPUT"
            fi
        else
            print_error "$domain HTTP test failed"
            echo "  ✗ HTTP test failed" >> "$VERIFICATION_OUTPUT"
        fi
        
        echo "" >> "$VERIFICATION_OUTPUT"
    done
}

# Function to check SSL certificate with external tools
check_ssl_external() {
    print_header "Checking SSL with external validation..."
    
    echo "External SSL Validation" >> "$VERIFICATION_OUTPUT"
    echo "======================" >> "$VERIFICATION_OUTPUT"
    echo "" >> "$VERIFICATION_OUTPUT"
    
    # Test with openssl s_client
    print_info "Testing SSL handshake..."
    
    local ssl_handshake=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>&1)
    
    if echo "$ssl_handshake" | grep -q "Verify return code: 0"; then
        print_success "SSL handshake successful"
        echo "✓ SSL handshake successful" >> "$VERIFICATION_OUTPUT"
        
        # Extract SSL details
        local ssl_version=$(echo "$ssl_handshake" | grep "Protocol" | awk '{print $3}')
        local cipher=$(echo "$ssl_handshake" | grep "Cipher" | awk '{print $3}')
        
        if [ -n "$ssl_version" ]; then
            echo "  Protocol: $ssl_version" >> "$VERIFICATION_OUTPUT"
            print_info "SSL Protocol: $ssl_version"
        fi
        
        if [ -n "$cipher" ]; then
            echo "  Cipher: $cipher" >> "$VERIFICATION_OUTPUT"
            print_info "Cipher: $cipher"
        fi
        
    else
        print_error "SSL handshake failed"
        echo "✗ SSL handshake failed" >> "$VERIFICATION_OUTPUT"
        
        local verify_error=$(echo "$ssl_handshake" | grep "Verify return code:" | head -1)
        if [ -n "$verify_error" ]; then
            echo "  Error: $verify_error" >> "$VERIFICATION_OUTPUT"
            print_error "$verify_error"
        fi
    fi
    
    echo "" >> "$VERIFICATION_OUTPUT"
}

# Function to generate SSL recommendations
generate_ssl_recommendations() {
    print_header "Generating SSL recommendations..."
    
    echo "SSL Recommendations" >> "$VERIFICATION_OUTPUT"
    echo "==================" >> "$VERIFICATION_OUTPUT"
    echo "" >> "$VERIFICATION_OUTPUT"
    
    # Read the verification file to generate recommendations
    if [ -f "$VERIFICATION_OUTPUT" ]; then
        # Check for common issues and provide recommendations
        if grep -q "expired\|missing\|not found" "$VERIFICATION_OUTPUT"; then
            echo "🔧 Certificate Issues Detected:" >> "$VERIFICATION_OUTPUT"
            echo "   - Renew SSL certificate: certbot renew" >> "$VERIFICATION_OUTPUT"
            echo "   - Check certificate installation: certbot certificates" >> "$VERIFICATION_OUTPUT"
            echo "   - Verify domain ownership and DNS settings" >> "$VERIFICATION_OUTPUT"
            echo "" >> "$VERIFICATION_OUTPUT"
        fi
        
        if grep -q "not accessible\|handshake failed" "$VERIFICATION_OUTPUT"; then
            echo "🔧 HTTPS Connectivity Issues Detected:" >> "$VERIFICATION_OUTPUT"
            echo "   - Check Nginx configuration: nginx -t" >> "$VERIFICATION_OUTPUT"
            echo "   - Restart Nginx: systemctl restart nginx" >> "$VERIFICATION_OUTPUT"
            echo "   - Check firewall rules for port 443" >> "$VERIFICATION_OUTPUT"
            echo "   - Verify DNS A records point to correct IP" >> "$VERIFICATION_OUTPUT"
            echo "" >> "$VERIFICATION_OUTPUT"
        fi
        
        if grep -q "HSTS.*missing\|redirect.*not configured" "$VERIFICATION_OUTPUT"; then
            echo "🔧 Security Improvements Recommended:" >> "$VERIFICATION_OUTPUT"
            echo "   - Add HSTS header: add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;" >> "$VERIFICATION_OUTPUT"
            echo "   - Configure HTTP to HTTPS redirect" >> "$VERIFICATION_OUTPUT"
            echo "   - Add security headers (X-Frame-Options, X-Content-Type-Options, etc.)" >> "$VERIFICATION_OUTPUT"
            echo "" >> "$VERIFICATION_OUTPUT"
        fi
        
        if grep -q "expires.*soon\|expires in.*days" "$VERIFICATION_OUTPUT"; then
            echo "🔧 Certificate Renewal Needed:" >> "$VERIFICATION_OUTPUT"
            echo "   - Set up automatic renewal: crontab -e" >> "$VERIFICATION_OUTPUT"
            echo "   - Add: 0 12 * * * /usr/bin/certbot renew --quiet" >> "$VERIFICATION_OUTPUT"
            echo "   - Test renewal: certbot renew --dry-run" >> "$VERIFICATION_OUTPUT"
            echo "" >> "$VERIFICATION_OUTPUT"
        fi
        
        # General recommendations
        echo "📋 General SSL Best Practices:" >> "$VERIFICATION_OUTPUT"
        echo "   - Use strong SSL protocols (TLSv1.2, TLSv1.3 only)" >> "$VERIFICATION_OUTPUT"
        echo "   - Implement HSTS with includeSubDomains" >> "$VERIFICATION_OUTPUT"
        echo "   - Regular certificate monitoring and renewal" >> "$VERIFICATION_OUTPUT"
        echo "   - Use security headers for enhanced protection" >> "$VERIFICATION_OUTPUT"
        echo "   - Test SSL configuration with SSL Labs or similar tools" >> "$VERIFICATION_OUTPUT"
        echo "" >> "$VERIFICATION_OUTPUT"
    fi
}

# Function to show summary
show_ssl_summary() {
    print_header "SSL Verification Summary"
    
    if [ -f "$VERIFICATION_OUTPUT" ]; then
        # Count total issues found
        local total_errors=$(grep -c "✗\|ERROR\|failed" "$VERIFICATION_OUTPUT" 2>/dev/null || echo "0")
        local total_warnings=$(grep -c "⚠\|WARNING\|missing" "$VERIFICATION_OUTPUT" 2>/dev/null || echo "0")
        local total_success=$(grep -c "✓\|SUCCESS" "$VERIFICATION_OUTPUT" 2>/dev/null || echo "0")
        
        echo ""
        print_info "SSL verification completed. Report saved to: $VERIFICATION_OUTPUT"
        
        if [ "$total_errors" -gt 0 ]; then
            print_error "Found $total_errors critical SSL issues that need attention"
        fi
        
        if [ "$total_warnings" -gt 0 ]; then
            print_warning "Found $total_warnings SSL warnings to review"
        fi
        
        if [ "$total_success" -gt 0 ]; then
            print_success "Found $total_success SSL components working correctly"
        fi
        
        if [ "$total_errors" -eq 0 ] && [ "$total_warnings" -eq 0 ]; then
            print_success "SSL/HTTPS configuration appears to be working correctly"
        fi
        
        echo ""
        print_info "To view the full report: cat $VERIFICATION_OUTPUT"
        print_info "To test SSL rating: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    else
        print_error "SSL verification report could not be generated"
    fi
}

# Main execution
main() {
    echo "========================================"
    echo "The Lodge Family - SSL/HTTPS Verification"
    echo "========================================"
    echo "Starting SSL certificate and HTTPS verification..."
    echo ""
    
    # Create verification report
    create_report_header
    
    # Run verification functions
    check_certificate_files
    verify_certificate_validity
    verify_certificate_chain
    check_nginx_ssl_config
    test_https_connectivity
    check_ssl_external
    
    # Generate recommendations
    generate_ssl_recommendations
    
    # Show summary
    show_ssl_summary
    
    echo "========================================"
}

# Check if running as root or with sudo for file access
if [ "$EUID" -ne 0 ]; then
    print_warning "Some certificate files may require root access. Consider running with sudo for complete verification."
    echo ""
fi

# Run main function
main "$@"