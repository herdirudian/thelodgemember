#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Interactive deployment script for The Lodge Family application to VPS
.DESCRIPTION
    This script provides an interactive deployment process with step-by-step guidance
.PARAMETER VPSHost
    VPS hostname or IP address (default: family.thelodgegroup.id)
.PARAMETER VPSUser
    SSH username for VPS access
.PARAMETER TestConnection
    Test SSH connection only
#>

param(
    [string]$VPSHost = "family.thelodgegroup.id",
    [string]$VPSUser = "",
    [switch]$TestConnection = $false
)

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor $Colors.Header
    Write-Host " $Title" -ForegroundColor $Colors.Header
    Write-Host "=" * 60 -ForegroundColor $Colors.Header
    Write-Host ""
}

function Test-SSHConnection {
    param([string]$Host, [string]$User)
    
    Write-ColorOutput "Testing SSH connection to $User@$Host..." "Info"
    
    # Try to connect and run a simple command
    $testCommand = "ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $User@$Host 'echo Connection successful && whoami && pwd'"
    
    try {
        $result = Invoke-Expression $testCommand 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✓ SSH connection successful!" "Success"
            Write-ColorOutput "Server response: $result" "Info"
            return $true
        } else {
            Write-ColorOutput "✗ SSH connection failed" "Error"
            Write-ColorOutput "Error: $result" "Error"
            return $false
        }
    } catch {
        Write-ColorOutput "✗ SSH connection failed: $($_.Exception.Message)" "Error"
        return $false
    }
}
}

function Get-UserInput {
    param([string]$Prompt, [string]$Default = "")
    
    if ($Default) {
        $input = Read-Host "$Prompt [$Default]"
        return if ($input) { $input } else { $Default }
    } else {
        return Read-Host $Prompt
    }
}

function Show-DeploymentMenu {
    Write-Header "THE LODGE FAMILY - VPS DEPLOYMENT"
    
    Write-ColorOutput "Deployment package ready at:" "Info"
    Write-ColorOutput "  📦 $(Get-Location)\thelodgefamily-final-deployment-*" "Info"
    Write-Host ""
    
    Write-ColorOutput "Available deployment options:" "Info"
    Write-ColorOutput "  1. Interactive SSH Setup & Deployment" "Info"
    Write-ColorOutput "  2. Manual Deployment Instructions" "Info"
    Write-ColorOutput "  3. Test SSH Connection Only" "Info"
    Write-ColorOutput "  4. Exit" "Info"
    Write-Host ""
    
    $choice = Get-UserInput "Select option (1-4)" "1"
    return $choice
}

function Start-InteractiveDeployment {
    Write-Header "INTERACTIVE DEPLOYMENT SETUP"
    
    # Get VPS credentials
    if (-not $VPSUser) {
        Write-ColorOutput "VPS SSH Configuration:" "Info"
        $script:VPSUser = Get-UserInput "Enter SSH username" "root"
    }
    
    Write-ColorOutput "VPS Host: $VPSHost" "Info"
    Write-ColorOutput "SSH User: $VPSUser" "Info"
    Write-Host ""
    
    # Test SSH connection
    Write-ColorOutput "Step 1: Testing SSH Connection..." "Header"
    $sshWorking = Test-SSHConnection -Host $VPSHost -User $VPSUser
    
    if (-not $sshWorking) {
        Write-ColorOutput "SSH connection failed. Please check:" "Warning"
        Write-ColorOutput "  • SSH key is properly configured" "Warning"
        Write-ColorOutput "  • VPS is accessible" "Warning"
        Write-ColorOutput "  • Username is correct" "Warning"
        Write-Host ""
        
        $retry = Get-UserInput "Try different username? (y/n)" "y"
        if ($retry -eq "y") {
            $script:VPSUser = Get-UserInput "Enter SSH username" "ubuntu"
            $sshWorking = Test-SSHConnection -Host $VPSHost -User $VPSUser
        }
        
        if (-not $sshWorking) {
            Write-ColorOutput "Unable to establish SSH connection. Please setup SSH access manually." "Error"
            Show-ManualInstructions
            return
        }
    }
    
    # Proceed with deployment
    Write-Header "STARTING DEPLOYMENT"
    Write-ColorOutput "SSH connection verified. Starting deployment process..." "Success"
    
    # Run the main deployment script
    $deployScript = ".\DEPLOY-TO-VPS.ps1"
    if (Test-Path $deployScript) {
        Write-ColorOutput "Executing deployment script..." "Info"
        & $deployScript -VPSHost $VPSHost -VPSUser $VPSUser
    } else {
        Write-ColorOutput "Deployment script not found. Running manual deployment..." "Warning"
        Start-ManualDeployment
    }
}

function Start-ManualDeployment {
    Write-Header "MANUAL DEPLOYMENT PROCESS"
    
    Write-ColorOutput "Follow these steps to deploy manually:" "Info"
    Write-Host ""
    
    $steps = @(
        "1. Upload deployment package to VPS",
        "2. Extract and setup environment",
        "3. Install dependencies (Node.js, MySQL, Nginx)",
        "4. Configure database",
        "5. Build and deploy applications",
        "6. Configure Nginx and SSL",
        "7. Start services with PM2"
    )
    
    foreach ($step in $steps) {
        Write-ColorOutput $step "Info"
    }
    
    Write-Host ""
    Write-ColorOutput "Detailed instructions available in:" "Info"
    Write-ColorOutput "  📄 VPS-DEPLOYMENT-GUIDE.md" "Info"
    Write-ColorOutput "  📄 QUICK-DEPLOY.md" "Info"
    Write-ColorOutput "  📄 DEPLOYMENT-INSTRUCTIONS.md" "Info"
}

function Show-ManualInstructions {
    Write-Header "MANUAL SSH SETUP INSTRUCTIONS"
    
    Write-ColorOutput "To setup SSH access to your VPS:" "Info"
    Write-Host ""
    
    Write-ColorOutput "1. Generate SSH key (if not exists):" "Info"
    Write-ColorOutput "   ssh-keygen -t rsa -b 4096 -C 'your-email@example.com'" "Info"
    Write-Host ""
    
    Write-ColorOutput "2. Copy public key to VPS:" "Info"
    Write-ColorOutput "   ssh-copy-id $VPSUser@$VPSHost" "Info"
    Write-Host ""
    
    Write-ColorOutput "3. Test connection:" "Info"
    Write-ColorOutput "   ssh $VPSUser@$VPSHost" "Info"
    Write-Host ""
    
    Write-ColorOutput "4. Re-run this script after SSH is configured" "Info"
}

# Main execution
try {
    if ($TestConnection) {
        Write-Header "SSH CONNECTION TEST"
        if (-not $VPSUser) {
            $VPSUser = Get-UserInput "Enter SSH username" "root"
        }
        Test-SSHConnection -Host $VPSHost -User $VPSUser
        exit
    }
    
    $choice = Show-DeploymentMenu
    
    switch ($choice) {
        "1" { Start-InteractiveDeployment }
        "2" { Start-ManualDeployment }
        "3" { 
            if (-not $VPSUser) {
                $VPSUser = Get-UserInput "Enter SSH username" "root"
            }
            Test-SSHConnection -Host $VPSHost -User $VPSUser 
        }
        "4" { 
            Write-ColorOutput "Deployment cancelled." "Info"
            exit 
        }
        default { 
            Write-ColorOutput "Invalid option. Exiting." "Error"
            exit 1 
        }
    }
    
} catch {
    Write-ColorOutput "Deployment failed: $($_.Exception.Message)" "Error"
    exit 1
}