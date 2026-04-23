# ============================================
# Lotus Academy - Frontend Deploy (PowerShell)
# Local build + upload standalone output to server
# ============================================

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Load deployment configuration
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$ENV_FILE = Join-Path $SCRIPT_DIR "deploy.env"

if (-not (Test-Path $ENV_FILE)) {
    Write-Host "ERROR: deploy.env not found!" -ForegroundColor Red
    Write-Host "Copy deploy.env.example to deploy.env and configure it" -ForegroundColor Yellow
    exit 1
}

# Parse deploy.env
Get-Content $ENV_FILE | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Variable -Name $key -Value $value -Scope Script
    }
}

$REMOTE_APP = $REMOTE_APP_DIR

Write-Host '=== Lotus Academy - Frontend Deploy ===' -ForegroundColor Green
Write-Host ''

$PROJECT_ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$FRONTEND_DIR = Join-Path $PROJECT_ROOT "frontend"
$TEMP_TAR = Join-Path $env:TEMP "lotus-frontend-build.zip"

# 1. Local build with production env
Write-Host '1/5 Building locally (npm run build)...' -ForegroundColor Cyan
$envProdFile = Join-Path $FRONTEND_DIR ".env.production"
if (Test-Path $envProdFile) {
    # Load .env.production variables for build
    Get-Content $envProdFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
        }
    }
    Write-Host '  Using .env.production' -ForegroundColor DarkGray
} else {
    Write-Host '  WARNING: frontend/.env.production not found!' -ForegroundColor Red
    Write-Host '  Run generate_env.ps1 first' -ForegroundColor Red
    exit 1
}
Push-Location $FRONTEND_DIR
npm run build
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Host 'BUILD FAILED' -ForegroundColor Red
    exit 1
}
Pop-Location
Write-Host '  Build successful' -ForegroundColor Green

# 2. Pack standalone output
Write-Host '2/5 Packing build output...' -ForegroundColor Cyan
$STANDALONE_DIR = Join-Path (Join-Path $FRONTEND_DIR ".next") "standalone"
$STATIC_DIR = Join-Path (Join-Path $FRONTEND_DIR ".next") "static"
$PUBLIC_DIR = Join-Path $FRONTEND_DIR "public"

# Create temp staging directory
$STAGE_DIR = Join-Path $env:TEMP "lotus-frontend-stage"
if (Test-Path $STAGE_DIR) { Remove-Item $STAGE_DIR -Recurse -Force }
New-Item -ItemType Directory -Path $STAGE_DIR -Force | Out-Null

# Copy standalone (contains server.js + node_modules subset)
Copy-Item -Path $STANDALONE_DIR -Destination (Join-Path $STAGE_DIR "app") -Recurse -Force


# Remove unnecessary files from standalone to reduce archive size (~30MB savings)
$nmDir = Join-Path $STAGE_DIR "app\node_modules"
foreach ($dir in @('typescript', '@img', 'sharp', 'caniuse-lite')) {
    $p = Join-Path $nmDir $dir
    if (Test-Path $p) { Remove-Item $p -Recurse -Force; Write-Host "  Removed node_modules/$dir" -ForegroundColor DarkGray }
}

# Copy static assets into .next/static
$staticDest = "$STAGE_DIR\app\.next\static"
New-Item -ItemType Directory -Path $staticDest -Force | Out-Null
Copy-Item -Path (Join-Path $STATIC_DIR "*") -Destination $staticDest -Recurse -Force

# Copy public folder
if (Test-Path $PUBLIC_DIR) {
    Copy-Item -Path $PUBLIC_DIR -Destination (Join-Path (Join-Path $STAGE_DIR "app") "public") -Recurse -Force
}

# Zip via WSL (much faster than PowerShell Compress-Archive)
$wslStage = wsl wslpath -u ($STAGE_DIR -replace "\\","/")
$wslTar = wsl wslpath -u ($TEMP_TAR -replace "\\","/")
wsl bash -c "cd '$wslStage' && zip -qr '$wslTar' app"

$tarSize = (Get-Item $TEMP_TAR).Length
Write-Host "  Archive size: $([math]::Round($tarSize / 1MB, 2)) MB" -ForegroundColor DarkGray

# 3. Upload and extract
Write-Host '3/5 Uploading to server...' -ForegroundColor Cyan
scp -P $SSH_PORT $TEMP_TAR "${SSH_HOST}:${REMOTE_DIR}/frontend-build.zip"

Write-Host '4/5 Deploying on server...' -ForegroundColor Cyan
ssh -p $SSH_PORT $SSH_HOST "cd $REMOTE_DIR && rm -rf frontend-app && unzip -qo frontend-build.zip -d . && mv app frontend-app && rm frontend-build.zip && echo 'Extracted OK'"

# Start/restart with a simple node process (using systemd or docker)
# Here we use a systemd service approach for simplicity
$SERVICE_SCRIPT = @'
cat > /etc/systemd/system/lotus-frontend.service << 'EOF'
[Unit]
Description=Lotus Academy Frontend (Next.js)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/lotus-academy/frontend-app
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${FRONTEND_PORT}
Environment=HOSTNAME=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable lotus-frontend
systemctl restart lotus-frontend
echo 'Service restarted'
'@

$SERVICE_SCRIPT_RESTART = @'
systemctl restart lotus-frontend
echo 'Service restarted'
'@
# ssh -p $SSH_PORT $SSH_HOST $SERVICE_SCRIPT
ssh -p $SSH_PORT $SSH_HOST $SERVICE_SCRIPT_RESTART

# Cleanup
Remove-Item $TEMP_TAR -ErrorAction SilentlyContinue
Remove-Item $STAGE_DIR -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host '=== Frontend deployed ===' -ForegroundColor Green
Write-Host "  URL: https://$DOMAIN" -ForegroundColor Yellow
Write-Host '  Service: systemctl status lotus-frontend' -ForegroundColor Gray
