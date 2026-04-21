# ============================================
# Lotus Academy - SSL Deploy (PowerShell)
# Certbot + Let's Encrypt HTTPS setup
# Prerequisite: nginx_deploy.ps1 completed and HTTP works
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

Write-Host '=== Lotus Academy - SSL Deploy ===' -ForegroundColor Green
Write-Host "  Domain: $DOMAIN" -ForegroundColor Yellow
Write-Host ''

$EMAIL = Read-Host "Email for cert expiry notices (default: $SSL_EMAIL)"
if (-not $EMAIL) { $EMAIL = $SSL_EMAIL }

Write-Host ''
Write-Host '1/3 Installing Certbot...' -ForegroundColor Cyan
Invoke-Expression "$SSH_CMD 'apt-get install -y -qq certbot python3-certbot-nginx > /dev/null && echo done'"

Write-Host '2/3 Requesting SSL certificate...' -ForegroundColor Cyan
$CERT_CMD = "certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL"
Invoke-Expression "$SSH_CMD '$CERT_CMD'"

Write-Host '3/3 Verifying certificate...' -ForegroundColor Cyan
Invoke-Expression "$SSH_CMD 'certbot certificates 2>/dev/null | grep -A3 $DOMAIN'"

Write-Host ''
Write-Host '=== SSL deployed ===' -ForegroundColor Green
Write-Host "  HTTPS: https://$DOMAIN" -ForegroundColor Yellow
Write-Host '  Auto-renewal: enabled (certbot systemd timer)' -ForegroundColor Gray
