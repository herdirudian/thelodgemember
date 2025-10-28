# The Lodge Family - File Permissions Verification Script (Windows)
# This script checks and fixes file permissions for proper deployment

param(
    [switch]$Fix,
    [string]$ProjectPath = "C:\xampp\htdocs\newthelodgefamily",
    [string]$WebUser = "IIS_IUSRS",
    [string]$OutputFile = "permissions-check-report.txt",
    [switch]$Help
)

# Function to show usage
function Show-Usage {
    Write-Host "Usage: .\Check-Permissions.ps1 [OPTIONS]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Fix              Fix permission issues automatically"
    Write-Host "  -ProjectPath      Specify project path (default: $ProjectPath)"
    Write-Host "  -WebUser          Specify web user (default: $WebUser)"
    Write-Host "  -OutputFile       Specify output file (default: $OutputFile)"
    Write-Host "  -Help             Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\Check-Permissions.ps1                    Check permissions only"
    Write-Host "  .\Check-Permissions.ps1 -Fix               Check and fix permissions"
    Write-Host "  .\Check-Permissions.ps1 -ProjectPath 'C:\inetpub\wwwroot\myapp' -Fix"
}

# Show help if requested
if ($Help) {
    Show-Usage
    exit 0
}

# Function to write colored output
function Write-Header {
    param([string]$Message)
    Write-Host "[PERMISSIONS] $Message" -ForegroundColor Cyan
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Fix {
    param([string]$Message)
    Write-Host "[FIX] $Message" -ForegroundColor Magenta
}

# Function to create permissions report header
function New-ReportHeader {
    $reportContent = @"
The Lodge Family - File Permissions Check Report (Windows)
=========================================================
Generated: $(Get-Date)
Computer: $env:COMPUTERNAME
Project Path: $ProjectPath
Web User: $WebUser
Fix Mode: $Fix

"@
    $reportContent | Out-File -FilePath $OutputFile -Encoding UTF8
}

# Function to append to report
function Add-ToReport {
    param([string]$Content)
    $Content | Out-File -FilePath $OutputFile -Append -Encoding UTF8
}

# Function to check if user exists
function Test-UserExists {
    param([string]$Username)
    try {
        $user = Get-LocalUser -Name $Username -ErrorAction SilentlyContinue
        return $null -ne $user
    }
    catch {
        return $false
    }
}

# Function to check system prerequisites
function Test-Prerequisites {
    Write-Header "Checking system prerequisites..."
    
    Add-ToReport "System Prerequisites Check"
    Add-ToReport "========================="
    Add-ToReport ""
    
    $issues = 0
    
    # Check if project directory exists
    if (-not (Test-Path $ProjectPath)) {
        Write-Error "Project directory does not exist: $ProjectPath"
        Add-ToReport "[FAIL] Project directory missing: $ProjectPath"
        $issues++
    }
    else {
        Write-Success "Project directory exists: $ProjectPath"
        Add-ToReport "[OK] Project directory exists: $ProjectPath"
    }
    
    # Check if running as administrator (needed for fixing permissions)
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
    
    if ($Fix -and -not $isAdmin) {
        Write-Error "Administrator privileges required for fixing permissions. Run as Administrator."
        Add-ToReport "[FAIL] Administrator privileges required for fixing"
        $issues++
    }
    elseif ($isAdmin) {
        Write-Success "Running with Administrator privileges"
        Add-ToReport "[OK] Administrator privileges available"
    }
    else {
        Write-Info "Running without Administrator privileges (check mode only)"
        Add-ToReport "[INFO] Running in check mode only"
    }
    
    Add-ToReport ""
    return $issues -eq 0
}

# Function to get file/directory permissions
function Get-ItemPermissions {
    param([string]$Path)
    
    try {
        $acl = Get-Acl -Path $Path -ErrorAction SilentlyContinue
        if ($acl) {
            return $acl
        }
    }
    catch {
        return $null
    }
    return $null
}

# Function to check directory permissions
function Test-DirectoryPermissions {
    param(
        [string]$Path,
        [string]$ExpectedUser,
        [string]$Description
    )
    
    if (-not (Test-Path $Path)) {
        Write-Warning "$Description does not exist: $Path"
        Add-ToReport "[WARN] $Description missing: $Path"
        return 1
    }
    
    $item = Get-Item $Path
    $acl = Get-ItemPermissions $Path
    
    Add-ToReport "Checking $Description ($Path):"
    
    if ($acl) {
        $owner = $acl.Owner
        Add-ToReport "  Current owner: $owner"
        Add-ToReport "  Expected user access: $ExpectedUser"
        
        # Check if expected user has access
        $hasAccess = $false
        foreach ($access in $acl.Access) {
            if ($access.IdentityReference -like "*$ExpectedUser*" -or 
                $access.IdentityReference -like "*Everyone*" -or
                $access.IdentityReference -like "*Users*") {
                $hasAccess = $true
                Add-ToReport "  [OK] User has access: $($access.IdentityReference) - $($access.FileSystemRights)"
                break
            }
        }
        
        if (-not $hasAccess) {
            Write-Warning "$Description may not have proper access for $ExpectedUser"
            Add-ToReport "  [WARN] Expected user may not have proper access"
            
            if ($Fix) {
                Write-Fix "Attempting to grant access for $Description..."
                try {
                    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($ExpectedUser, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
                    $acl.SetAccessRule($accessRule)
                    Set-Acl -Path $Path -AclObject $acl
                    Write-Success "Granted access for $Description"
                    Add-ToReport "  [OK] Fixed access permissions"
                }
                catch {
                    Write-Error "Failed to fix permissions for $Description`: $($_.Exception.Message)"
                    Add-ToReport "  [FAIL] Failed to fix permissions: $($_.Exception.Message)"
                }
            }
            return 1
        }
        else {
            Write-Success "$Description has proper permissions"
        }
    }
    else {
        Write-Error "Could not read permissions for $Description"
        Add-ToReport "  [FAIL] Could not read permissions"
        return 1
    }
    
    Add-ToReport ""
    return 0
}

# Function to check main project directories
function Test-MainDirectories {
    Write-Header "Checking main project directories..."
    
    Add-ToReport "Main Directory Permissions Check"
    Add-ToReport "==============================="
    Add-ToReport ""
    
    $totalIssues = 0
    
    # Check main project directory
    $totalIssues += Test-DirectoryPermissions $ProjectPath $WebUser "Project root"
    
    # Check backend directory
    $backendPath = Join-Path $ProjectPath "backend"
    if (Test-Path $backendPath) {
        $totalIssues += Test-DirectoryPermissions $backendPath $WebUser "Backend directory"
    }
    
    # Check frontend directory
    $frontendPath = Join-Path $ProjectPath "frontend"
    if (Test-Path $frontendPath) {
        $totalIssues += Test-DirectoryPermissions $frontendPath $WebUser "Frontend directory"
    }
    
    # Check node_modules directories
    $backendNodeModules = Join-Path $ProjectPath "backend\node_modules"
    if (Test-Path $backendNodeModules) {
        $totalIssues += Test-DirectoryPermissions $backendNodeModules $WebUser "Backend node_modules"
    }
    
    $frontendNodeModules = Join-Path $ProjectPath "frontend\node_modules"
    if (Test-Path $frontendNodeModules) {
        $totalIssues += Test-DirectoryPermissions $frontendNodeModules $WebUser "Frontend node_modules"
    }
    
    return $totalIssues
}

# Function to check critical files
function Test-CriticalFiles {
    Write-Header "Checking critical files..."
    
    Add-ToReport "Critical Files Permissions Check"
    Add-ToReport "==============================="
    Add-ToReport ""
    
    $totalIssues = 0
    
    # Define critical files
    $criticalFiles = @(
        @{Path = Join-Path $ProjectPath "backend\.env"; Description = "Backend environment file"},
        @{Path = Join-Path $ProjectPath "frontend\.env"; Description = "Frontend environment file"},
        @{Path = Join-Path $ProjectPath "backend\package.json"; Description = "Backend package.json"},
        @{Path = Join-Path $ProjectPath "frontend\package.json"; Description = "Frontend package.json"},
        @{Path = Join-Path $ProjectPath "ecosystem.config.js"; Description = "PM2 ecosystem config"}
    )
    
    foreach ($file in $criticalFiles) {
        if (Test-Path $file.Path) {
            $totalIssues += Test-DirectoryPermissions $file.Path $WebUser $file.Description
        }
        else {
            Write-Info "$($file.Description) not found (may be optional): $($file.Path)"
            Add-ToReport "[INFO] $($file.Description) not found: $($file.Path)"
        }
    }
    
    return $totalIssues
}

# Function to check executable files
function Test-ExecutableFiles {
    Write-Header "Checking executable files..."
    
    Add-ToReport "Executable Files Permissions Check"
    Add-ToReport "================================="
    Add-ToReport ""
    
    $totalIssues = 0
    
    # Find batch and PowerShell scripts
    $scriptExtensions = @("*.bat", "*.cmd", "*.ps1")
    $scripts = @()
    
    foreach ($extension in $scriptExtensions) {
        $foundScripts = Get-ChildItem -Path $ProjectPath -Filter $extension -Recurse -ErrorAction SilentlyContinue
        $scripts += $foundScripts
    }
    
    if ($scripts.Count -gt 0) {
        Add-ToReport "Found executable scripts:"
        
        foreach ($script in $scripts) {
            Add-ToReport "  $($script.FullName)"
            $totalIssues += Test-DirectoryPermissions $script.FullName $WebUser "Script file"
        }
    }
    else {
        Add-ToReport "No executable scripts found"
    }
    
    Add-ToReport ""
    return $totalIssues
}

# Function to check log directories and files
function Test-LogPermissions {
    Write-Header "Checking log directories and files..."
    
    Add-ToReport "Log Files Permissions Check"
    Add-ToReport "=========================="
    Add-ToReport ""
    
    $totalIssues = 0
    
    # Check for log directories
    $logDirs = @(
        (Join-Path $ProjectPath "logs"),
        (Join-Path $ProjectPath "backend\logs"),
        (Join-Path $ProjectPath "frontend\logs")
    )
    
    foreach ($logDir in $logDirs) {
        if (Test-Path $logDir) {
            $totalIssues += Test-DirectoryPermissions $logDir $WebUser "Log directory"
            
            # Check log files in the directory
            $logFiles = Get-ChildItem -Path $logDir -Filter "*.log" -ErrorAction SilentlyContinue
            foreach ($logFile in $logFiles) {
                $totalIssues += Test-DirectoryPermissions $logFile.FullName $WebUser "Log file"
            }
        }
    }
    
    return $totalIssues
}

# Function to check storage directories
function Test-StoragePermissions {
    Write-Header "Checking storage and upload directories..."
    
    Add-ToReport "Storage Directories Permissions Check"
    Add-ToReport "===================================="
    Add-ToReport ""
    
    $totalIssues = 0
    
    # Check for storage directories that need write access
    $storageDirs = @(
        (Join-Path $ProjectPath "uploads"),
        (Join-Path $ProjectPath "storage"),
        (Join-Path $ProjectPath "tmp"),
        (Join-Path $ProjectPath "backend\uploads"),
        (Join-Path $ProjectPath "backend\storage"),
        (Join-Path $ProjectPath "backend\tmp"),
        (Join-Path $ProjectPath "frontend\public\uploads")
    )
    
    foreach ($storageDir in $storageDirs) {
        if (Test-Path $storageDir) {
            $totalIssues += Test-DirectoryPermissions $storageDir $WebUser "Storage directory"
        }
        else {
            Write-Info "Storage directory not found (may be optional): $storageDir"
            Add-ToReport "[INFO] Storage directory not found: $storageDir"
        }
    }
    
    return $totalIssues
}

# Function to perform recursive permissions fix
function Set-RecursivePermissions {
    if ($Fix) {
        Write-Header "Applying recursive permissions fix..."
        
        Add-ToReport "Recursive Permissions Fix"
        Add-ToReport "========================="
        Add-ToReport ""
        
        try {
            Write-Fix "Setting recursive permissions for $WebUser on $ProjectPath..."
            
            # Get all items recursively
            $allItems = Get-ChildItem -Path $ProjectPath -Recurse -ErrorAction SilentlyContinue
            
            $fixedCount = 0
            $errorCount = 0
            
            foreach ($item in $allItems) {
                try {
                    $acl = Get-Acl -Path $item.FullName
                    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($WebUser, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
                    $acl.SetAccessRule($accessRule)
                    Set-Acl -Path $item.FullName -AclObject $acl
                    $fixedCount++
                }
                catch {
                    $errorCount++
                }
            }
            
            Write-Success "Recursive permissions fix completed. Fixed: $fixedCount, Errors: $errorCount"
            Add-ToReport "[OK] Recursive permissions fix completed. Fixed: $fixedCount, Errors: $errorCount"
        }
        catch {
            Write-Error "Recursive permissions fix failed: $($_.Exception.Message)"
            Add-ToReport "[FAIL] Recursive permissions fix failed: $($_.Exception.Message)"
        }
        
        Add-ToReport ""
    }
}

# Function to generate recommendations
function New-PermissionsRecommendations {
    Write-Header "Generating permissions recommendations..."
    
    Add-ToReport "Permissions Recommendations"
    Add-ToReport "=========================="
    Add-ToReport ""
    
    # Read the permissions file to generate recommendations
    if (Test-Path $OutputFile) {
        $reportContent = Get-Content $OutputFile -Raw
        
        # Check for common issues and provide recommendations
        if ($reportContent -match "WARN|FAIL") {
            Add-ToReport "[FIX] Permission Issues Detected:"
            Add-ToReport "   - Run this script with -Fix to automatically correct permissions"
            Add-ToReport "   - Manual fix: Use Windows Explorer > Properties > Security tab"
            Add-ToReport "   - Grant Full Control to $WebUser for the project directory"
            Add-ToReport "   - Ensure inheritance is enabled for subdirectories"
            Add-ToReport ""
        }
        
        if ($reportContent -match "missing|not found") {
            Add-ToReport "[FIX] Missing Files/Directories:"
            Add-ToReport "   - Create missing directories if needed"
            Add-ToReport "   - Verify deployment completed successfully"
            Add-ToReport "   - Check if missing files are optional"
            Add-ToReport ""
        }
        
        # General recommendations
        Add-ToReport "[INFO] General Permissions Best Practices:"
        Add-ToReport "   - Regular permission audits for security"
        Add-ToReport "   - Use specific users/groups for different services"
        Add-ToReport "   - Secure sensitive files (.env files)"
        Add-ToReport "   - Use Windows built-in security groups when possible"
        Add-ToReport "   - Enable inheritance for easier management"
        Add-ToReport ""
    }
}

# Function to show summary
function Show-PermissionsSummary {
    Write-Header "Permissions Check Summary"
    
    if (Test-Path $OutputFile) {
        # Count total issues found
        $reportContent = Get-Content $OutputFile -Raw
        $totalErrors = ([regex]::Matches($reportContent, "\[FAIL\]")).Count
        $totalWarnings = ([regex]::Matches($reportContent, "\[WARN\]")).Count
        $totalSuccess = ([regex]::Matches($reportContent, "\[OK\]")).Count
        $totalFixes = ([regex]::Matches($reportContent, "Fixed|Granted")).Count
        
        Write-Host ""
        Write-Info "Permissions check completed. Report saved to: $OutputFile"
        
        if ($totalErrors -gt 0) {
            Write-Error "Found $totalErrors critical permission issues"
        }
        
        if ($totalWarnings -gt 0) {
            Write-Warning "Found $totalWarnings permission warnings"
        }
        
        if ($totalSuccess -gt 0) {
            Write-Success "Found $totalSuccess items with correct permissions"
        }
        
        if ($Fix -and $totalFixes -gt 0) {
            Write-Success "Applied $totalFixes permission fixes"
        }
        
        if ($totalErrors -eq 0 -and $totalWarnings -eq 0) {
            Write-Success "All file permissions appear to be correct"
        }
        elseif (-not $Fix -and $totalWarnings -gt 0) {
            Write-Info "Run with -Fix to automatically correct permission issues"
        }
        
        Write-Host ""
        Write-Info "To view the full report: Get-Content '$OutputFile'"
        Write-Info "To fix permissions: .\Check-Permissions.ps1 -Fix"
    }
    else {
        Write-Error "Permissions check report could not be generated"
    }
}

# Main execution
function Main {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "The Lodge Family - File Permissions Check (Windows)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Checking file permissions and ownership..." -ForegroundColor White
    Write-Host ""
    
    if ($Fix) {
        Write-Info "Fix mode enabled - will attempt to correct issues"
    }
    else {
        Write-Info "Check mode - will only report issues"
    }
    Write-Host ""
    
    # Create permissions report
    New-ReportHeader
    
    # Check prerequisites
    if (-not (Test-Prerequisites)) {
        Write-Error "Prerequisites check failed. Cannot continue."
        exit 1
    }
    
    # Run permission checks
    $totalIssues = 0
    
    $totalIssues += Test-MainDirectories
    $totalIssues += Test-CriticalFiles
    $totalIssues += Test-ExecutableFiles
    $totalIssues += Test-LogPermissions
    $totalIssues += Test-StoragePermissions
    
    # Apply recursive fix if requested
    Set-RecursivePermissions
    
    # Generate recommendations
    New-PermissionsRecommendations
    
    # Show summary
    Show-PermissionsSummary
    
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Exit with appropriate code
    if ($totalIssues -gt 0 -and -not $Fix) {
        exit 1
    }
    else {
        exit 0
    }
}

# Run main function
try {
    Main
}
catch {
    Write-Error "Script execution failed: $($_.Exception.Message)"
    exit 1
}