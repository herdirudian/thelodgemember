# Fix Notification Issue on VPS - Deploy Script
param(
    [string]$VPSHost = "family.thelodgegroup.id",
    [string]$VPSUser = "root"
)

Write-Host "=== FIXING NOTIFICATION ISSUE ON VPS ===" -ForegroundColor Magenta
Write-Host ""

# Test SSH connection
Write-Host "Testing SSH connection to $VPSUser@$VPSHost..." -ForegroundColor Cyan

try {
    $sshTarget = "${VPSUser}@${VPSHost}"
    $sshTest = ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $sshTarget "echo 'SSH OK'" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SSH connection successful!" -ForegroundColor Green
        Write-Host "Starting notification fix deployment..." -ForegroundColor Yellow
        
        # Step 0: Create necessary directories
        Write-Host ""
        Write-Host "Step 0: Creating necessary directories..." -ForegroundColor Cyan
        ssh $sshTarget "mkdir -p /var/www/thelodgefamily/src/utils"
        ssh $sshTarget "mkdir -p /var/www/thelodgefamily/src/routes"
        
        # Step 1: Upload NotificationService file
        Write-Host ""
        Write-Host "Step 1: Uploading NotificationService.ts..." -ForegroundColor Cyan
        $targetNotification = "${VPSUser}@${VPSHost}:/var/www/thelodgefamily/src/utils/"
        scp "deployment-optimized\src\utils\notificationService.ts" $targetNotification
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "NotificationService.ts uploaded successfully!" -ForegroundColor Green
        } else {
            Write-Host "Failed to upload NotificationService.ts!" -ForegroundColor Red
            exit 1
        }
        
        # Step 2: Upload updated admin.ts file
        Write-Host ""
        Write-Host "Step 2: Uploading updated admin.ts..." -ForegroundColor Cyan
        $targetAdmin = "${VPSUser}@${VPSHost}:/var/www/thelodgefamily/src/routes/"
        scp "deployment-optimized\src\routes\admin.ts" $targetAdmin
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "admin.ts uploaded successfully!" -ForegroundColor Green
        } else {
            Write-Host "Failed to upload admin.ts!" -ForegroundColor Red
            exit 1
        }
        
        # Step 3: Restart the application
        Write-Host ""
        Write-Host "Step 3: Restarting application..." -ForegroundColor Cyan
        $sshTarget = "${VPSUser}@${VPSHost}"
        ssh $sshTarget "cd /var/www/thelodgefamily && pm2 restart all"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Application restarted successfully!" -ForegroundColor Green
        } else {
            Write-Host "Failed to restart application!" -ForegroundColor Red
            Write-Host "Trying alternative restart method..." -ForegroundColor Yellow
            ssh $sshTarget "cd /var/www/thelodgefamily && npm run build && pm2 restart ecosystem.config.js"
        }
        
        # Step 4: Check application status
        Write-Host ""
        Write-Host "Step 4: Checking application status..." -ForegroundColor Cyan
        ssh $sshTarget "pm2 status"
        
        Write-Host ""
        Write-Host "=== NOTIFICATION FIX DEPLOYMENT COMPLETED ===" -ForegroundColor Green
        Write-Host ""
        Write-Host "Changes deployed:" -ForegroundColor Cyan
        Write-Host "✅ Added NotificationService.ts" -ForegroundColor Green
        Write-Host "✅ Updated admin.ts with NotificationService import" -ForegroundColor Green
        Write-Host "✅ Added create-ticket-for-member endpoint" -ForegroundColor Green
        Write-Host "✅ Added member-tickets endpoint" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please test the ticket creation functionality now!" -ForegroundColor Yellow
        
    } else {
        Write-Host "SSH connection failed!" -ForegroundColor Red
        Write-Host "Error: $sshTest" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please check:" -ForegroundColor Yellow
        Write-Host "1. VPS is running and accessible" -ForegroundColor White
        Write-Host "2. SSH key is properly configured" -ForegroundColor White
        Write-Host "3. Network connection is stable" -ForegroundColor White
    }
} catch {
    Write-Host "Error during deployment: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")