# Complete Ticket Creation Test on VPS
param(
    [string]$VPSHost = "family.thelodgegroup.id",
    [string]$VPSUser = "root"
)

Write-Host "=== COMPLETE TICKET CREATION TEST ON VPS ===" -ForegroundColor Magenta
Write-Host ""

$sshTarget = "${VPSUser}@${VPSHost}"

# Step 1: Generate admin token on VPS
Write-Host "Step 1: Generating admin token on VPS..." -ForegroundColor Cyan
try {
    Write-Host "Creating admin token generation script..." -ForegroundColor Yellow
    
    $tokenScript = @"
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function generateAdminToken() {
  try {
    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!adminUser) {
      console.log('No admin user found');
      return;
    }
    
    console.log('Admin user found:', adminUser.email);
    
    // Generate token
    const token = jwt.sign(
      { 
        userId: adminUser.id, 
        email: adminUser.email, 
        role: adminUser.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    console.log('Generated token:', token);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.\$disconnect();
  }
}

generateAdminToken();
"@

    # Upload and run token generation script
    $tokenScript | ssh $sshTarget "cat > /var/www/thelodgefamily/generate-token.js"
    $tokenResult = ssh $sshTarget "cd /var/www/thelodgefamily && node generate-token.js"
    
    Write-Host "Token generation result:" -ForegroundColor Green
    Write-Host $tokenResult -ForegroundColor White
    
    # Extract token from result
    $token = ($tokenResult | Select-String "Generated token: (.+)").Matches[0].Groups[1].Value
    
    if ($token) {
        Write-Host "✅ Admin token generated successfully!" -ForegroundColor Green
        Write-Host ""
        
        # Step 2: Test ticket creation
        Write-Host "Step 2: Testing ticket creation with admin token..." -ForegroundColor Cyan
        
        $testData = @{
            memberEmail = "test@example.com"
            ticketName = "Test Tiket Masuk The Lodge Matibaya Member Baru"
            ticketDescription = "Ayo bergabung masuk member dan nikmati keistimewaan alam dengan pengalaman yang lebih spesial di The Lodge Matibaya!"
            validDate = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        } | ConvertTo-Json
        
        Write-Host "Test data:" -ForegroundColor Yellow
        Write-Host $testData -ForegroundColor White
        Write-Host ""
        
        # Create curl test script
        $curlScript = @"
curl -X POST https://family.thelodgegroup.id/api/admin/create-ticket-for-member \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $token" \
  -d '$testData' \
  -v
"@
        
        Write-Host "Running ticket creation test..." -ForegroundColor Yellow
        $curlResult = $curlScript | ssh $sshTarget "bash"
        
        Write-Host "Ticket creation result:" -ForegroundColor Green
        Write-Host $curlResult -ForegroundColor White
        
        # Step 3: Check logs
        Write-Host ""
        Write-Host "Step 3: Checking application logs..." -ForegroundColor Cyan
        ssh $sshTarget "pm2 logs --lines 5"
        
    } else {
        Write-Host "❌ Failed to extract admin token" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error during testing: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TEST COMPLETED ===" -ForegroundColor Green
Write-Host ""
Write-Host "If ticket creation was successful, check:" -ForegroundColor Cyan
Write-Host "1. Database for new ticket entry" -ForegroundColor White
Write-Host "2. Notification service logs" -ForegroundColor White
Write-Host "3. Member tickets endpoint: GET /api/admin/member-tickets" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")