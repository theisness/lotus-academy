# ============================================
# Lotus Academy - Nginx Deploy (PowerShell)
# Install and configure Nginx reverse proxy (HTTP only)
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

Write-Host '=== Lotus Academy - Nginx Deploy ===' -ForegroundColor Green
Write-Host "  Domain: $DOMAIN" -ForegroundColor Yellow
Write-Host ''

# Nginx config (HTTP only, ready for certbot)
$NGINX_CONF = @"
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 50m;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 86400s;
    }

    location /health {
        access_log off;
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
"@

$TEMP_CONF = "$env:TEMP\lotus-nginx.conf"
$NGINX_CONF | Out-File -FilePath $TEMP_CONF -Encoding utf8

Write-Host '1/3 Installing Nginx...' -ForegroundColor Cyan
Invoke-Expression "$SSH_CMD 'apt-get update -qq && apt-get install -y -qq nginx > /dev/null && echo done'"

Write-Host '2/3 Uploading site config...' -ForegroundColor Cyan
scp -P $SSH_PORT $TEMP_CONF "${SSH_HOST}:/etc/nginx/conf.d/$DOMAIN.conf"

$ENABLE_SCRIPT = @"
set -e
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/$DOMAIN 2>/dev/null || true
rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
mkdir -p /var/www/certbot
nginx -t && systemctl reload nginx
echo 'Nginx enabled'
"@
Invoke-Expression "$SSH_CMD '$ENABLE_SCRIPT'"

Write-Host '3/3 Verifying...' -ForegroundColor Cyan
Invoke-Expression "$SSH_CMD 'systemctl status nginx --no-pager -l | head -5'"

Remove-Item $TEMP_CONF -ErrorAction SilentlyContinue

Write-Host ''
Write-Host '=== Nginx deployed (HTTP) ===' -ForegroundColor Green
Write-Host "  Test: http://$DOMAIN/health" -ForegroundColor Yellow
Write-Host '  Next: run ssl_deploy.ps1 after confirming HTTP works' -ForegroundColor Gray
