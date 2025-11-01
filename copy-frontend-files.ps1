# Copy Frontend Files to Deployment Package
$SOURCE = "C:\xampp\htdocs\newthelodgefamily\frontend\src\app"
$DEST = "C:\xampp\htdocs\newthelodgefamily\deployment-package\frontend\src\app"

Write-Host "Copying frontend directories..." -ForegroundColor Yellow

# Create base directories
New-Item -ItemType Directory -Path "$DEST\(dashboard)" -Force | Out-Null
New-Item -ItemType Directory -Path "$DEST\admin" -Force | Out-Null

# Copy new dashboard pages
$dashboardPages = @(
    "accommodation",
    "tourism-tickets", 
    "booking",
    "settings",
    "rewards",
    "my-activities"
)

foreach ($page in $dashboardPages) {
    if (Test-Path "$SOURCE\(dashboard)\$page") {
        Write-Host "  Copying (dashboard)\$page..." -ForegroundColor Cyan
        Copy-Item -Path "$SOURCE\(dashboard)\$page" -Destination "$DEST\(dashboard)\" -Recurse -Force
    }
}

# Copy profile edit page
if (Test-Path "$SOURCE\(dashboard)\profile\edit") {
    Write-Host "  Copying (dashboard)\profile\edit..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path "$DEST\(dashboard)\profile" -Force | Out-Null
    Copy-Item -Path "$SOURCE\(dashboard)\profile\edit" -Destination "$DEST\(dashboard)\profile\" -Recurse -Force
}

# Copy top-level pages
$topPages = @(
    "notifications",
    "payment"
)

foreach ($page in $topPages) {
    if (Test-Path "$SOURCE\$page") {
        Write-Host "  Copying $page..." -ForegroundColor Cyan
        Copy-Item -Path "$SOURCE\$page" -Destination "$DEST\" -Recurse -Force
    }
}

# Copy admin pages
if (Test-Path "$SOURCE\admin\notifications") {
    Write-Host "  Copying admin\notifications..." -ForegroundColor Cyan
    Copy-Item -Path "$SOURCE\admin\notifications" -Destination "$DEST\admin\" -Recurse -Force
}

Write-Host "Frontend files copied successfully!" -ForegroundColor Green