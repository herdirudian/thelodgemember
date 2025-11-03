<#
  Fix login error (500) on VPS for Lodge Family backend
  - Prepares a remote bash script with Prisma + PM2 steps
  - Uploads and executes the script over SSH (requires your VPS credentials)

  Usage examples:
  - Run locally and follow on-screen instructions:
    pwsh ./Fix-VPS-Login.ps1 -VPSHost "family.thelodgegroup.id" -VPSUser "ubuntu"

  Notes:
  - This script does NOT store credentials. It will prompt for SSH auth if needed.
  - It aligns with PM2 app name: "thelodge-backend" and current path.
#>

param(
  [Parameter(Mandatory = $true)] [string] $VPSHost,
  [Parameter(Mandatory = $true)] [string] $VPSUser
)

$RemoteScriptPath = "/tmp/vps-login-fix.sh"
$AppRoot = "/var/www/thelodgefamily/current"
$BackendPath = "$AppRoot/backend"
$DbPath = "$BackendPath/prisma/dev.db"

$bash = @"
#!/usr/bin/env bash
set -euo pipefail

echo "[1/7] Navigating to backend directory..."
cd "$BackendPath"

echo "[2/7] Ensuring directories exist..."
mkdir -p "$BackendPath/prisma" "$AppRoot/files/cards" "$AppRoot/files/uploads"

echo "[3/7] Setting .env at app root (override PM2 env via dotenv)..."
cat > "$AppRoot/.env" << 'EOF'
DATABASE_URL="file:$DbPath"
APP_URL="https://family.thelodgegroup.id"
FRONTEND_URL="https://family.thelodgegroup.id"
JWT_SECRET="change_me_please"
QR_HMAC_SECRET="qr_secret_default"
EOF

# Also place a copy inside backend folder for safety
cp "$AppRoot/.env" "$BackendPath/.env" || true

echo "[4/7] Installing production dependencies..."
if [ -f package-lock.json ]; then
  npm ci --only=production || npm ci || npm install --production
else
  npm install --production || npm install
fi

echo "[5/7] Generating Prisma client and pushing schema..."
npx prisma generate
npx prisma db push

echo "[6/7] Seeding admin if missing..."
if [ -f create-admin-user.js ]; then
  node create-admin-user.js || true
fi

echo "[7/7] Restarting PM2 backend..."
pm2 restart thelodge-backend || pm2 reload ecosystem.config.js --env production || true

sleep 3
echo "Checking /api/health ..."
curl -s -w "\nStatus: %{http_code}\n" https://family.thelodgegroup.id/api/health || true

echo "Testing login with admin@thelodgegroup.id ..."
curl -s -X POST https://family.thelodgegroup.id/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@thelodgegroup.id","password":"admin123"}' \
  -w "\nStatus: %{http_code}\n" || true

echo "Done. If login still fails, check logs: pm2 logs thelodge-backend --lines 200"
"@

Write-Host "💡 Preparing remote fix script at $RemoteScriptPath" -ForegroundColor Cyan
Set-Content -Path "vps-login-fix.sh" -Value $bash -Encoding UTF8

$destInfo = "${VPSUser}@${VPSHost}:$RemoteScriptPath"
Write-Host ("Uploading script to VPS (" + $destInfo + ")") -ForegroundColor Green
$remoteLogin = "${VPSUser}@${VPSHost}"
$ecosTarget = "$AppRoot/ecosystem.config.js"
try {
  # Upload script
  $scpCmd1 = "scp `"vps-login-fix.sh`" ${remoteLogin}:$RemoteScriptPath"
  Invoke-Expression $scpCmd1

  # Upload updated PM2 ecosystem config to ensure correct DATABASE_URL
  Write-Host "Uploading ecosystem.config.js to $AppRoot" -ForegroundColor Green
  $scpCmd2 = "scp `"ecosystem.config.js`" ${remoteLogin}:$ecosTarget"
  Invoke-Expression $scpCmd2
} catch {
  Write-Host "Upload failed. You can manually copy the files via your SSH client." -ForegroundColor Yellow
}

Write-Host "Executing remote fix script..." -ForegroundColor Green
try {
  $sshCmd = "ssh ${remoteLogin} 'bash $RemoteScriptPath'"
  Invoke-Expression $sshCmd
} catch {
  Write-Host "Remote execution failed. Please SSH and run: bash $RemoteScriptPath" -ForegroundColor Yellow
}
Write-Host "Script completed. Verify above curl status codes (expect 200 for health, 200/401 for login)." -ForegroundColor Green
