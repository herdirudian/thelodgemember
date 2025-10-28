#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy The Lodge Family application to VPS hosting
.DESCRIPTION
    This script automates the deployment process to VPS including:
    - File upload via SCP
    - Environment configuration
    - Service setup and start
    - SSL configuration
    - Health checks
.PARAMETER VPSHost
    VPS hostname or IP address
.PARAMETER VPSUser
    VPS username for SSH connection
.PARAMETER VPSPassword
    VPS password (optional, will prompt if not provided)
.PARAMETER DeploymentPath
    Path on VPS where application will be deployed (default: /var/www/html)
.PARAMETER SkipUpload
    Skip file upload step (useful for configuration-only deployments)
.PARAMETER TestOnly
    Run in test mode (no actual changes)
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$VPSHost = "family.thelodgegroup.id",
    
    [Parameter(Mandatory=$true)]
    [string]$VPSUser,
    
    [Parameter(Mandatory=$false)]
    [string]$VPSPassword,
    
    [Parameter(Mandatory=$false)]
    [string]$DeploymentPath = "/var/www/html",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipUpload,
    
    [Parameter(Mandatory=$false)]
    [switch]$TestOnly
)

# Configuration
$DeploymentPackage = "deployment-packages\thelodgefamily-final-deployment-20251027_210438"
$LocalPath = Get-Location
$LogFile = "deployment-log-$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Write to console with colors
    switch ($Level) {
        "SUCCESS" { Write-Host $logEntry -ForegroundColor $Colors.Success }
        "WARNING" { Write-Host $logEntry -ForegroundColor $Colors.Warning }
        "ERROR" { Write-Host $logEntry -ForegroundColor $Colors.Error }
        "INFO" { Write-Host $logEntry -ForegroundColor $Colors.Info }
        "HEADER" { Write-Host $logEntry -ForegroundColor $Colors.Header }
        default { Write-Host $logEntry }
    }
    
    # Write to log file
    Add-Content -Path $LogFile -Value $logEntry
}

function Test-Prerequisites {
    Write-Log "Checking deployment prerequisites..." "HEADER"
    
    # Check if deployment package exists
    if (-not (Test-Path $DeploymentPackage)) {
        Write-Log "Deployment package not found: $DeploymentPackage" "ERROR"
        return $false
    }
    Write-Log "Deployment package found: $DeploymentPackage" "SUCCESS"
    
    # Check for required tools
    $requiredTools = @("ssh", "scp", "rsync")
    foreach ($tool in $requiredTools) {
        try {
            $null = Get-Command $tool -ErrorAction Stop
            Write-Log "$tool is available" "SUCCESS"
        }
        catch {
            Write-Log "$tool is not available. Please install OpenSSH or Git Bash" "WARNING"
        }
    }
    
    return $true
}

function Connect-ToVPS {
    Write-Log "Testing VPS connection..." "HEADER"
    
    if (-not $VPSPassword) {
        $securePassword = Read-Host "Enter VPS password" -AsSecureString
        $VPSPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    }
    
    # Test SSH connection
    try {
        $testCommand = "echo 'Connection test successful'"
        if ($TestOnly) {
            Write-Log "TEST MODE: Would test SSH connection to $VPSUser@$VPSHost" "INFO"
            return $true
        }
        
        $result = ssh "$VPSUser@$VPSHost" $testCommand 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "SSH connection successful" "SUCCESS"
            return $true
        } else {
            Write-Log "SSH connection failed: $result" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "SSH connection error: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Upload-DeploymentPackage {
    if ($SkipUpload) {
        Write-Log "Skipping file upload as requested" "WARNING"
        return $true
    }
    
    Write-Log "Uploading deployment package to VPS..." "HEADER"
    
    if ($TestOnly) {
        Write-Log "TEST MODE: Would upload $DeploymentPackage to $VPSUser@$VPSHost:$DeploymentPath" "INFO"
        return $true
    }
    
    try {
        # Create backup of existing deployment
        Write-Log "Creating backup of existing deployment..." "INFO"
        $backupCommand = "sudo mkdir -p /backup && sudo cp -r $DeploymentPath /backup/backup-$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"
        ssh "$VPSUser@$VPSHost" $backupCommand
        
        # Upload new files
        Write-Log "Uploading files via rsync..." "INFO"
        $rsyncCommand = "rsync -avz --delete --exclude='.git' --exclude='node_modules' --exclude='*.log' '$DeploymentPackage/' '$VPSUser@$VPSHost:$DeploymentPath/'"
        
        Invoke-Expression $rsyncCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "File upload completed successfully" "SUCCESS"
            return $true
        } else {
            Write-Log "File upload failed with exit code: $LASTEXITCODE" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Upload error: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Setup-VPSEnvironment {
    Write-Log "Setting up VPS environment..." "HEADER"
    
    $setupCommands = @(
        "sudo apt update && sudo apt upgrade -y",
        "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
        "sudo apt install -y nodejs nginx mysql-server",
        "sudo npm install -g pm2",
        "sudo systemctl enable nginx",
        "sudo systemctl enable mysql",
        "sudo systemctl start nginx",
        "sudo systemctl start mysql"
    )
    
    foreach ($command in $setupCommands) {
        Write-Log "Executing: $command" "INFO"
        
        if ($TestOnly) {
            Write-Log "TEST MODE: Would execute: $command" "INFO"
            continue
        }
        
        try {
            ssh "$VPSUser@$VPSHost" $command
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Command executed successfully" "SUCCESS"
            } else {
                Write-Log "Command failed with exit code: $LASTEXITCODE" "WARNING"
            }
        }
        catch {
            Write-Log "Command execution error: $($_.Exception.Message)" "ERROR"
        }
    }
}

function Install-Dependencies {
    Write-Log "Installing application dependencies..." "HEADER"
    
    $installCommands = @(
        "cd $DeploymentPath/backend && npm install --production",
        "cd $DeploymentPath/frontend && npm install --production",
        "cd $DeploymentPath/backend && npx prisma generate",
        "cd $DeploymentPath/backend && npx prisma migrate deploy"
    )
    
    foreach ($command in $installCommands) {
        Write-Log "Executing: $command" "INFO"
        
        if ($TestOnly) {
            Write-Log "TEST MODE: Would execute: $command" "INFO"
            continue
        }
        
        try {
            ssh "$VPSUser@$VPSHost" $command
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Dependencies installed successfully" "SUCCESS"
            } else {
                Write-Log "Dependency installation failed" "WARNING"
            }
        }
        catch {
            Write-Log "Dependency installation error: $($_.Exception.Message)" "ERROR"
        }
    }
}

function Configure-Services {
    Write-Log "Configuring services..." "HEADER"
    
    $configCommands = @(
        "sudo cp $DeploymentPath/nginx-family-domain-fixed.conf /etc/nginx/sites-available/family.thelodgegroup.id",
        "sudo ln -sf /etc/nginx/sites-available/family.thelodgegroup.id /etc/nginx/sites-enabled/",
        "sudo rm -f /etc/nginx/sites-enabled/default",
        "sudo nginx -t",
        "sudo systemctl reload nginx",
        "sudo chown -R www-data:www-data $DeploymentPath",
        "sudo chmod -R 755 $DeploymentPath",
        "sudo chmod -R 777 $DeploymentPath/backend/public/files"
    )
    
    foreach ($command in $configCommands) {
        Write-Log "Executing: $command" "INFO"
        
        if ($TestOnly) {
            Write-Log "TEST MODE: Would execute: $command" "INFO"
            continue
        }
        
        try {
            ssh "$VPSUser@$VPSHost" $command
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Service configuration successful" "SUCCESS"
            } else {
                Write-Log "Service configuration warning" "WARNING"
            }
        }
        catch {
            Write-Log "Service configuration error: $($_.Exception.Message)" "ERROR"
        }
    }
}

function Deploy-Application {
    Write-Log "Deploying application with PM2..." "HEADER"
    
    $deployCommands = @(
        "cd $DeploymentPath && pm2 stop all || true",
        "cd $DeploymentPath && pm2 delete all || true",
        "cd $DeploymentPath && pm2 start ecosystem.config.js",
        "pm2 save",
        "pm2 startup | tail -1 | sudo bash || true"
    )
    
    foreach ($command in $deployCommands) {
        Write-Log "Executing: $command" "INFO"
        
        if ($TestOnly) {
            Write-Log "TEST MODE: Would execute: $command" "INFO"
            continue
        }
        
        try {
            ssh "$VPSUser@$VPSHost" $command
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Application deployment successful" "SUCCESS"
            } else {
                Write-Log "Application deployment warning" "WARNING"
            }
        }
        catch {
            Write-Log "Application deployment error: $($_.Exception.Message)" "ERROR"
        }
    }
}

function Setup-SSL {
    Write-Log "Setting up SSL certificate..." "HEADER"
    
    $sslCommands = @(
        "sudo apt install -y certbot python3-certbot-nginx",
        "sudo certbot --nginx -d family.thelodgegroup.id --non-interactive --agree-tos --email admin@thelodgegroup.id || true",
        "sudo systemctl reload nginx"
    )
    
    foreach ($command in $sslCommands) {
        Write-Log "Executing: $command" "INFO"
        
        if ($TestOnly) {
            Write-Log "TEST MODE: Would execute: $command" "INFO"
            continue
        }
        
        try {
            ssh "$VPSUser@$VPSHost" $command
            if ($LASTEXITCODE -eq 0) {
                Write-Log "SSL setup successful" "SUCCESS"
            } else {
                Write-Log "SSL setup warning (may already be configured)" "WARNING"
            }
        }
        catch {
            Write-Log "SSL setup error: $($_.Exception.Message)" "ERROR"
        }
    }
}

function Test-Deployment {
    Write-Log "Testing deployment..." "HEADER"
    
    # Test endpoints
    $endpoints = @(
        "http://family.thelodgegroup.id",
        "https://family.thelodgegroup.id",
        "https://family.thelodgegroup.id/api/health"
    )
    
    foreach ($endpoint in $endpoints) {
        Write-Log "Testing endpoint: $endpoint" "INFO"
        
        try {
            $response = Invoke-WebRequest -Uri $endpoint -TimeoutSec 10 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Log "Endpoint $endpoint is responding correctly" "SUCCESS"
            } else {
                Write-Log "Endpoint $endpoint returned status: $($response.StatusCode)" "WARNING"
            }
        }
        catch {
            Write-Log "Endpoint $endpoint failed: $($_.Exception.Message)" "ERROR"
        }
    }
    
    # Check PM2 status
    Write-Log "Checking PM2 process status..." "INFO"
    try {
        $pm2Status = ssh "$VPSUser@$VPSHost" "pm2 status"
        Write-Log "PM2 Status: $pm2Status" "INFO"
    }
    catch {
        Write-Log "Failed to get PM2 status" "WARNING"
    }
}

function Show-DeploymentSummary {
    Write-Log "Deployment Summary" "HEADER"
    Write-Log "===========================================" "INFO"
    Write-Log "VPS Host: $VPSHost" "INFO"
    Write-Log "Deployment Path: $DeploymentPath" "INFO"
    Write-Log "Log File: $LogFile" "INFO"
    Write-Log "===========================================" "INFO"
    Write-Log "Application URLs:" "INFO"
    Write-Log "- Frontend: https://family.thelodgegroup.id" "INFO"
    Write-Log "- API Health: https://family.thelodgegroup.id/api/health" "INFO"
    Write-Log "- Admin Panel: https://family.thelodgegroup.id/admin" "INFO"
    Write-Log "===========================================" "INFO"
    Write-Log "Next Steps:" "INFO"
    Write-Log "1. Test all application features" "INFO"
    Write-Log "2. Monitor logs: ssh $VPSUser@$VPSHost 'pm2 logs'" "INFO"
    Write-Log "3. Check system status: ssh $VPSUser@$VPSHost 'pm2 status'" "INFO"
    Write-Log "4. Review deployment log: $LogFile" "INFO"
    Write-Log "===========================================" "INFO"
}

# Main deployment process
try {
    Write-Log "Starting The Lodge Family VPS Deployment" "HEADER"
    Write-Log "===========================================" "INFO"
    
    if (-not (Test-Prerequisites)) {
        Write-Log "Prerequisites check failed. Aborting deployment." "ERROR"
        exit 1
    }
    
    if (-not (Connect-ToVPS)) {
        Write-Log "VPS connection failed. Aborting deployment." "ERROR"
        exit 1
    }
    
    if (-not (Upload-DeploymentPackage)) {
        Write-Log "File upload failed. Aborting deployment." "ERROR"
        exit 1
    }
    
    Setup-VPSEnvironment
    Install-Dependencies
    Configure-Services
    Deploy-Application
    Setup-SSL
    Test-Deployment
    
    Show-DeploymentSummary
    
    Write-Log "Deployment completed successfully!" "SUCCESS"
    
} catch {
    Write-Log "Deployment failed with error: $($_.Exception.Message)" "ERROR"
    Write-Log "Check the log file for details: $LogFile" "ERROR"
    exit 1
}