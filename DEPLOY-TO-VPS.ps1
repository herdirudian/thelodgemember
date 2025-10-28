# The Lodge Family - VPS Deployment Script
# PowerShell script for automated deployment to VPS

param(
    [Parameter(Mandatory=$true)]
    [string]$VPSHost = "family.thelodgegroup.id",
    
    [Parameter(Mandatory=$true)]
    [string]$VPSUser,
    
    [string]$VPSPort = "22",
    
    [string]$DeploymentPath = "/var/www/html",
    
    [switch]$TestOnly = $false,
    
    [switch]$SkipBackup = $false,
    
    [switch]$Verbose = $false
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# Paths
$ProjectRoot = $PSScriptRoot
$DeploymentPackage = Join-Path $ProjectRoot "deployment-packages\thelodgefamily-final-deployment-20251027_210438"
$LogFile = Join-Path $ProjectRoot "deployment-$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Header = "Magenta"
}

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    
    Write-Host $LogMessage -ForegroundColor $Color
    Add-Content -Path $LogFile -Value $LogMessage
}

# Header
function Show-Header {
    Write-Host "`n" + "="*80 -ForegroundColor $Colors.Header
    Write-Host "  THE LODGE FAMILY - VPS DEPLOYMENT SCRIPT" -ForegroundColor $Colors.Header
    Write-Host "="*80 -ForegroundColor $Colors.Header
    Write-Host "  Target VPS: $VPSHost" -ForegroundColor $Colors.Info
    Write-Host "  User: $VPSUser" -ForegroundColor $Colors.Info
    Write-Host "  Deployment Path: $DeploymentPath" -ForegroundColor $Colors.Info
    Write-Host "  Test Mode: $TestOnly" -ForegroundColor $Colors.Info
    Write-Host "="*80 -ForegroundColor $Colors.Header
}

# Check prerequisites
function Test-Prerequisites {
    Write-Log "Checking prerequisites..." "INFO" $Colors.Info
    
    # Check if deployment package exists
    if (-not (Test-Path $DeploymentPackage)) {
        Write-Log "Deployment package not found: $DeploymentPackage" "ERROR" $Colors.Error
        throw "Deployment package not found"
    }
    
    # Check SSH connectivity
    Write-Log "Testing SSH connectivity to $VPSHost..." "INFO" $Colors.Info
    
    try {
        $sshTest = ssh -o ConnectTimeout=10 -o BatchMode=yes "$VPSUser@$VPSHost" "echo 'SSH connection successful'"
        if ($LASTEXITCODE -eq 0) {
            Write-Log "SSH connection successful" "SUCCESS" $Colors.Success
        } else {
            throw "SSH connection failed"
        }
    } catch {
        Write-Log "SSH connection failed: $_" "ERROR" $Colors.Error
        Write-Log "Please ensure:" "WARNING" $Colors.Warning
        Write-Log "1. SSH key is properly configured" "WARNING" $Colors.Warning
        Write-Log "2. VPS is accessible" "WARNING" $Colors.Warning
        Write-Log "3. Username is correct" "WARNING" $Colors.Warning
        throw "SSH connection failed"
    }
    
    # Check required tools
    $RequiredTools = @("ssh", "scp", "rsync")
    foreach ($tool in $RequiredTools) {
        try {
            Get-Command $tool -ErrorAction Stop | Out-Null
            Write-Log "$tool is available" "SUCCESS" $Colors.Success
        } catch {
            Write-Log "$tool is not available. Please install it." "ERROR" $Colors.Error
            throw "$tool is required but not found"
        }
    }
}

# Backup current deployment
function Backup-CurrentDeployment {
    if ($SkipBackup) {
        Write-Log "Skipping backup as requested" "WARNING" $Colors.Warning
        return
    }
    
    Write-Log "Creating backup of current deployment..." "INFO" $Colors.Info
    
    $BackupDir = "/backup/backup-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    
    $BackupCommands = @(
        "sudo mkdir -p $BackupDir",
        "sudo cp -r $DeploymentPath/* $BackupDir/ 2>/dev/null || true",
        "sudo chown -R $VPSUser:$VPSUser $BackupDir",
        "echo 'Backup created at: $BackupDir'"
    )
    
    foreach ($cmd in $BackupCommands) {
        if (-not $TestOnly) {
            ssh "$VPSUser@$VPSHost" $cmd
            if ($LASTEXITCODE -ne 0) {
                Write-Log "Backup command failed: $cmd" "WARNING" $Colors.Warning
            }
        } else {
            Write-Log "TEST: Would run: $cmd" "INFO" $Colors.Info
        }
    }
    
    Write-Log "Backup completed" "SUCCESS" $Colors.Success
}

# Upload deployment package
function Upload-DeploymentPackage {
    Write-Log "Uploading deployment package..." "INFO" $Colors.Info
    
    if (-not $TestOnly) {
        # Create deployment directory
        ssh "$VPSUser@$VPSHost" "sudo mkdir -p $DeploymentPath && sudo chown -R $VPSUser:$VPSUser $DeploymentPath"
        
        # Upload files using rsync
        Write-Log "Uploading files with rsync..." "INFO" $Colors.Info
        rsync -avz --delete --progress "$DeploymentPackage/" "$VPSUser@${VPSHost}:$DeploymentPath/"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "File upload completed successfully" "SUCCESS" $Colors.Success
        } else {
            throw "File upload failed"
        }
    } else {
        Write-Log "TEST: Would upload $DeploymentPackage to $VPSUser@${VPSHost}:$DeploymentPath" "INFO" $Colors.Info
    }
}

# Setup environment
function Setup-Environment {
    Write-Log "Setting up environment..." "INFO" $Colors.Info
    
    $SetupCommands = @(
        # Update system
        "sudo apt update",
        
        # Install Node.js 18.x
        "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
        "sudo apt install -y nodejs",
        
        # Install required services
        "sudo apt install -y nginx mysql-server",
        "sudo npm install -g pm2",
        
        # Enable services
        "sudo systemctl enable nginx mysql",
        "sudo systemctl start nginx mysql",
        
        # Set proper permissions
        "sudo chown -R www-data:www-data $DeploymentPath",
        "sudo chmod -R 755 $DeploymentPath"
    )
    
    foreach ($cmd in $SetupCommands) {
        Write-Log "Running: $cmd" "INFO" $Colors.Info
        
        if (-not $TestOnly) {
            ssh "$VPSUser@$VPSHost" $cmd
            if ($LASTEXITCODE -ne 0) {
                Write-Log "Command failed: $cmd" "WARNING" $Colors.Warning
            }
        } else {
            Write-Log "TEST: Would run: $cmd" "INFO" $Colors.Info
        }
    }
}

# Configure database
function Configure-Database {
    Write-Log "Configuring database..." "INFO" $Colors.Info
    
    $DatabaseCommands = @(
        "cd $DeploymentPath/backend",
        "cp .env.production .env",
        "npm install --production",
        "npx prisma generate",
        "npx prisma migrate deploy"
    )
    
    foreach ($cmd in $DatabaseCommands) {
        Write-Log "Running: $cmd" "INFO" $Colors.Info
        
        if (-not $TestOnly) {
            ssh "$VPSUser@$VPSHost" $cmd
            if ($LASTEXITCODE -ne 0) {
                Write-Log "Database command failed: $cmd" "WARNING" $Colors.Warning
            }
        } else {
            Write-Log "TEST: Would run: $cmd" "INFO" $Colors.Info
        }
    }
}

# Build frontend
function Build-Frontend {
    Write-Log "Building frontend..." "INFO" $Colors.Info
    
    $FrontendCommands = @(
        "cd $DeploymentPath/frontend",
        "cp .env.production .env.local",
        "npm install --production",
        "npm run build"
    )
    
    foreach ($cmd in $FrontendCommands) {
        Write-Log "Running: $cmd" "INFO" $Colors.Info
        
        if (-not $TestOnly) {
            ssh "$VPSUser@$VPSHost" $cmd
            if ($LASTEXITCODE -ne 0) {
                Write-Log "Frontend command failed: $cmd" "WARNING" $Colors.Warning
            }
        } else {
            Write-Log "TEST: Would run: $cmd" "INFO" $Colors.Info
        }
    }
}

# Configure Nginx
function Configure-Nginx {
    Write-Log "Configuring Nginx..." "INFO" $Colors.Info
    
    $NginxCommands = @(
        "sudo cp $DeploymentPath/nginx-family-domain-fixed.conf /etc/nginx/sites-available/family.thelodgegroup.id",
        "sudo ln -sf /etc/nginx/sites-available/family.thelodgegroup.id /etc/nginx/sites-enabled/",
        "sudo rm -f /etc/nginx/sites-enabled/default",
        "sudo nginx -t",
        "sudo systemctl reload nginx"
    )
    
    foreach ($cmd in $NginxCommands) {
        Write-Log "Running: $cmd" "INFO" $Colors.Info
        
        if (-not $TestOnly) {
            ssh "$VPSUser@$VPSHost" $cmd
            if ($LASTEXITCODE -ne 0) {
                Write-Log "Nginx command failed: $cmd" "WARNING" $Colors.Warning
            }
        } else {
            Write-Log "TEST: Would run: $cmd" "INFO" $Colors.Info
        }
    }
}

# Setup SSL
function Setup-SSL {
    Write-Log "Setting up SSL certificate..." "INFO" $Colors.Info
    
    $SSLCommands = @(
        "sudo apt install -y certbot python3-certbot-nginx",
        "sudo certbot --nginx -d family.thelodgegroup.id --email admin@thelodgegroup.id --agree-tos --non-interactive",
        "sudo certbot renew --dry-run"
    )
    
    foreach ($cmd in $SSLCommands) {
        Write-Log "Running: $cmd" "INFO" $Colors.Info
        
        if (-not $TestOnly) {
            ssh "$VPSUser@$VPSHost" $cmd
            if ($LASTEXITCODE -ne 0) {
                Write-Log "SSL command failed: $cmd" "WARNING" $Colors.Warning
            }
        } else {
            Write-Log "TEST: Would run: $cmd" "INFO" $Colors.Info
        }
    }
}

# Deploy application
function Deploy-Application {
    Write-Log "Deploying application with PM2..." "INFO" $Colors.Info
    
    $DeployCommands = @(
        "cd $DeploymentPath",
        "pm2 delete all || true",
        "pm2 start ecosystem.config.js",
        "pm2 save",
        "pm2 startup"
    )
    
    foreach ($cmd in $DeployCommands) {
        Write-Log "Running: $cmd" "INFO" $Colors.Info
        
        if (-not $TestOnly) {
            ssh "$VPSUser@$VPSHost" $cmd
            if ($LASTEXITCODE -ne 0) {
                Write-Log "Deploy command failed: $cmd" "WARNING" $Colors.Warning
            }
        } else {
            Write-Log "TEST: Would run: $cmd" "INFO" $Colors.Info
        }
    }
}

# Verify deployment
function Test-Deployment {
    Write-Log "Verifying deployment..." "INFO" $Colors.Info
    
    $TestCommands = @(
        "curl -I https://family.thelodgegroup.id",
        "curl -I https://family.thelodgegroup.id/api/health",
        "pm2 status",
        "sudo systemctl status nginx",
        "sudo systemctl status mysql"
    )
    
    foreach ($cmd in $TestCommands) {
        Write-Log "Running: $cmd" "INFO" $Colors.Info
        
        if (-not $TestOnly) {
            ssh "$VPSUser@$VPSHost" $cmd
        } else {
            Write-Log "TEST: Would run: $cmd" "INFO" $Colors.Info
        }
    }
}

# Main deployment function
function Start-Deployment {
    try {
        Show-Header
        
        Write-Log "Starting deployment process..." "INFO" $Colors.Info
        Write-Log "Log file: $LogFile" "INFO" $Colors.Info
        
        # Step 1: Prerequisites
        Test-Prerequisites
        
        # Step 2: Backup
        Backup-CurrentDeployment
        
        # Step 3: Upload
        Upload-DeploymentPackage
        
        # Step 4: Environment setup
        Setup-Environment
        
        # Step 5: Database configuration
        Configure-Database
        
        # Step 6: Frontend build
        Build-Frontend
        
        # Step 7: Nginx configuration
        Configure-Nginx
        
        # Step 8: SSL setup
        Setup-SSL
        
        # Step 9: Application deployment
        Deploy-Application
        
        # Step 10: Verification
        Test-Deployment
        
        Write-Log "Deployment completed successfully!" "SUCCESS" $Colors.Success
        Write-Host "`n" + "="*80 -ForegroundColor $Colors.Success
        Write-Host "  DEPLOYMENT SUCCESSFUL!" -ForegroundColor $Colors.Success
        Write-Host "="*80 -ForegroundColor $Colors.Success
        Write-Host "  Frontend: https://family.thelodgegroup.id" -ForegroundColor $Colors.Info
        Write-Host "  API: https://family.thelodgegroup.id/api" -ForegroundColor $Colors.Info
        Write-Host "  Admin: https://family.thelodgegroup.id/admin" -ForegroundColor $Colors.Info
        Write-Host "="*80 -ForegroundColor $Colors.Success
        
    } catch {
        Write-Log "Deployment failed: $_" "ERROR" $Colors.Error
        Write-Host "`n" + "="*80 -ForegroundColor $Colors.Error
        Write-Host "  DEPLOYMENT FAILED!" -ForegroundColor $Colors.Error
        Write-Host "  Error: $_" -ForegroundColor $Colors.Error
        Write-Host "  Check log file: $LogFile" -ForegroundColor $Colors.Error
        Write-Host "="*80 -ForegroundColor $Colors.Error
        exit 1
    }
}

# Run deployment
Start-Deployment