# ============================================
# Lotus Academy - Backend Deploy (PowerShell)
# Upload backend + docker files and start services
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

$SSH_CMD = "ssh -p $SSH_PORT $SSH_HOST"

Write-Host '=== Lotus Academy - Backend Deploy ===' -ForegroundColor Green
Write-Host ''

$PROJECT_ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# 1. Create remote dirs
Write-Host '1/5 Creating remote directories...' -ForegroundColor Cyan
Invoke-Expression "$SSH_CMD 'mkdir -p $REMOTE_DIR/backend/supabase/migrations $REMOTE_DIR/docker $REMOTE_DIR/script'"

# 2. Upload backend files
Write-Host '2/5 Uploading backend files...' -ForegroundColor Cyan
scp -P $SSH_PORT "$PROJECT_ROOT/backend/kong.yml" "${SSH_HOST}:${REMOTE_DIR}/backend/"
scp -P $SSH_PORT "$PROJECT_ROOT/backend/docker-compose.yml" "${SSH_HOST}:${REMOTE_DIR}/backend/"

# Upload migrations
$migrations = Get-ChildItem "$PROJECT_ROOT/backend/supabase/migrations/*.sql"
foreach ($f in $migrations) {
    scp -P $SSH_PORT $f.FullName "${SSH_HOST}:${REMOTE_DIR}/backend/supabase/migrations/"
}

# Upload SQL fix scripts
$sqlFixes = Get-ChildItem "$PROJECT_ROOT/backend/fix_*.sql" -ErrorAction SilentlyContinue
foreach ($f in $sqlFixes) {
    scp -P $SSH_PORT $f.FullName "${SSH_HOST}:${REMOTE_DIR}/backend/"
}

# 3. Upload docker compose
Write-Host '3/5 Uploading Docker files...' -ForegroundColor Cyan
scp -P $SSH_PORT "$PROJECT_ROOT/docker/docker-compose.yml" "${SSH_HOST}:${REMOTE_DIR}/docker/"
scp -P $SSH_PORT "$PROJECT_ROOT/docker/Dockerfile.frontend" "${SSH_HOST}:${REMOTE_DIR}/docker/"

# 4. Upload scripts
Write-Host '4/5 Uploading scripts...' -ForegroundColor Cyan
scp -P $SSH_PORT "$PROJECT_ROOT/script/deploy.sh" "${SSH_HOST}:${REMOTE_DIR}/script/"
scp -P $SSH_PORT "$PROJECT_ROOT/script/nginx.conf" "${SSH_HOST}:${REMOTE_DIR}/script/"

# 5. Start backend services (no frontend - it runs via systemd)
Write-Host '5/5 Starting backend services...' -ForegroundColor Cyan
$START_CMD = "cd $REMOTE_DIR && docker compose -f docker/docker-compose.yml --env-file docker/.env up -d db auth rest realtime storage imgproxy kong meta studio"
Invoke-Expression "$SSH_CMD '$START_CMD'"

Write-Host ''
Write-Host '=== Backend deployed ===' -ForegroundColor Green
Write-Host '  Note: run generate_env.ps1 first if .env is missing on server' -ForegroundColor Yellow
