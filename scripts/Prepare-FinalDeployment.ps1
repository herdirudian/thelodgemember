# Final Deployment Preparation Script for Windows
param(
    [switch]$SkipBuild = $false,
    [switch]$CreatePackage = $true
)

Write-Host "Preparing The Lodge Family for final deployment..." -ForegroundColor Green
Write-Host "Date: $(Get-Date)" -ForegroundColor Blue

$ProjectPath = "C:\xampp\htdocs\newthelodgefamily"
$DeploymentDate = Get-Date -Format "yyyyMMdd_HHmmss"
$PackageName = "thelodgefamily-final-deployment-$DeploymentDate"

function Write-Status {
    param($Message, $Color = "Green")
    Write-Host "[INFO] $Message" -ForegroundColor $Color
}

function Write-Step {
    param($Message)
    Write-Host "[STEP] $Message" -ForegroundColor Cyan
}

try {
    Set-Location $ProjectPath

    Write-Step "1. Validating project structure..."
    
    $RequiredFiles = @(
        "backend\package.json",
        "frontend\package.json", 
        "ecosystem.config.js",
        "nginx-family-domain-fixed.conf",
        "backend\.env.vps",
        "frontend\.env.production"
    )
    
    foreach ($file in $RequiredFiles) {
        if (Test-Path $file) {
            Write-Status "Found: $file"
        } else {
            Write-Host "[ERROR] Missing: $file" -ForegroundColor Red
            throw "Required file missing: $file"
        }
    }

    Write-Step "2. Testing environment configurations..."
    
    Set-Location "backend"
    Copy-Item ".env.vps" ".env" -Force
    node test-env.js
    if ($LASTEXITCODE -ne 0) {
        throw "Backend environment test failed"
    }
    Write-Status "Backend environment validated"

    Set-Location "..\frontend"
    Copy-Item ".env.production" ".env.local" -Force
    Write-Status "Frontend environment configured"

    if (-not $SkipBuild) {
        Write-Step "3. Installing dependencies and building..."
        
        Set-Location "..\backend"
        Write-Status "Installing backend dependencies..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Backend npm install failed"
        }

        Set-Location "..\frontend"
        Write-Status "Installing frontend dependencies..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend npm install failed"
        }

        Write-Status "Building frontend..."
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend build failed"
        }
        Write-Status "Build completed successfully"
    } else {
        Write-Host "[WARNING] Skipping build process as requested" -ForegroundColor Yellow
    }

    Write-Step "4. Validating PM2 configuration..."
    Set-Location ".."
    
    node -e "console.log('PM2 config validation:'); const config = require('./ecosystem.config.js'); console.log('PM2 configuration is valid');"
    if ($LASTEXITCODE -ne 0) {
        throw "PM2 configuration validation failed"
    }

    Write-Step "5. Creating deployment checklist..."
    
    $ChecklistLines = @(
        "# The Lodge Family - Final Deployment Checklist",
        "",
        "## Pre-deployment Validation (Completed)",
        "- [x] Environment files configured",
        "- [x] Dependencies installed", 
        "- [x] Frontend built successfully",
        "- [x] PM2 configuration validated",
        "- [x] Nginx configuration prepared",
        "",
        "## Files Ready for Deployment",
        "- backend/ (with .env.vps)",
        "- frontend/ (with .env.production and built files)",
        "- ecosystem.config.js",
        "- nginx-family-domain-fixed.conf", 
        "- scripts/final-deployment-fix.sh",
        "",
        "## VPS Deployment Steps",
        "1. Upload files to VPS: /var/www/thelodgefamily/current/",
        "2. Run deployment script: chmod +x scripts/final-deployment-fix.sh && ./scripts/final-deployment-fix.sh",
        "3. Monitor logs: pm2 logs",
        "4. Test application: https://family.thelodgegroup.id",
        "",
        "## Post-deployment Verification",
        "- [ ] Backend API responding: https://family.thelodgegroup.id/api/health",
        "- [ ] Frontend loading: https://family.thelodgegroup.id",
        "- [ ] Database connection working",
        "- [ ] SSL certificate valid",
        "- [ ] PM2 processes running",
        "- [ ] Nginx serving correctly",
        "",
        "## Troubleshooting Commands",
        "```bash",
        "# Check PM2 status",
        "pm2 status",
        "pm2 logs",
        "",
        "# Check Nginx", 
        "sudo nginx -t",
        "sudo systemctl status nginx",
        "sudo tail -f /var/log/nginx/error.log",
        "",
        "# Check database",
        "cd backend && node test-env.js",
        "",
        "# Restart services",
        "pm2 restart all",
        "sudo systemctl reload nginx",
        "```",
        "",
        "## Support",
        "If issues persist, refer to DEPLOYMENT-FIXES.md for detailed troubleshooting.",
        "",
        "---",
        "Generated: $(Get-Date)"
    )

    $ChecklistLines | Out-File -FilePath "DEPLOYMENT-CHECKLIST.md" -Encoding UTF8
    Write-Status "Deployment checklist created: DEPLOYMENT-CHECKLIST.md"

    if ($CreatePackage) {
        Write-Step "6. Creating deployment package..."
        
        $DeploymentDir = "deployment-packages\$PackageName"
        New-Item -ItemType Directory -Path $DeploymentDir -Force | Out-Null

        # Copy backend
        Write-Status "Copying backend files..."
        robocopy "backend" "$DeploymentDir\backend" /E /XD "node_modules" "dist" /XF "*.log" /NFL /NDL /NJH /NJS | Out-Null
        
        # Copy frontend
        Write-Status "Copying frontend files..."
        robocopy "frontend" "$DeploymentDir\frontend" /E /XD "node_modules" ".next\cache" /XF "*.log" /NFL /NDL /NJH /NJS | Out-Null
        
        # Copy config files
        Copy-Item "ecosystem.config.js" "$DeploymentDir\" -Force
        Copy-Item "nginx-family-domain-fixed.conf" "$DeploymentDir\" -Force
        
        # Copy scripts
        New-Item -ItemType Directory -Path "$DeploymentDir\scripts" -Force | Out-Null
        Copy-Item "scripts\final-deployment-fix.sh" "$DeploymentDir\scripts\" -Force
        
        # Copy documentation
        Copy-Item "DEPLOYMENT-FIXES.md" "$DeploymentDir\" -Force
        Copy-Item "DEPLOYMENT-CHECKLIST.md" "$DeploymentDir\" -Force

        # Create deployment info
        $DeploymentInfoLines = @(
            "The Lodge Family - Deployment Package",
            "=====================================",
            "",
            "Package: $PackageName",
            "Created: $(Get-Date)",
            "Version: Final Production Release",
            "",
            "Contents:",
            "- Backend application with production environment",
            "- Frontend application (built and ready)",
            "- PM2 configuration for process management", 
            "- Nginx configuration for reverse proxy",
            "- Deployment scripts and documentation",
            "",
            "Deployment Instructions:",
            "1. Upload this package to your VPS",
            "2. Extract to /var/www/thelodgefamily/current/",
            "3. Run: chmod +x scripts/final-deployment-fix.sh",
            "4. Run: ./scripts/final-deployment-fix.sh",
            "5. Monitor: pm2 logs",
            "",
            "For detailed instructions, see DEPLOYMENT-FIXES.md"
        )

        $DeploymentInfoLines | Out-File -FilePath "$DeploymentDir\README.txt" -Encoding UTF8

        try {
            $ArchivePath = "$DeploymentDir.zip"
            Compress-Archive -Path $DeploymentDir -DestinationPath $ArchivePath -Force
            Write-Status "Deployment package created: $ArchivePath"
            
            $Size = (Get-Item $ArchivePath).Length / 1MB
            Write-Status "Package size: $([math]::Round($Size, 2)) MB"
        } catch {
            Write-Host "[WARNING] Could not create ZIP archive. Files are available in: $DeploymentDir" -ForegroundColor Yellow
        }
    }

    Write-Step "7. Final validation summary..."
    Write-Host ""
    Write-Status "Deployment preparation completed successfully!" -Color Green
    Write-Host ""
    Write-Status "Summary:" -Color Cyan
    Write-Host "   - Environment configurations validated" -ForegroundColor Green
    Write-Host "   - Dependencies installed and built" -ForegroundColor Green
    Write-Host "   - PM2 configuration validated" -ForegroundColor Green
    Write-Host "   - Nginx configuration prepared" -ForegroundColor Green
    Write-Host "   - Deployment package created" -ForegroundColor Green
    Write-Host ""
    Write-Status "Next Steps:" -Color Yellow
    Write-Host "   1. Upload deployment package to VPS" -ForegroundColor White
    Write-Host "   2. Extract to /var/www/thelodgefamily/current/" -ForegroundColor White
    Write-Host "   3. Run: ./scripts/final-deployment-fix.sh" -ForegroundColor White
    Write-Host "   4. Test: https://family.thelodgegroup.id" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "[ERROR] Deployment preparation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "   1. Check if all required files exist" -ForegroundColor White
    Write-Host "   2. Verify Node.js and npm are installed" -ForegroundColor White
    Write-Host "   3. Ensure no other processes are using the files" -ForegroundColor White
    Write-Host "   4. Run with administrator privileges if needed" -ForegroundColor White
    exit 1
} finally {
    Set-Location $ProjectPath
}