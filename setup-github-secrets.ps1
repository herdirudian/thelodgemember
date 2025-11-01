# GitHub Secrets Setup Script for Lodge Family
# This script helps you configure GitHub repository secrets for automated deployment

Write-Host "GITHUB SECRETS SETUP - LODGE FAMILY" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Known VPS information
$VPS_HOST = "31.97.51.129"
$VPS_USER = "root"
$DOMAIN = "family.thelodgegroup.id"

Write-Host "STEP 1: VPS Connection Secrets" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need to add these secrets to your GitHub repository:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Secret Name: VPS_HOST" -ForegroundColor White
Write-Host "Secret Value: $VPS_HOST" -ForegroundColor Gray
Write-Host ""
Write-Host "Secret Name: VPS_USER" -ForegroundColor White  
Write-Host "Secret Value: $VPS_USER" -ForegroundColor Gray
Write-Host ""

Write-Host "STEP 2: SSH Key Generation" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "We need to generate SSH keys for secure deployment." -ForegroundColor Yellow
Write-Host "Choose an option:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Generate new SSH key pair (Recommended)" -ForegroundColor White
Write-Host "2. Use existing SSH key" -ForegroundColor White
Write-Host "3. Skip SSH setup (manual setup later)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Generating new SSH key pair..." -ForegroundColor Yellow
        
        # Generate SSH key
        $keyPath = "$env:USERPROFILE\.ssh\lodge_family_deploy"
        
        if (Test-Path "$keyPath") {
            Write-Host "SSH key already exists at $keyPath" -ForegroundColor Yellow
            $overwrite = Read-Host "Overwrite existing key? (y/n)"
            if ($overwrite -ne "y") {
                Write-Host "Using existing key..." -ForegroundColor Green
            } else {
                ssh-keygen -t rsa -b 4096 -f $keyPath -N '""' -C "github-actions-lodge-family"
            }
        } else {
            # Ensure .ssh directory exists
            if (!(Test-Path "$env:USERPROFILE\.ssh")) {
                New-Item -ItemType Directory -Path "$env:USERPROFILE\.ssh" -Force
            }
            ssh-keygen -t rsa -b 4096 -f $keyPath -N '""' -C "github-actions-lodge-family"
        }
        
        if (Test-Path "$keyPath") {
            Write-Host ""
            Write-Host "SUCCESS: SSH key generated!" -ForegroundColor Green
            Write-Host ""
            Write-Host "PRIVATE KEY (for GitHub Secret VPS_SSH_KEY):" -ForegroundColor Yellow
            Write-Host "=============================================" -ForegroundColor Yellow
            Get-Content "$keyPath" | Write-Host -ForegroundColor Gray
            Write-Host ""
            Write-Host "PUBLIC KEY (to add to VPS):" -ForegroundColor Yellow
            Write-Host "============================" -ForegroundColor Yellow
            Get-Content "$keyPath.pub" | Write-Host -ForegroundColor Gray
            Write-Host ""
            
            # Save keys to files for easy access
            Copy-Item "$keyPath" ".\github-actions-private-key.txt"
            Copy-Item "$keyPath.pub" ".\github-actions-public-key.txt"
            
            Write-Host "Keys saved to:" -ForegroundColor Green
            Write-Host "- github-actions-private-key.txt (for GitHub)" -ForegroundColor Gray
            Write-Host "- github-actions-public-key.txt (for VPS)" -ForegroundColor Gray
        }
    }
    "2" {
        Write-Host ""
        Write-Host "Using existing SSH key..." -ForegroundColor Yellow
        $existingKey = Read-Host "Enter path to your private key file"
        
        if (Test-Path $existingKey) {
            Write-Host ""
            Write-Host "PRIVATE KEY CONTENT:" -ForegroundColor Yellow
            Get-Content $existingKey | Write-Host -ForegroundColor Gray
        } else {
            Write-Host "ERROR: Key file not found at $existingKey" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host ""
        Write-Host "SSH setup skipped. You can generate keys manually later." -ForegroundColor Yellow
    }
    default {
        Write-Host "Invalid choice. Skipping SSH setup." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "STEP 3: Application Environment Variables" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need to add these application secrets to GitHub:" -ForegroundColor Yellow
Write-Host ""

# Generate JWT secret if not provided
$jwtSecret = -join ((1..64) | ForEach {[char]((65..90) + (97..122) + (48..57) | Get-Random)})

Write-Host "Secret Name: JWT_SECRET" -ForegroundColor White
Write-Host "Secret Value: $jwtSecret" -ForegroundColor Gray
Write-Host "(Generated random JWT secret - you can use this or provide your own)" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Secret Name: XENDIT_SECRET_KEY" -ForegroundColor White
Write-Host "Secret Value: [Your Xendit Production Secret Key]" -ForegroundColor Gray
Write-Host ""

Write-Host "Secret Name: WHATSAPP_API_KEY" -ForegroundColor White
Write-Host "Secret Value: [Your WhatsApp API Key]" -ForegroundColor Gray
Write-Host ""

Write-Host "Secret Name: WHATSAPP_PHONE_NUMBER_ID" -ForegroundColor White
Write-Host "Secret Value: [Your WhatsApp Phone Number ID]" -ForegroundColor Gray
Write-Host ""

Write-Host "Secret Name: DATABASE_URL" -ForegroundColor White
Write-Host "Secret Value: file:./prisma/dev.db" -ForegroundColor Gray
Write-Host "(Using SQLite for production - you can change to PostgreSQL if needed)" -ForegroundColor DarkGray
Write-Host ""

Write-Host "STEP 4: How to Add Secrets to GitHub" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to your GitHub repository" -ForegroundColor White
Write-Host "2. Click on 'Settings' tab" -ForegroundColor White
Write-Host "3. In the left sidebar, click 'Secrets and variables' > 'Actions'" -ForegroundColor White
Write-Host "4. Click 'New repository secret'" -ForegroundColor White
Write-Host "5. Add each secret name and value from above" -ForegroundColor White
Write-Host ""

Write-Host "STEP 5: VPS SSH Key Setup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After adding secrets to GitHub, you need to add the public key to your VPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run this command on your VPS:" -ForegroundColor White
Write-Host "ssh root@$VPS_HOST" -ForegroundColor Gray
Write-Host ""
Write-Host "Then run these commands on the VPS:" -ForegroundColor White
Write-Host "mkdir -p ~/.ssh" -ForegroundColor Gray
Write-Host "chmod 700 ~/.ssh" -ForegroundColor Gray
Write-Host "echo 'YOUR_PUBLIC_KEY_CONTENT' >> ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host "chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host ""

Write-Host "STEP 6: Test Deployment" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After setting up all secrets:" -ForegroundColor Yellow
Write-Host "1. Push code to main branch" -ForegroundColor White
Write-Host "2. Check GitHub Actions tab for deployment progress" -ForegroundColor White
Write-Host "3. Monitor deployment logs" -ForegroundColor White
Write-Host "4. Verify website is updated" -ForegroundColor White
Write-Host ""

Write-Host "SUMMARY OF REQUIRED GITHUB SECRETS:" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "VPS_HOST: $VPS_HOST" -ForegroundColor Gray
Write-Host "VPS_USER: $VPS_USER" -ForegroundColor Gray
Write-Host "VPS_SSH_KEY: [Private SSH Key Content]" -ForegroundColor Gray
Write-Host "JWT_SECRET: [Generated or Custom JWT Secret]" -ForegroundColor Gray
Write-Host "XENDIT_SECRET_KEY: [Your Xendit Key]" -ForegroundColor Gray
Write-Host "WHATSAPP_API_KEY: [Your WhatsApp Key]" -ForegroundColor Gray
Write-Host "WHATSAPP_PHONE_NUMBER_ID: [Your WhatsApp Phone ID]" -ForegroundColor Gray
Write-Host "DATABASE_URL: file:./prisma/dev.db" -ForegroundColor Gray
Write-Host ""

Write-Host "Setup complete! Check the generated key files and follow the steps above." -ForegroundColor Green