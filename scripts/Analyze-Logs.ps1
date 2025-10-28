# The Lodge Family - Error Log Analysis Script (PowerShell)
# This script analyzes various log files to identify deployment issues

param(
    [switch]$Detailed,
    [switch]$Export,
    [string]$OutputPath = ".\log-analysis-report.txt"
)

# Configuration
$ProjectPath = "C:\xampp\htdocs\newthelodgefamily"
$LinesToAnalyze = 500

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    $colorMap = @{
        "Red" = "Red"
        "Green" = "Green"
        "Yellow" = "Yellow"
        "Blue" = "Blue"
        "Cyan" = "Cyan"
        "Magenta" = "Magenta"
        "White" = "White"
    }
    
    Write-Host $Message -ForegroundColor $colorMap[$Color]
}

function Write-Header {
    param([string]$Message)
    Write-ColorOutput "[ANALYSIS] $Message" "Cyan"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" "Red"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" "Yellow"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" "Green"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" "Blue"
}

# Initialize report
$Report = @()
$Report += "The Lodge Family - Log Analysis Report (Windows)"
$Report += "==============================================="
$Report += "Generated: $(Get-Date)"
$Report += "Computer: $env:COMPUTERNAME"
$Report += "Analysis Period: Last $LinesToAnalyze lines from each log"
$Report += ""

# Function to analyze Node.js/PM2 processes
function Analyze-NodeProcesses {
    Write-Header "Analyzing Node.js processes..."
    
    $Report += "Node.js Process Analysis"
    $Report += "========================"
    $Report += ""
    
    try {
        # Check if Node.js processes are running
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        
        if ($nodeProcesses) {
            $Report += "Running Node.js processes:"
            foreach ($process in $nodeProcesses) {
                $Report += "- PID: $($process.Id), CPU: $($process.CPU), Memory: $([math]::Round($process.WorkingSet64/1MB, 2)) MB"
            }
            $Report += ""
            
            Write-Success "Found $($nodeProcesses.Count) Node.js processes running"
        } else {
            Write-Warning "No Node.js processes found running"
            $Report += "No Node.js processes found running"
            $Report += ""
        }
        
        # Check for PM2 if available
        try {
            $pm2Status = & pm2 status 2>&1
            if ($LASTEXITCODE -eq 0) {
                $Report += "PM2 Status:"
                $Report += $pm2Status
                $Report += ""
                
                # Get PM2 logs
                $pm2Logs = & pm2 logs --lines $LinesToAnalyze --nostream 2>&1
                if ($pm2Logs) {
                    $errorLines = $pm2Logs | Where-Object { $_ -match "error|exception|failed" }
                    
                    if ($errorLines) {
                        Write-Warning "Found $($errorLines.Count) error lines in PM2 logs"
                        $Report += "PM2 Error Summary:"
                        $Report += "- Total error lines: $($errorLines.Count)"
                        $Report += ""
                        
                        if ($Detailed) {
                            $Report += "Recent PM2 Errors:"
                            $errorLines | Select-Object -Last 10 | ForEach-Object { $Report += $_ }
                            $Report += ""
                        }
                    } else {
                        Write-Success "No errors found in PM2 logs"
                        $Report += "No errors found in PM2 logs"
                        $Report += ""
                    }
                }
            }
        } catch {
            Write-Info "PM2 not available or not in PATH"
            $Report += "PM2 not available"
            $Report += ""
        }
        
    } catch {
        Write-Error "Error analyzing Node.js processes: $($_.Exception.Message)"
        $Report += "Error analyzing Node.js processes: $($_.Exception.Message)"
        $Report += ""
    }
}

# Function to analyze IIS/Apache logs (if applicable)
function Analyze-WebServerLogs {
    Write-Header "Analyzing web server logs..."
    
    $Report += "Web Server Log Analysis"
    $Report += "======================="
    $Report += ""
    
    # Check for XAMPP Apache logs
    $apacheErrorLog = "$env:XAMPP_ROOT\apache\logs\error.log"
    if (-not $env:XAMPP_ROOT) {
        $apacheErrorLog = "C:\xampp\apache\logs\error.log"
    }
    
    if (Test-Path $apacheErrorLog) {
        try {
            $errorLogContent = Get-Content $apacheErrorLog -Tail $LinesToAnalyze -ErrorAction SilentlyContinue
            
            if ($errorLogContent) {
                $errorCount = ($errorLogContent | Where-Object { $_ -match "\[error\]" }).Count
                $warningCount = ($errorLogContent | Where-Object { $_ -match "\[warn\]" }).Count
                $criticalCount = ($errorLogContent | Where-Object { $_ -match "\[crit\]" }).Count
                
                $Report += "Apache Error Log Summary:"
                $Report += "- Critical: $criticalCount"
                $Report += "- Errors: $errorCount"
                $Report += "- Warnings: $warningCount"
                $Report += ""
                
                if ($criticalCount -gt 0) {
                    Write-Error "Found $criticalCount critical errors in Apache logs"
                }
                if ($errorCount -gt 0) {
                    Write-Warning "Found $errorCount errors in Apache logs"
                }
                
                if ($Detailed -and ($errorCount -gt 0 -or $criticalCount -gt 0)) {
                    $Report += "Recent Apache Errors:"
                    $errorLogContent | Where-Object { $_ -match "\[error\]|\[crit\]" } | Select-Object -Last 10 | ForEach-Object { $Report += $_ }
                    $Report += ""
                }
                
                if ($errorCount -eq 0 -and $criticalCount -eq 0) {
                    Write-Success "No critical errors found in Apache logs"
                }
            } else {
                Write-Info "Apache error log is empty"
                $Report += "Apache error log is empty"
                $Report += ""
            }
        } catch {
            Write-Warning "Could not read Apache error log: $($_.Exception.Message)"
            $Report += "Could not read Apache error log: $($_.Exception.Message)"
            $Report += ""
        }
    } else {
        Write-Info "Apache error log not found at $apacheErrorLog"
        $Report += "Apache error log not found"
        $Report += ""
    }
    
    # Check for IIS logs if applicable
    $iisLogPath = "$env:SystemRoot\System32\LogFiles\W3SVC1"
    if (Test-Path $iisLogPath) {
        try {
            $latestIISLog = Get-ChildItem $iisLogPath -Filter "*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            
            if ($latestIISLog) {
                $iisLogContent = Get-Content $latestIISLog.FullName -Tail $LinesToAnalyze -ErrorAction SilentlyContinue
                
                if ($iisLogContent) {
                    $errorRequests = $iisLogContent | Where-Object { $_ -match " 5[0-9][0-9] " }
                    $clientErrors = $iisLogContent | Where-Object { $_ -match " 4[0-9][0-9] " }
                    
                    $Report += "IIS Log Summary:"
                    $Report += "- 5xx errors: $($errorRequests.Count)"
                    $Report += "- 4xx errors: $($clientErrors.Count)"
                    $Report += ""
                    
                    if ($errorRequests.Count -gt 0) {
                        Write-Warning "Found $($errorRequests.Count) server errors (5xx) in IIS logs"
                    }
                }
            }
        } catch {
            Write-Info "Could not analyze IIS logs: $($_.Exception.Message)"
        }
    }
}

# Function to analyze application logs
function Analyze-ApplicationLogs {
    Write-Header "Analyzing application logs..."
    
    $Report += "Application Log Analysis"
    $Report += "========================"
    $Report += ""
    
    if (Test-Path $ProjectPath) {
        # Look for log files in the project
        $logFiles = Get-ChildItem -Path $ProjectPath -Recurse -Filter "*.log" -ErrorAction SilentlyContinue | Select-Object -First 10
        
        if ($logFiles) {
            $Report += "Found application log files:"
            foreach ($logFile in $logFiles) {
                $Report += "- $($logFile.FullName)"
            }
            $Report += ""
            
            foreach ($logFile in $logFiles) {
                try {
                    $logContent = Get-Content $logFile.FullName -Tail 100 -ErrorAction SilentlyContinue
                    
                    if ($logContent) {
                        $errorLines = $logContent | Where-Object { $_ -match "error|exception|failed" }
                        
                        $Report += "Analyzing $($logFile.Name):"
                        
                        if ($errorLines) {
                            Write-Warning "Found $($errorLines.Count) errors in $($logFile.Name)"
                            $Report += "- Errors found: $($errorLines.Count)"
                            
                            if ($Detailed) {
                                $Report += "Recent errors:"
                                $errorLines | Select-Object -Last 5 | ForEach-Object { $Report += "  $_" }
                            }
                        } else {
                            $Report += "- No recent errors found"
                        }
                        $Report += ""
                    }
                } catch {
                    Write-Warning "Could not read log file $($logFile.Name): $($_.Exception.Message)"
                    $Report += "Could not read log file $($logFile.Name)"
                    $Report += ""
                }
            }
        } else {
            Write-Info "No application log files found"
            $Report += "No application log files found"
            $Report += ""
        }
        
        # Check for npm debug logs
        $npmDebugLogs = Get-ChildItem -Path $ProjectPath -Recurse -Filter "npm-debug.log*" -ErrorAction SilentlyContinue
        if ($npmDebugLogs) {
            Write-Warning "Found $($npmDebugLogs.Count) npm debug logs"
            $Report += "NPM Debug Logs Found:"
            foreach ($debugLog in $npmDebugLogs) {
                $Report += "- $($debugLog.FullName)"
            }
            $Report += ""
        }
        
    } else {
        Write-Error "Project directory not found: $ProjectPath"
        $Report += "Project directory not found: $ProjectPath"
        $Report += ""
    }
}

# Function to analyze system resources
function Analyze-SystemResources {
    Write-Header "Analyzing system resources..."
    
    $Report += "System Resource Analysis"
    $Report += "========================"
    $Report += ""
    
    try {
        # Memory usage
        $memory = Get-WmiObject -Class Win32_OperatingSystem
        $totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
        $freeMemory = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
        $usedMemory = $totalMemory - $freeMemory
        $memoryUsagePercent = [math]::Round(($usedMemory / $totalMemory) * 100, 1)
        
        $Report += "Memory Usage:"
        $Report += "- Total: $totalMemory GB"
        $Report += "- Used: $usedMemory GB ($memoryUsagePercent%)"
        $Report += "- Free: $freeMemory GB"
        $Report += ""
        
        if ($memoryUsagePercent -gt 90) {
            Write-Warning "High memory usage detected: $memoryUsagePercent%"
        } elseif ($memoryUsagePercent -gt 80) {
            Write-Info "Moderate memory usage: $memoryUsagePercent%"
        } else {
            Write-Success "Memory usage is normal: $memoryUsagePercent%"
        }
        
        # Disk usage
        $disks = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
        $Report += "Disk Usage:"
        
        foreach ($disk in $disks) {
            $totalSize = [math]::Round($disk.Size / 1GB, 2)
            $freeSpace = [math]::Round($disk.FreeSpace / 1GB, 2)
            $usedSpace = $totalSize - $freeSpace
            $diskUsagePercent = [math]::Round(($usedSpace / $totalSize) * 100, 1)
            
            $Report += "- Drive $($disk.DeviceID) Total: $totalSize GB, Used: $usedSpace GB ($diskUsagePercent%), Free: $freeSpace GB"
            
            if ($diskUsagePercent -gt 90) {
                Write-Warning "Low disk space on drive $($disk.DeviceID): $diskUsagePercent% used"
            }
        }
        $Report += ""
        
        # CPU usage (average over last few seconds)
        $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
        $cpuUsage = [math]::Round($cpu.Average, 1)
        
        $Report += "CPU Usage: $cpuUsage%"
        
        if ($cpuUsage -gt 90) {
            Write-Warning "High CPU usage detected: $cpuUsage%"
        } elseif ($cpuUsage -gt 70) {
            Write-Info "Moderate CPU usage: $cpuUsage%"
        } else {
            Write-Success "CPU usage is normal: $cpuUsage%"
        }
        
        $Report += ""
        
    } catch {
        Write-Error "Error analyzing system resources: $($_.Exception.Message)"
        $Report += "Error analyzing system resources: $($_.Exception.Message)"
        $Report += ""
    }
}

# Function to check network connectivity
function Analyze-NetworkConnectivity {
    Write-Header "Analyzing network connectivity..."
    
    $Report += "Network Connectivity Analysis"
    $Report += "============================="
    $Report += ""
    
    # Test local endpoints
    $endpoints = @(
        @{ Name = "Backend API"; Url = "http://localhost:5001" },
        @{ Name = "Frontend"; Url = "http://localhost:3000" },
        @{ Name = "Database"; Url = "localhost:3306" }
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            if ($endpoint.Url -match "^https?://") {
                # HTTP endpoint
                $response = Invoke-WebRequest -Uri $endpoint.Url -TimeoutSec 5 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Success "$($endpoint.Name) is accessible"
                    $Report += "[OK] $($endpoint.Name) is accessible ($($response.StatusCode))"
                } else {
                    Write-Warning "$($endpoint.Name) returned status $($response.StatusCode)"
                    $Report += "[WARN] $($endpoint.Name) returned status $($response.StatusCode)"
                }
            } else {
                # TCP endpoint
                $tcpTest = Test-NetConnection -ComputerName ($endpoint.Url -split ":")[0] -Port ($endpoint.Url -split ":")[1] -ErrorAction SilentlyContinue
                if ($tcpTest.TcpTestSucceeded) {
                    Write-Success "$($endpoint.Name) port is open"
                    $Report += "[OK] $($endpoint.Name) port is open"
                } else {
                    Write-Warning "$($endpoint.Name) port is not accessible"
                    $Report += "[FAIL] $($endpoint.Name) port is not accessible"
                }
            }
        } catch {
            Write-Warning "$($endpoint.Name) is not accessible: $($_.Exception.Message)"
            $Report += "[FAIL] $($endpoint.Name) is not accessible"
        }
    }
    
    $Report += ""
}

# Function to generate recommendations
function Generate-Recommendations {
    Write-Header "Generating recommendations..."
    
    $Report += "Recommendations"
    $Report += "==============="
    $Report += ""
    
    $reportText = $Report -join "`n"
    
    # Check for common issues and provide recommendations
    if ($reportText -match "error|exception|failed") {
        $Report += "[FIX] Error Issues Detected:"
        $Report += "   - Review detailed error logs above"
        $Report += "   - Check application configuration files"
        $Report += "   - Verify all required services are running"
        $Report += "   - Check for missing dependencies: npm install"
        $Report += ""
    }
    
    if ($reportText -match "not accessible|not running") {
        $Report += "[FIX] Service Connectivity Issues Detected:"
        $Report += "   - Start backend: cd backend && npm run dev"
        $Report += "   - Start frontend: cd frontend && npm run dev"
        $Report += "   - Check if ports are already in use: netstat -an | findstr :5001"
        $Report += "   - Verify firewall settings"
        $Report += ""
    }
    
    if ($reportText -match "High.*usage|Low disk space") {
        $Report += "[FIX] Resource Issues Detected:"
        $Report += "   - Close unnecessary applications"
        $Report += "   - Clear temporary files and logs"
        $Report += "   - Consider upgrading system resources"
        $Report += "   - Monitor resource usage regularly"
        $Report += ""
    }
    
    if ($reportText -match "npm debug logs|npm.*error") {
        $Report += "[FIX] NPM Issues Detected:"
        $Report += "   - Clear npm cache: npm cache clean --force"
        $Report += "   - Delete node_modules and reinstall: rm -rf node_modules && npm install"
        $Report += "   - Check for package conflicts"
        $Report += "   - Update npm: npm install -g npm@latest"
        $Report += ""
    }
    
    # General recommendations
    $Report += "[INFO] General Recommendations:"
    $Report += "   - Keep dependencies updated: npm update"
    $Report += "   - Regular system maintenance and updates"
    $Report += "   - Monitor logs regularly for early issue detection"
    $Report += "   - Backup important data and configurations"
    $Report += "   - Use version control for all code changes"
    $Report += ""
}

# Function to show summary
function Show-Summary {
    Write-Header "Analysis Summary"
    
    $reportText = $Report -join "`n"
    
    # Count issues
    $errorCount = ($reportText -split "`n" | Where-Object { $_ -match "Found.*error|ERROR|\[FAIL\]" }).Count
    $warningCount = ($reportText -split "`n" | Where-Object { $_ -match "Found.*warning|WARNING|\[WARN\]" }).Count
    $successCount = ($reportText -split "`n" | Where-Object { $_ -match "SUCCESS|\[OK\]" }).Count
    
    Write-Host ""
    Write-Info "Analysis completed."
    
    if ($errorCount -gt 0) {
        Write-Error "Found $errorCount critical issues that need attention"
    }
    
    if ($warningCount -gt 0) {
        Write-Warning "Found $warningCount warnings to review"
    }
    
    if ($successCount -gt 0) {
        Write-Success "Found $successCount items working correctly"
    }
    
    if ($errorCount -eq 0 -and $warningCount -eq 0) {
        Write-Success "No critical issues found"
    }
    
    if ($Export) {
        try {
            $Report | Out-File -FilePath $OutputPath -Encoding UTF8
            Write-Info "Report exported to: $OutputPath"
        } catch {
            Write-Error "Could not export report: $($_.Exception.Message)"
        }
    }
    
    Write-Host ""
    Write-Info "To export full report: .\Analyze-Logs.ps1 -Export"
    Write-Info "For detailed analysis: .\Analyze-Logs.ps1 -Detailed"
}

# Main execution
function Main {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "The Lodge Family - Log Analysis (Windows)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Starting comprehensive log analysis..." -ForegroundColor White
    Write-Host ""
    
    # Run analysis functions
    Analyze-NodeProcesses
    Analyze-WebServerLogs
    Analyze-ApplicationLogs
    Analyze-SystemResources
    Analyze-NetworkConnectivity
    
    # Generate recommendations
    Generate-Recommendations
    
    # Show summary
    Show-Summary
    
    Write-Host "========================================" -ForegroundColor Cyan
}

# Run main function
Main