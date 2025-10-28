# Script to fix API URL patterns in frontend
$frontendPath = "C:\xampp\htdocs\newthelodgefamily\frontend\src"

# Get all TypeScript and JavaScript files
$files = Get-ChildItem -Path $frontendPath -Recurse -Include "*.tsx", "*.ts", "*.js", "*.jsx"

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Replace ${API}/api/ with /api/
    $content = $content -replace '\$\{API\}/api/', '/api/'
    
    # Remove API variable declarations (various patterns)
    $content = $content -replace 'const API = process\.env\.NEXT_PUBLIC_API_URL \|\| [^;]+;[\r\n]*', ''
    $content = $content -replace 'const API = process\.env\.NEXT_PUBLIC_API_URL \|\| [^;]+;', ''
    
    # Only write if content changed
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Fixed: $($file.FullName)"
    }
}

Write-Host "API URL fix completed!"