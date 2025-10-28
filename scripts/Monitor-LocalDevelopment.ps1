# The Lodge Family - Local Development Monitoring Script
# This script monitors the health and status of the local development environment

param(
    [switch]$Watch = $false,
    [int]$Interval = 30,
    [switch]$Logs = $false,
    [switch]$Status = $false,
    [switch]$Help = $false
)

# Configuration
$BackendUrl = "http://localhost:5001"
$FrontendUrl = "http://localhost:3000"
$ProjectPath = "C:\xampp\htdocs\newthelodgefamily"

function Write-Status {
    param($Message, $Color = "Green")
    Write-Host "[INFO] $Message" -ForegroundColor $Color
}

function Write-Success {
    param($Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Header {
    param($Message)
    Write-Host "[MONITOR] $Message" -ForegroundColor Cyan
}

function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Description,
        [int]$TimeoutSeconds = 10
    )
    
    Write-Header "Checking $Description..."
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSeconds -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "$Description is responding (HTTP $($response.StatusCode))"
            return $true
        } else {
            Write-Warning "$Description returned HTTP $($response.StatusCode)"
            return $false
        }
    } catch {
        Write-Error "$Description is unreachable: $($_.Exception.Message)"
        return $false
    }
}

function Test-ProcessRunning {
    param(
        [string]$ProcessName,
        [string]$Description
    )
    
    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Success "$Description is running (PID: $($processes[0].Id))"
        return $true
    } else {
        Write-Error "$Description is not running"
        return $false
    }
}

function Test-PortListening {
    param(
        [int]$Port,
        [string]$Description
    )
    
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($connection) {
            Write-Success "$Description (Port $Port) is listening"
            return $true
        } else {
            Write-Error "$Description (Port $Port) is not listening"
            return $false
        }
    } catch {
        Write-Error "Could not test port $Port for $Description"
        return $false
    }
}

function Get-SystemInfo {
    Write-Header "System Information:"
    Write-Host "Computer: $env:COMPUTERNAME"
    Write-Host "User: $env:USERNAME"
    Write-Host "OS: $(Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty Caption)"
    Write-Host "Date: $(Get-Date)"
    
    # Memory usage
    $memory = Get-CimInstance Win32_OperatingSystem
    $totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
    $freeMemory = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
    $usedMemory = $totalMemory - $freeMemory
    $memoryPercent = [math]::Round(($usedMemory / $totalMemory) * 100, 1)
    
    Write-Host "Memory: $usedMemory GB / $totalMemory GB ($memoryPercent%)"
    
    # Disk space
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    $totalSpace = [math]::Round($disk.Size / 1GB, 2)
    $freeSpace = [math]::Round($disk.FreeSpace / 1GB, 2)
    $usedSpace = $totalSpace - $freeSpace
    $diskPercent = [math]::Round(($usedSpace / $totalSpace) * 100, 1)
    
    Write-Host "Disk C: $usedSpace GB / $totalSpace GB ($diskPercent%)"
    Write-Host ""
}

function Test-NodeModules {
    Write-Header "Checking Node.js dependencies..."
    
    # Check backend node_modules
    if (Test-Path "$ProjectPath\backend\node_modules") {
        Write-Success "Backend node_modules exists"
    } else {
        Write-Error "Backend node_modules missing - run 'npm install' in backend directory"
    }
    
    # Check frontend node_modules
    if (Test-Path "$ProjectPath\frontend\node_modules") {
        Write-Success "Frontend node_modules exists"
    } else {
        Write-Error "Frontend node_modules missing - run 'npm install' in frontend directory"
    }
}

function Test-EnvironmentFiles {
    Write-Header "Checking environment files..."
    
    # Check backend .env
    if (Test-Path "$ProjectPath\backend\.env") {
        Write-Success "Backend .env file exists"
    } else {
        Write-Warning "Backend .env file missing"
    }
    
    # Check frontend .env.local
    if (Test-Path "$ProjectPath\frontend\.env.local") {
        Write-Success "Frontend .env.local file exists"
    } else {
        Write-Warning "Frontend .env.local file missing"
    }
}

function Test-DatabaseConnection {
    Write-Header "Testing database connection..."
    
    if (Test-Path "$ProjectPath\backend\test-env.js") {
        try {
            Set-Location "$ProjectPath\backend"
            $result = node test-env.js 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Database connection test passed"
            } else {
                Write-Error "Database connection test failed"
                Write-Host $result -ForegroundColor Red
            }
        } catch {
            Write-Error "Could not run database test: $($_.Exception.Message)"
        } finally {
            Set-Location $ProjectPath
        }
    } else {
        Write-Warning "Database test script not found"
    }
}

function Show-RecentLogs {
    Write-Header "Recent Development Logs"
    
    # Check if there are any log files in the project
    $logFiles = @()
    
    # Look for common log file patterns
    $logPatterns = @("*.log", "logs\*.log", "backend\logs\*.log", "frontend\logs\*.log")
    
    foreach ($pattern in $logPatterns) {
        $files = Get-ChildItem -Path $ProjectPath -Filter $pattern -Recurse -ErrorAction SilentlyContinue
        $logFiles += $files
    }
    
    if ($logFiles.Count -gt 0) {
        Write-Status "Found $($logFiles.Count) log files:"
        foreach ($file in $logFiles | Select-Object -First 5) {
            Write-Host "  - $($file.FullName)" -ForegroundColor White
            Write-Host "    Last modified: $($file.LastWriteTime)" -ForegroundColor Gray
        }
    } else {
        Write-Status "No log files found in project directory"
    }
    
    # Show recent PowerShell errors if any
    if ($Error.Count -gt 0) {
        Write-Header "Recent PowerShell Errors:"
        $Error | Select-Object -First 3 | ForEach-Object {
            Write-Host "  - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

function Show-QuickStatus {
    Write-Header "Quick Development Status Check"
    
    # Test ports
    $backendRunning = Test-PortListening -Port 5001 -Description "Backend API"
    $frontendRunning = Test-PortListening -Port 3000 -Description "Frontend App"
    
    # Test endpoints if ports are listening
    if ($backendRunning) {
        Test-Endpoint -Url "$BackendUrl/api/health" -Description "Backend Health" -TimeoutSeconds 5 | Out-Null
    }
    
    if ($frontendRunning) {
        Test-Endpoint -Url $FrontendUrl -Description "Frontend App" -TimeoutSeconds 5 | Out-Null
    }
    
    # Overall status
    if ($backendRunning -and $frontendRunning) {
        Write-Success "Development environment is running"
    } elseif ($backendRunning -or $frontendRunning) {
        Write-Warning "Development environment is partially running"
    } else {
        Write-Error "Development environment is not running"
    }
}

function Start-Monitoring {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "The Lodge Family - Development Monitor" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Timestamp: $timestamp" -ForegroundColor Blue
    Write-Host ""
    
    # System information
    Get-SystemInfo
    
    # Check environment
    Test-EnvironmentFiles
    Write-Host ""
    
    # Check dependencies
    Test-NodeModules
    Write-Host ""
    
    # Check processes and ports
    Write-Header "Checking development servers..."
    Test-PortListening -Port 5001 -Description "Backend API Server"
    Test-PortListening -Port 3000 -Description "Frontend Dev Server"
    Test-PortListening -Port 3306 -Description "MySQL Database"
    Write-Host ""
    
    # Test endpoints
    Test-Endpoint -Url "$BackendUrl/api/health" -Description "Backend API Health"
    Test-Endpoint -Url "$FrontendUrl" -Description "Frontend Application"
    Write-Host ""
    
    # Test database
    Test-DatabaseConnection
    Write-Host ""
    
    Write-Header "Monitoring check completed"
    Write-Host "========================================" -ForegroundColor Cyan
}

function Show-Help {
    Write-Host "The Lodge Family - Local Development Monitoring Script" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\Monitor-LocalDevelopment.ps1 [OPTIONS]" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Help          Show this help message" -ForegroundColor White
    Write-Host "  -Watch         Run in watch mode (continuous monitoring)" -ForegroundColor White
    Write-Host "  -Interval <n>  Set watch interval in seconds (default: 30)" -ForegroundColor White
    Write-Host "  -Logs          Show recent logs" -ForegroundColor White
    Write-Host "  -Status        Show quick status only" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\Monitor-LocalDevelopment.ps1                    # Run single monitoring check" -ForegroundColor White
    Write-Host "  .\Monitor-LocalDevelopment.ps1 -Watch            # Run continuous monitoring" -ForegroundColor White
    Write-Host "  .\Monitor-LocalDevelopment.ps1 -Watch -Interval 60  # Monitor every 60 seconds" -ForegroundColor White
    Write-Host "  .\Monitor-LocalDevelopment.ps1 -Status           # Show quick status" -ForegroundColor White
    Write-Host "  .\Monitor-LocalDevelopment.ps1 -Logs             # Show recent logs" -ForegroundColor White
}

# Main execution
try {
    Set-Location $ProjectPath
    
    if ($Help) {
        Show-Help
        exit 0
    }
    
    if ($Logs) {
        Show-RecentLogs
    } elseif ($Status) {
        Show-QuickStatus
    } elseif ($Watch) {
        Write-Header "Starting continuous monitoring (interval: ${Interval}s)"
        Write-Status "Press Ctrl+C to stop"
        Write-Host ""
        
        while ($true) {
            Start-Monitoring
            Write-Host ""
            Write-Status "Waiting $Interval seconds for next check..." -Color Yellow
            Start-Sleep -Seconds $Interval
            Clear-Host
        }
    } else {
        Start-Monitoring
    }
    
} catch {
    Write-Error "Monitoring failed: $($_.Exception.Message)"
    exit 1
} finally {
    Set-Location $ProjectPath
}