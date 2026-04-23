# ============================================
# Lotus Academy - Generate .env files (PowerShell)
# Auto-generates all keys including JWT, ANON_KEY, SERVICE_ROLE_KEY
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

Write-Host '=== Lotus Academy - Generate Env ===' -ForegroundColor Green
Write-Host ''

# ---- Utility Functions ----

function New-RandomPassword {
    param([int]$Length = 32)
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    -join (1..$Length | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

function New-RandomHex {
    param([int]$Bytes = 32)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $buf = New-Object byte[] $Bytes
    $rng.GetBytes($buf)
    [BitConverter]::ToString($buf).Replace('-', '').ToLower()
}

function ConvertTo-Base64Url {
    param([string]$Text)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $b64 = [Convert]::ToBase64String($bytes)
    $b64.Replace('+', '-').Replace('/', '_').TrimEnd('=')
}

function New-HmacSha256 {
    param([string]$Message, [string]$Secret)
    $keyBytes = [System.Text.Encoding]::UTF8.GetBytes($Secret)
    $msgBytes = [System.Text.Encoding]::UTF8.GetBytes($Message)
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $keyBytes
    $hash = $hmac.ComputeHash($msgBytes)
    $b64 = [Convert]::ToBase64String($hash)
    $b64.Replace('+', '-').Replace('/', '_').TrimEnd('=')
}

function New-SupabaseJwt {
    param([string]$Role, [string]$Secret)
    $header = '{"alg":"HS256","typ":"JWT"}'
    $iat = [int](New-TimeSpan -Start (Get-Date "1970-01-01") -End (Get-Date "2024-01-01")).TotalSeconds
    $exp = [int](New-TimeSpan -Start (Get-Date "1970-01-01") -End (Get-Date "2030-01-01")).TotalSeconds
    $payload = "{`"role`":`"$Role`",`"iss`":`"supabase`",`"iat`":$iat,`"exp`":$exp}"
    $headerB64 = ConvertTo-Base64Url -Text $header
    $payloadB64 = ConvertTo-Base64Url -Text $payload
    $signature = New-HmacSha256 -Message "$headerB64.$payloadB64" -Secret $Secret
    "$headerB64.$payloadB64.$signature"
}

# ---- Auto-generate all keys ----
$POSTGRES_PASSWORD = New-RandomPassword -Length 24
$JWT_SECRET = New-RandomPassword -Length 48
$SECRET_KEY_BASE = New-RandomHex -Bytes 48
$ANON_KEY = New-SupabaseJwt -Role "anon" -Secret $JWT_SECRET
$SERVICE_ROLE_KEY = New-SupabaseJwt -Role "service_role" -Secret $JWT_SECRET

Write-Host "  Generated PostgreSQL password" -ForegroundColor DarkGray
Write-Host "  Generated JWT secret" -ForegroundColor DarkGray
Write-Host "  Generated ANON_KEY" -ForegroundColor DarkGray
Write-Host "  Generated SERVICE_ROLE_KEY" -ForegroundColor DarkGray
Write-Host ''

# ---- Interactive input (SMTP only) ----
Write-Host 'SMTP Configuration (press Enter for defaults):' -ForegroundColor Cyan
Write-Host ''

$SMTP_HOST = Read-Host 'SMTP Host (default: smtp.163.com)'
if (-not $SMTP_HOST) { $SMTP_HOST = "smtp.163.com" }

$SMTP_PORT = Read-Host 'SMTP Port (default: 25)'
if (-not $SMTP_PORT) { $SMTP_PORT = "25" }

$SMTP_USER = Read-Host 'SMTP User (email)'
$SMTP_PASS = Read-Host 'SMTP Password'

Write-Host ''
Write-Host 'Generating...' -ForegroundColor Cyan

# ---- Generate docker/.env ----
$DOCKER_ENV = @"
# ============================================
# Lotus Academy - Production Env (auto-generated)
# Domain: $DOMAIN
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# ============================================

# Site
SITE_URL=https://$DOMAIN
API_EXTERNAL_URL=https://$DOMAIN/api
SUPABASE_PUBLIC_URL=https://$DOMAIN/api
NEXT_PUBLIC_SUPABASE_URL=https://$DOMAIN/api

# Nginx
NGINX_PORT=8080

# Studio
STUDIO_PORT=3002

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRY=3600

# Supabase API Keys (signed with JWT_SECRET)
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY

# Email
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
DISABLE_SIGNUP=false

# SMTP
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_SENDER_NAME=LotusAcademy

# Realtime
SECRET_KEY_BASE=$SECRET_KEY_BASE

# Misc
ADDITIONAL_REDIRECT_URLS=
IMGPROXY_ENABLE_WEBP_DETECTION=true
STUDIO_DEFAULT_ORGANIZATION=LotusAcademy
STUDIO_DEFAULT_PROJECT=lotus-academy
"@

# ---- Generate frontend/.env.production ----
$FRONTEND_ENV = @"
NEXT_PUBLIC_SUPABASE_URL=https://$DOMAIN/api
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
"@

# ---- Write local files ----
$PROJECT_ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$DOCKER_ENV | Out-File -FilePath "$PROJECT_ROOT/docker/.env" -Encoding utf8
Write-Host '  OK: docker/.env' -ForegroundColor Green

$FRONTEND_ENV | Out-File -FilePath "$PROJECT_ROOT/frontend/.env.production" -Encoding utf8
Write-Host '  OK: frontend/.env.production' -ForegroundColor Green

# ---- Upload to server ----
Write-Host ''
$upload = Read-Host 'Upload .env to server? (y/N)'
if ($upload -eq "y" -or $upload -eq "Y") {
    Write-Host 'Uploading...' -ForegroundColor Cyan
    Invoke-Expression "$SSH_CMD 'mkdir -p $REMOTE_DIR/docker'"
    scp -P $SSH_PORT "$PROJECT_ROOT/docker/.env" "${SSH_HOST}:${REMOTE_DIR}/docker/.env"
    Write-Host '  OK: uploaded to server' -ForegroundColor Green
}

Write-Host ''
Write-Host '=== Keys Summary (save these!) ===' -ForegroundColor Yellow
Write-Host "  POSTGRES_PASSWORD: $POSTGRES_PASSWORD"
Write-Host "  JWT_SECRET:        $JWT_SECRET"
Write-Host "  ANON_KEY:          $ANON_KEY"
Write-Host "  SERVICE_ROLE_KEY:  $SERVICE_ROLE_KEY"
Write-Host '===================================' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Files:' -ForegroundColor Cyan
Write-Host '  docker/.env              - Docker Compose'
Write-Host '  frontend/.env.production - Frontend build'
Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Cyan
Write-Host '  1. .\script\nginx_deploy.ps1   - Deploy Nginx'
Write-Host '  2. .\script\backend_online.ps1 - Deploy backend'
Write-Host '  3. .\script\frontend_online.ps1 - Deploy frontend'
Write-Host '  4. .\script\ssl_deploy.ps1     - Setup HTTPS'
